import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { HttpsError, onCall, type CallableRequest } from 'firebase-functions/v2/https';
import { writeAuditLog } from '../../shared/utils/audit';

const ALLOWED_MANAGER_ROLES = new Set(['harbor_officer', 'admin']);
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

async function getCaller(request: CallableRequest) {
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
  const caller = await getCaller(request);
  if (!ALLOWED_MANAGER_ROLES.has(caller.role)) {
    throw new HttpsError('permission-denied', 'Only harbor officers and admins can create vessels.');
  }

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
    action: 'vessel.created',
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
  const caller = await getCaller(request);
  if (!ALLOWED_MANAGER_ROLES.has(caller.role)) {
    throw new HttpsError('permission-denied', 'Only harbor officers and admins can update vessels.');
  }

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
    action: 'vessel.updated',
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
