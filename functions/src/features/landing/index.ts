import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { HttpsError, onCall, type CallableRequest } from 'firebase-functions/v2/https';
import { randomBytes } from 'node:crypto';
import { AUDIT_ACTIONS, writeAuditLog } from '../../shared/utils/audit';

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

type VerifyLandingPayload = {
  landingId: string;
  verificationStatus: 'verified' | 'rejected';
  comments?: string;
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
    action: AUDIT_ACTIONS.LANDING_SUBMITTED,
    targetType: 'landing',
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

function generateBatchCode() {
  return `HTSL-${Date.now().toString(36).toUpperCase()}-${randomBytes(3).toString('hex').toUpperCase()}`;
}

function getVerifyBaseUrl() {
  return process.env.PUBLIC_VERIFY_BASE_URL || 'https://harbortrace-sl.web.app/verify';
}

export const verifyLandingIntake = onCall(async (request: CallableRequest<VerifyLandingPayload>) => {
  const uid = requireAuth(request);
  const role = await getRole(uid);

  if (!['harbor_officer', 'admin'].includes(role)) {
    throw new HttpsError('permission-denied', 'Only harbor officers and admins can verify landings.');
  }

  const landingId = String(request.data?.landingId ?? '').trim();
  const verificationStatus = request.data?.verificationStatus;
  const comments = String(request.data?.comments ?? '').trim();

  if (!landingId || !['verified', 'rejected'].includes(String(verificationStatus))) {
    throw new HttpsError('invalid-argument', 'landingId and a valid verificationStatus are required.');
  }

  if (comments.length > 500) {
    throw new HttpsError('invalid-argument', 'Comments must be 500 characters or fewer.');
  }

  const db = getFirestore();
  const landingRef = db.collection('landings').doc(landingId);
  let batchId: string | null = null;
  let batchCode: string | null = null;

  await db.runTransaction(async (transaction) => {
    const landingSnap = await transaction.get(landingRef);

    if (!landingSnap.exists) {
      throw new HttpsError('not-found', 'Landing not found.');
    }

    const landingData = landingSnap.data() ?? {};
    const existingStatus = String(landingData.verificationStatus ?? 'pending');

    if (existingStatus !== 'pending') {
      throw new HttpsError('failed-precondition', 'Only pending landing declarations can be verified or rejected.');
    }

    const now = Timestamp.now();
    transaction.update(landingRef, {
      verificationStatus,
      verifiedByOfficerUid: uid,
      verifiedAt: now,
      verificationComments: comments || null,
      updatedAt: now
    });

    if (verificationStatus === 'verified') {
      const newBatchRef = db.collection('fishBatches').doc();
      const newBatchCode = generateBatchCode();
      const verifyUrl = `${getVerifyBaseUrl().replace(/\/$/, '')}/${encodeURIComponent(newBatchCode)}`;

      const tripSnap = landingData.tripId ? await transaction.get(db.collection('trips').doc(String(landingData.tripId))) : null;
      const harborSnap = landingData.landingHarborId
        ? await transaction.get(db.collection('harbors').doc(String(landingData.landingHarborId)))
        : null;

      batchId = newBatchRef.id;
      batchCode = newBatchCode;

      transaction.set(newBatchRef, {
        batchCode: newBatchCode,
        qrValue: verifyUrl,
        verificationUrl: verifyUrl,
        landingId,
        tripId: String(landingData.tripId ?? ''),
        fishType: landingData.fishType ?? null,
        totalWeightKg: Number(landingData.totalWeightKg ?? 0),
        vessel: String(tripSnap?.data()?.vesselId ?? 'Unknown vessel'),
        landingHarbor: String(harborSnap?.data()?.harborName ?? landingData.landingHarborId ?? 'Unknown harbor'),
        landingTime: landingData.landingTime ?? now,
        storageMethod: String(landingData.storageMethod ?? 'unknown'),
        freshnessStatus: String(landingData.conditionStatus ?? 'undetermined'),
        buyerVisibleStatus: 'visible',
        verificationStatus: 'verified',
        createdAt: now,
        updatedAt: now
      });

      const publicBatchRef = db.collection('batchPublicVerifications').doc(newBatchCode);
      transaction.set(publicBatchRef, {
        batchCode: newBatchCode,
        fishType: landingData.fishType ?? null,
        vessel: String(tripSnap?.data()?.vesselId ?? 'Unknown vessel'),
        landingHarbor: String(harborSnap?.data()?.harborName ?? landingData.landingHarborId ?? 'Unknown harbor'),
        landingTime: landingData.landingTime ?? now,
        storageMethod: String(landingData.storageMethod ?? 'unknown'),
        freshnessStatus: String(landingData.conditionStatus ?? 'undetermined'),
        verificationStatus: 'verified',
        qrValue: verifyUrl,
        verificationUrl: verifyUrl,
        buyerVisibleStatus: 'visible',
        createdAt: now,
        updatedAt: now
      });

      transaction.update(landingRef, {
        batchId: newBatchRef.id,
        batchCode: newBatchCode,
        batchVerificationUrl: verifyUrl
      });
    }
  });

  await writeAuditLog({
    actorUid: uid,
    actorRole: role,
    action: AUDIT_ACTIONS.LANDING_STATUS_CHANGED,
    targetType: 'landing',
    targetId: landingId,
    metadata: {
      verificationStatus,
      comments: comments || null,
      batchId,
      batchCode
    }
  });

  return { ok: true, verificationStatus, batchId, batchCode };
});
