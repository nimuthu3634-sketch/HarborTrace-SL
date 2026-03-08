import { FieldValue, getFirestore, Timestamp } from 'firebase-admin/firestore';
import { HttpsError, onCall, type CallableRequest } from 'firebase-functions/v2/https';
import { writeAuditLog } from '../../shared/utils/audit';

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

  const status = departureTime.getTime() > Date.now() ? 'planned' : 'active';

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
    action: 'trip.created',
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

  const trip = tripSnap.data() as { fishermanUid?: string; status?: string };
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

  const currentStatus = String(trip.status ?? 'planned');
  if (currentStatus === nextStatus) {
    return { tripId, status: currentStatus, unchanged: true };
  }

  await tripRef.update({
    status: nextStatus,
    updatedAt: FieldValue.serverTimestamp(),
    lastStatusChangedAt: FieldValue.serverTimestamp()
  });

  if (['active', 'completed', 'overdue', 'emergency'].includes(nextStatus)) {
    await writeAuditLog({
      actorUid: caller.uid,
      actorRole: caller.role,
      action: `trip.status.${nextStatus}`,
      targetType: 'trip',
      targetId: tripId,
      metadata: {
        previousStatus: currentStatus,
        nextStatus
      }
    });
  }

  return { tripId, status: nextStatus };
});
