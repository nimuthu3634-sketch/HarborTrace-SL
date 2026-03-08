import { FieldValue, getFirestore, Timestamp } from 'firebase-admin/firestore';
import { HttpsError, onCall, type CallableRequest } from 'firebase-functions/v2/https';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { AUDIT_ACTIONS, writeAuditLog } from '../../shared/utils/audit';
import { requireCaller } from '../../shared/utils/caller';
import { resolveTripStatus } from '../../shared/utils/tripStatus';

const ALLOWED_STATUSES = new Set(['planned', 'active', 'completed', 'overdue', 'emergency']);

function asString(value: unknown, fieldName: string, max = 200) {
  const parsed = String(value ?? '').trim();
  if (!parsed) {
    throw new HttpsError('invalid-argument', `${fieldName} is required.`);
  }

  if (parsed.length > max) {
    throw new HttpsError('invalid-argument', `${fieldName} exceeds allowed length.`);
  }

  return parsed;
}

function asPositiveInt(value: unknown, fieldName: string) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new HttpsError('invalid-argument', `${fieldName} must be a positive whole number.`);
  }
  return parsed;
}

function asDate(value: unknown, fieldName: string) {
  const parsed = new Date(String(value ?? ''));
  if (Number.isNaN(parsed.getTime())) {
    throw new HttpsError('invalid-argument', `${fieldName} must be a valid date.`);
  }
  return parsed;
}

export const createTrip = onCall(async (request: CallableRequest) => {
  const caller = await requireCaller(request, { allowedRoles: ['fisherman'] });

  const fishermanUid = asString(request.data?.fishermanUid, 'fishermanUid', 128);
  if (fishermanUid !== caller.uid) {
    throw new HttpsError('permission-denied', 'Fishermen can only create trips for themselves.');
  }

  const departureTime = asDate(request.data?.departureTime, 'departureTime');
  const expectedReturnTime = asDate(request.data?.expectedReturnTime, 'expectedReturnTime');
  if (expectedReturnTime.getTime() <= departureTime.getTime()) {
    throw new HttpsError('invalid-argument', 'expectedReturnTime must be after departureTime.');
  }

  const vesselId = asString(request.data?.vesselId, 'vesselId', 128);
  const departureHarborId = asString(request.data?.departureHarborId, 'departureHarborId', 128);

  const db = getFirestore();
  const [vesselSnap, fishermanSnap] = await Promise.all([
    db.collection('vessels').doc(vesselId).get(),
    db.collection('users').doc(fishermanUid).get()
  ]);

  if (!vesselSnap.exists) {
    throw new HttpsError('failed-precondition', 'Referenced vessel does not exist.');
  }

  const vessel = vesselSnap.data() ?? {};
  const ownerUserId = String(vessel.ownerUserId ?? vessel.ownerUid ?? '');
  if (ownerUserId !== fishermanUid) {
    throw new HttpsError('permission-denied', 'You can only create trips with your own vessel.');
  }

  const fishermanData = fishermanSnap.data() ?? {};
  const homeHarborId = typeof fishermanData.homeHarborId === 'string' ? fishermanData.homeHarborId : null;
  if (homeHarborId && departureHarborId !== homeHarborId) {
    throw new HttpsError('permission-denied', 'Departure harbor must match your assigned harbor.');
  }

  const initialStatus = departureTime.getTime() > Date.now() ? 'planned' : 'active';
  const status = resolveTripStatus({
    status: initialStatus,
    expectedReturnTime
  });

  const payload = {
    vesselId,
    departureHarborId,
    destinationZone: asString(request.data?.destinationZone, 'destinationZone', 240),
    crewCount: asPositiveInt(request.data?.crewCount, 'crewCount'),
    departureTime: Timestamp.fromDate(departureTime),
    expectedReturnTime: Timestamp.fromDate(expectedReturnTime),
    emergencyContact: asString(request.data?.emergencyContact, 'emergencyContact', 180),
    notes: String(request.data?.notes ?? '').trim().slice(0, 2000),
    fishermanUid,
    status,
    createdByUid: caller.uid,
    createdByRole: caller.role,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
    lastStatusChangedAt: FieldValue.serverTimestamp()
  };

  const tripRef = await db.collection('trips').add(payload);

  await writeAuditLog({
    actorUid: caller.uid,
    actorRole: caller.role,
    action: AUDIT_ACTIONS.TRIP_CREATED,
    targetType: 'trip',
    targetId: tripRef.id,
    metadata: {
      status,
      vesselId,
      departureHarborId
    }
  });

  return { tripId: tripRef.id, status };
});

export const transitionTripStatus = onCall(async (request: CallableRequest) => {
  const caller = await requireCaller(request);
  const tripId = asString(request.data?.tripId, 'tripId', 128);
  const nextStatus = asString(request.data?.status, 'status', 32);

  if (!ALLOWED_STATUSES.has(nextStatus)) {
    throw new HttpsError('invalid-argument', 'Unsupported trip status transition.');
  }

  const db = getFirestore();
  const tripRef = db.collection('trips').doc(tripId);
  const tripSnap = await tripRef.get();
  if (!tripSnap.exists) {
    throw new HttpsError('not-found', 'Trip does not exist.');
  }

  const trip = tripSnap.data() as { fishermanUid?: string; status?: string; expectedReturnTime?: unknown; departureHarborId?: string };
  const isOwner = trip.fishermanUid === caller.uid;
  const isOfficerOrAdmin = caller.role === 'harbor_officer' || caller.role === 'admin';

  if (!isOfficerOrAdmin && !isOwner) {
    throw new HttpsError('permission-denied', 'You cannot update this trip.');
  }

  if (caller.role === 'harbor_officer' && caller.homeHarborId && trip.departureHarborId !== caller.homeHarborId) {
    throw new HttpsError('permission-denied', 'Harbor officers can only update trips from their own harbor.');
  }

  if (isOwner && !isOfficerOrAdmin) {
    const ownerAllowedStatuses = new Set(['active', 'completed', 'emergency']);
    if (!ownerAllowedStatuses.has(nextStatus)) {
      throw new HttpsError('permission-denied', 'Fishermen are not allowed to set this status.');
    }
  }

  const currentStatus = resolveTripStatus(trip);
  const normalizedNextStatus = resolveTripStatus({
    status: nextStatus,
    expectedReturnTime: trip.expectedReturnTime
  });

  if (currentStatus === normalizedNextStatus) {
    return { tripId, status: currentStatus, unchanged: true };
  }

  await tripRef.update({
    status: normalizedNextStatus,
    updatedAt: FieldValue.serverTimestamp(),
    lastStatusChangedAt: FieldValue.serverTimestamp()
  });

  await writeAuditLog({
    actorUid: caller.uid,
    actorRole: caller.role,
    action: AUDIT_ACTIONS.TRIP_STATUS_CHANGED,
    targetType: 'trip',
    targetId: tripId,
    metadata: {
      previousStatus: currentStatus,
      nextStatus: normalizedNextStatus
    }
  });

  return { tripId, status: normalizedNextStatus };
});

export const updateOverdueTripStatuses = onSchedule('every 10 minutes', async () => {
  const db = getFirestore();
  const now = Timestamp.now();

  const overdueQuery = db
    .collection('trips')
    .where('status', '==', 'active')
    .where('expectedReturnTime', '<=', now);

  const snapshot = await overdueQuery.get();
  if (snapshot.empty) {
    return;
  }

  const writes = snapshot.docs.map((doc) => doc.ref.update({
    status: 'overdue',
    updatedAt: FieldValue.serverTimestamp(),
    lastStatusChangedAt: FieldValue.serverTimestamp()
  }));

  await Promise.all(writes);

  await Promise.all(
    snapshot.docs.map((doc) => writeAuditLog({
      actorUid: 'system',
      actorRole: 'system',
      action: AUDIT_ACTIONS.TRIP_STATUS_CHANGED,
      targetType: 'trip',
      targetId: doc.id,
      metadata: {
        previousStatus: 'active',
        nextStatus: 'overdue',
        source: 'scheduled-overdue-check'
      }
    }))
  );
});
