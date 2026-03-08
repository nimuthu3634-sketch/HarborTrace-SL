import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { HttpsError, onCall, type CallableRequest } from 'firebase-functions/v2/https';
import { randomBytes } from 'node:crypto';
import { AUDIT_ACTIONS, writeAuditLog } from '../../shared/utils/audit';
import { requireCaller } from '../../shared/utils/caller';

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

function asText(value: unknown, fieldName: string, max = 200) {
  const parsed = String(value ?? '').trim();
  if (!parsed) {
    throw new HttpsError('invalid-argument', `${fieldName} is required.`);
  }
  if (parsed.length > max) {
    throw new HttpsError('invalid-argument', `${fieldName} exceeds allowed length.`);
  }
  return parsed;
}

function asPositiveNumber(value: unknown, fieldName: string) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new HttpsError('invalid-argument', `${fieldName} must be a positive number.`);
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

export const submitLandingIntake = onCall(async (request: CallableRequest<LandingPayload>) => {
  const caller = await requireCaller(request, { allowedRoles: ['fisherman'] });
  const db = getFirestore();

  const tripId = asText(request.data?.tripId, 'tripId', 128);
  const fishType = asText(request.data?.fishType, 'fishType', 120);
  const storageMethod = asText(request.data?.storageMethod, 'storageMethod', 80);
  const conditionStatus = asText(request.data?.conditionStatus, 'conditionStatus', 80);
  const landingHarborId = asText(request.data?.landingHarborId, 'landingHarborId', 128);
  const landingTime = asDate(request.data?.landingTime, 'landingTime');
  const quantity = asPositiveNumber(request.data?.quantity, 'quantity');
  const totalWeightKg = asPositiveNumber(request.data?.totalWeightKg, 'totalWeightKg');

  const tripSnap = await db.collection('trips').doc(tripId).get();
  if (!tripSnap.exists || tripSnap.data()?.fishermanUid !== caller.uid) {
    throw new HttpsError('permission-denied', 'Trip ownership validation failed for landing submission.');
  }

  const tripData = tripSnap.data() ?? {};
  if (typeof tripData.departureHarborId === 'string' && tripData.departureHarborId !== landingHarborId) {
    throw new HttpsError('permission-denied', 'Landing harbor must match the trip harbor.');
  }

  const now = Timestamp.now();
  const landingRef = await db.collection('landings').add({
    tripId,
    fishType,
    quantity,
    totalWeightKg,
    storageMethod,
    conditionStatus,
    landingHarborId,
    landingTime: Timestamp.fromDate(landingTime),
    verificationStatus: 'pending',
    fishermanUid: caller.uid,
    submittedByUid: caller.uid,
    verifiedByOfficerUid: null,
    verifiedAt: null,
    createdAt: now,
    updatedAt: now
  });

  await writeAuditLog({
    actorUid: caller.uid,
    actorRole: caller.role,
    action: AUDIT_ACTIONS.LANDING_SUBMITTED,
    targetType: 'landing',
    targetId: landingRef.id,
    metadata: {
      tripId,
      fishType,
      quantity,
      totalWeightKg,
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
  const caller = await requireCaller(request, { allowedRoles: ['harbor_officer', 'admin'] });

  const landingId = asText(request.data?.landingId, 'landingId', 128);
  const verificationStatus = request.data?.verificationStatus;
  const comments = String(request.data?.comments ?? '').trim();

  if (!['verified', 'rejected'].includes(String(verificationStatus))) {
    throw new HttpsError('invalid-argument', 'A valid verificationStatus is required.');
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
    if (
      caller.role === 'harbor_officer' &&
      caller.homeHarborId &&
      String(landingData.landingHarborId ?? '') !== caller.homeHarborId
    ) {
      throw new HttpsError('permission-denied', 'Harbor officers can only verify landings from their own harbor.');
    }

    const existingStatus = String(landingData.verificationStatus ?? 'pending');

    if (existingStatus !== 'pending') {
      throw new HttpsError('failed-precondition', 'Only pending landing declarations can be verified or rejected.');
    }

    const now = Timestamp.now();
    transaction.update(landingRef, {
      verificationStatus,
      verifiedByOfficerUid: caller.uid,
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
    actorUid: caller.uid,
    actorRole: caller.role,
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
