import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { HttpsError, onCall, type CallableRequest } from 'firebase-functions/v2/https';
import { AUDIT_ACTIONS, writeAuditLog } from '../../shared/utils/audit';
import { requireCaller } from '../../shared/utils/caller';

const ALLOWED_VESSEL_STATUSES = new Set(['active', 'inactive', 'maintenance']);

function requiredText(value: unknown, fieldName: string, max = 200) {
  const parsed = String(value ?? '').trim();
  if (!parsed) {
    throw new HttpsError('invalid-argument', `${fieldName} is required.`);
  }

  if (parsed.length > max) {
    throw new HttpsError('invalid-argument', `${fieldName} exceeds allowed length.`);
  }

  return parsed;
}

function requiredPositiveNumber(value: unknown, fieldName: string) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new HttpsError('invalid-argument', `${fieldName} must be a positive number.`);
  }

  return parsed;
}


function normalizeRegistrationNumber(input: string) {
  return input.replace(/\s+/g, '').toUpperCase();
}

async function assertUniqueRegistration(registrationNumber: string, currentVesselId?: string) {
  const db = getFirestore();
  const duplicateSnap = await db
    .collection('vessels')
    .where('registrationNumberNormalized', '==', registrationNumber)
    .limit(1)
    .get();

  if (!duplicateSnap.empty && duplicateSnap.docs[0].id !== currentVesselId) {
    throw new HttpsError('already-exists', 'A vessel with this registration number already exists.');
  }
}

export const createVessel = onCall(async (request: CallableRequest) => {
  const caller = await requireCaller(request, { allowedRoles: ['harbor_officer', 'admin'] });

  const vesselName = requiredText(request.data?.vesselName, 'vesselName', 140);
  const registrationNumber = requiredText(request.data?.registrationNumber, 'registrationNumber', 50);
  const ownerUserId = requiredText(request.data?.ownerUserId, 'ownerUserId', 128);
  const vesselType = requiredText(request.data?.vesselType, 'vesselType', 64);
  const status = requiredText(request.data?.status, 'status', 32);
  const capacity = requiredPositiveNumber(request.data?.capacity, 'capacity');

  if (!ALLOWED_VESSEL_STATUSES.has(status)) {
    throw new HttpsError('invalid-argument', 'Unsupported vessel status.');
  }

  const registrationNumberNormalized = normalizeRegistrationNumber(registrationNumber);
  await assertUniqueRegistration(registrationNumberNormalized);

  const db = getFirestore();
  const vesselRef = await db.collection('vessels').add({
    vesselName,
    registrationNumber,
    registrationNumberNormalized,
    ownerUserId,
    vesselType,
    capacity,
    status,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
    createdByUid: caller.uid,
    updatedByUid: caller.uid
  });

  await writeAuditLog({
    actorUid: caller.uid,
    actorRole: caller.role,
    action: AUDIT_ACTIONS.VESSEL_CREATED,
    targetType: 'vessel',
    targetId: vesselRef.id,
    metadata: {
      registrationNumber,
      ownerUserId,
      vesselType,
      status
    }
  });

  return { vesselId: vesselRef.id };
});

export const updateVessel = onCall(async (request: CallableRequest) => {
  const caller = await requireCaller(request, { allowedRoles: ['harbor_officer', 'admin'] });

  const vesselId = requiredText(request.data?.vesselId, 'vesselId', 128);
  const vesselName = requiredText(request.data?.vesselName, 'vesselName', 140);
  const registrationNumber = requiredText(request.data?.registrationNumber, 'registrationNumber', 50);
  const ownerUserId = requiredText(request.data?.ownerUserId, 'ownerUserId', 128);
  const vesselType = requiredText(request.data?.vesselType, 'vesselType', 64);
  const status = requiredText(request.data?.status, 'status', 32);
  const capacity = requiredPositiveNumber(request.data?.capacity, 'capacity');

  if (!ALLOWED_VESSEL_STATUSES.has(status)) {
    throw new HttpsError('invalid-argument', 'Unsupported vessel status.');
  }

  const db = getFirestore();
  const vesselRef = db.collection('vessels').doc(vesselId);
  const existingSnap = await vesselRef.get();
  if (!existingSnap.exists) {
    throw new HttpsError('not-found', 'Vessel not found.');
  }

  const registrationNumberNormalized = normalizeRegistrationNumber(registrationNumber);
  await assertUniqueRegistration(registrationNumberNormalized, vesselId);

  await vesselRef.update({
    vesselName,
    registrationNumber,
    registrationNumberNormalized,
    ownerUserId,
    vesselType,
    capacity,
    status,
    updatedAt: FieldValue.serverTimestamp(),
    updatedByUid: caller.uid
  });

  await writeAuditLog({
    actorUid: caller.uid,
    actorRole: caller.role,
    action: AUDIT_ACTIONS.VESSEL_UPDATED,
    targetType: 'vessel',
    targetId: vesselId,
    metadata: {
      registrationNumber,
      ownerUserId,
      vesselType,
      status
    }
  });

  return { vesselId, updated: true };
});
