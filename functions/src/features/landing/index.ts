import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { HttpsError, onCall, type CallableRequest } from 'firebase-functions/v2/https';
import { writeAuditLog } from '../../shared/utils/audit';

type LandingPayload = {
  tripId: string;
  fishType: string;
  quantity: number;
  totalWeightKg: number;
  storageMethod: string;
  conditionStatus: string;
  landingHarborId: string;
  landingTime: string;
};

function requireAuth(request: CallableRequest) {
  if (!request.auth?.uid) {
    throw new HttpsError('unauthenticated', 'A signed-in session is required.');
  }
  return request.auth.uid;
}

async function getRole(uid: string) {
  const db = getFirestore();
  const userSnap = await db.collection('users').doc(uid).get();
  return userSnap.exists ? String(userSnap.data()?.role ?? 'unassigned') : 'unassigned';
}

export const submitLandingIntake = onCall(async (request: CallableRequest<LandingPayload>) => {
  const uid = requireAuth(request);
  const db = getFirestore();
  const role = await getRole(uid);

  if (role !== 'fisherman') {
    throw new HttpsError('permission-denied', 'Only fishermen can submit landing intake records.');
  }

  const payload = request.data;
  const requiredFields: Array<keyof LandingPayload> = [
    'tripId',
    'fishType',
    'quantity',
    'totalWeightKg',
    'storageMethod',
    'conditionStatus',
    'landingHarborId',
    'landingTime'
  ];

  for (const field of requiredFields) {
    if (!payload?.[field]) {
      throw new HttpsError('invalid-argument', `Missing required field: ${field}`);
    }
  }

  const tripSnap = await db.collection('trips').doc(payload.tripId).get();
  if (!tripSnap.exists || tripSnap.data()?.fishermanUid !== uid) {
    throw new HttpsError('permission-denied', 'Trip ownership validation failed for landing submission.');
  }

  const now = Timestamp.now();
  const landingRef = await db.collection('landings').add({
    tripId: payload.tripId,
    fishType: String(payload.fishType).trim(),
    quantity: Number(payload.quantity),
    totalWeightKg: Number(payload.totalWeightKg),
    storageMethod: String(payload.storageMethod).trim(),
    conditionStatus: String(payload.conditionStatus).trim(),
    landingHarborId: String(payload.landingHarborId).trim(),
    landingTime: Timestamp.fromDate(new Date(payload.landingTime)),
    verificationStatus: 'pending',
    fishermanUid: uid,
    submittedByUid: uid,
    verifiedByOfficerUid: null,
    verifiedAt: null,
    createdAt: now,
    updatedAt: now
  });

  await writeAuditLog({
    actorUid: uid,
    actorRole: role,
    action: 'landing.submitted',
    targetType: 'landings',
    targetId: landingRef.id,
    metadata: {
      tripId: payload.tripId,
      fishType: payload.fishType,
      quantity: Number(payload.quantity),
      totalWeightKg: Number(payload.totalWeightKg),
      verificationStatus: 'pending'
    }
  });

  return { landingId: landingRef.id, verificationStatus: 'pending' };
});

export const verifyLandingIntake = onCall(async (request: CallableRequest<{ landingId: string; verificationStatus: 'verified' | 'rejected' }>) => {
  const uid = requireAuth(request);
  const role = await getRole(uid);

  if (!['harbor_officer', 'admin'].includes(role)) {
    throw new HttpsError('permission-denied', 'Only harbor officers and admins can verify landings.');
  }

  const landingId = String(request.data?.landingId ?? '').trim();
  const verificationStatus = request.data?.verificationStatus;

  if (!landingId || !['verified', 'rejected'].includes(String(verificationStatus))) {
    throw new HttpsError('invalid-argument', 'landingId and a valid verificationStatus are required.');
  }

  const db = getFirestore();
  const landingRef = db.collection('landings').doc(landingId);
  const landingSnap = await landingRef.get();

  if (!landingSnap.exists) {
    throw new HttpsError('not-found', 'Landing not found.');
  }

  await landingRef.update({
    verificationStatus,
    verifiedByOfficerUid: uid,
    verifiedAt: Timestamp.now(),
    updatedAt: Timestamp.now()
  });

  await writeAuditLog({
    actorUid: uid,
    actorRole: role,
    action: `landing.${verificationStatus}`,
    targetType: 'landings',
    targetId: landingId
  });

  return { ok: true };
});
