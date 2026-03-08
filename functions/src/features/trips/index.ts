import { FieldValue, getFirestore, Timestamp } from 'firebase-admin/firestore';
import { HttpsError, onCall, type CallableRequest } from 'firebase-functions/v2/https';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { AUDIT_ACTIONS, writeAuditLog } from '../../shared/utils/audit';
import { resolveTripStatus } from '../../shared/utils/tripStatus';

const ALLOWED_STATUSES = new Set(['planned', 'active', 'completed', 'overdue', 'emergency']);

function asString(value: unknown, fieldName: string) {
  const parsed = String(value ?? '').trim();
  if (!parsed) {
    throw new HttpsError('invalid-argument', `${fieldName} is required.`);
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

async function getCallerRole(request: CallableRequest) {
  if (!request.auth?.uid) {
    throw new HttpsError('unauthenticated', 'A signed-in session is required.');
  }

  const db = getFirestore();
  const userSnap = await db.collection('users').doc(request.auth.uid).get();
  if (!userSnap.exists) {
    throw new HttpsError('failed-precondition', 'No user profile found for signed-in account.');
  }

  return {
    uid: request.auth.uid,
    role: String(userSnap.data()?.role ?? 'unassigned')
  };
}

export const createTrip = onCall(async (request: CallableRequest) => {
  const caller = await getCallerRole(request);
  if (caller.role !== 'fisherman') {
    throw new HttpsError('permission-denied', 'Only fishermen can register departures.');
  }

  const fishermanUid = asString(request.data?.fishermanUid, 'fishermanUid');
  if (fishermanUid !== caller.uid) {
    throw new HttpsError('permission-denied', 'Fishermen can only create trips for themselves.');
  }

  const departureTime = asDate(request.data?.departureTime, 'departureTime');
  const expectedReturnTime = asDate(request.data?.expectedReturnTime, 'expectedReturnTime');
  if (expectedReturnTime.getTime() <= departureTime.getTime()) {
    throw new HttpsError('invalid-argument', 'expectedReturnTime must be after departureTime.');
  }

  const initialStatus = departureTime.getTime() > Date.now() ? 'planned' : 'active';
  const status = resolveTripStatus({
    status: initialStatus,
    expectedReturnTime
  });

  const payload = {
    vesselId: asString(request.data?.vesselId, 'vesselId'),
    departureHarborId: asString(request.data?.departureHarborId, 'departureHarborId'),
    destinationZone: asString(request.data?.destinationZone, 'destinationZone'),
    crewCount: asPositiveInt(request.data?.crewCount, 'crewCount'),
    departureTime: Timestamp.fromDate(departureTime),
    expectedReturnTime: Timestamp.fromDate(expectedReturnTime),
    emergencyContact: asString(request.data?.emergencyContact, 'emergencyContact'),
    notes: String(request.data?.notes ?? '').trim(),
    fishermanUid,
    status,
    createdByUid: caller.uid,
    createdByRole: caller.role,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
    lastStatusChangedAt: FieldValue.serverTimestamp()
  };

  const db = getFirestore();
  const tripRef = await db.collection('trips').add(payload);

  await writeAuditLog({
    actorUid: caller.uid,
    actorRole: caller.role,
    action: AUDIT_ACTIONS.TRIP_CREATED,
    targetType: 'trip',
    targetId: tripRef.id,
    metadata: {
      status,
      vesselId: payload.vesselId,
      departureHarborId: payload.departureHarborId
    }
  });

  return { tripId: tripRef.id, status };
});

export const transitionTripStatus = onCall(async (request: CallableRequest) => {
  const caller = await getCallerRole(request);
  const tripId = asString(request.data?.tripId, 'tripId');
  const nextStatus = asString(request.data?.status, 'status');

  if (!ALLOWED_STATUSES.has(nextStatus)) {
    throw new HttpsError('invalid-argument', 'Unsupported trip status transition.');
  }

  const db = getFirestore();
  const tripRef = db.collection('trips').doc(tripId);
  const tripSnap = await tripRef.get();
  if (!tripSnap.exists) {
    throw new HttpsError('not-found', 'Trip does not exist.');
  }

  const trip = tripSnap.data() as { fishermanUid?: string; status?: string; expectedReturnTime?: unknown };
  const isOwner = trip.fishermanUid === caller.uid;
  const isOfficerOrAdmin = caller.role === 'harbor_officer' || caller.role === 'admin';

  if (!isOfficerOrAdmin && !isOwner) {
    throw new HttpsError('permission-denied', 'You cannot update this trip.');
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

  if (['active', 'completed', 'overdue', 'emergency'].includes(normalizedNextStatus)) {
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
  }

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
