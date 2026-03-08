import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { HttpsError, onCall, type CallableRequest } from 'firebase-functions/v2/https';
import { writeAuditLog } from '../../shared/utils/audit';

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

async function getCaller(request: CallableRequest) {
  if (!request.auth?.uid) {
    throw new HttpsError('unauthenticated', 'A signed-in session is required.');
  }

  const db = getFirestore();
  const userSnap = await db.collection('users').doc(request.auth.uid).get();
  if (!userSnap.exists) {
    throw new HttpsError('failed-precondition', 'No user profile found for signed-in account.');
  }

  const role = String(userSnap.data()?.role ?? 'unassigned');
  if (role !== 'admin') {
    throw new HttpsError('permission-denied', 'Only admins can manage harbors.');
  }

  return {
    uid: request.auth.uid,
    role
  };
}

export const createHarbor = onCall(async (request: CallableRequest) => {
  const caller = await getCaller(request);
  const name = requiredText(request.data?.name, 'name', 140);
  const district = requiredText(request.data?.district, 'district', 80);
  const locationDescription = requiredText(request.data?.locationDescription, 'locationDescription', 300);

  const db = getFirestore();
  const harborRef = await db.collection('harbors').add({
    name,
    district,
    locationDescription,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
    createdByUid: caller.uid,
    updatedByUid: caller.uid
  });

  await writeAuditLog({
    actorUid: caller.uid,
    actorRole: caller.role,
    action: 'harbor.created',
    targetType: 'harbor',
    targetId: harborRef.id,
    metadata: {
      name,
      district,
      locationDescription
    }
  });

  return { harborId: harborRef.id };
});

export const updateHarbor = onCall(async (request: CallableRequest) => {
  const caller = await getCaller(request);
  const harborId = requiredText(request.data?.harborId, 'harborId', 128);
  const name = requiredText(request.data?.name, 'name', 140);
  const district = requiredText(request.data?.district, 'district', 80);
  const locationDescription = requiredText(request.data?.locationDescription, 'locationDescription', 300);

  const db = getFirestore();
  const harborRef = db.collection('harbors').doc(harborId);
  const harborSnap = await harborRef.get();
  if (!harborSnap.exists) {
    throw new HttpsError('not-found', 'Harbor not found.');
  }

  await harborRef.update({
    name,
    district,
    locationDescription,
    updatedAt: FieldValue.serverTimestamp(),
    updatedByUid: caller.uid
  });

  await writeAuditLog({
    actorUid: caller.uid,
    actorRole: caller.role,
    action: 'harbor.updated',
    targetType: 'harbor',
    targetId: harborId,
    metadata: {
      name,
      district,
      locationDescription
    }
  });

  return { harborId, updated: true };
});
