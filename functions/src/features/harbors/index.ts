import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { HttpsError, onCall, type CallableRequest } from 'firebase-functions/v2/https';
import { AUDIT_ACTIONS, writeAuditLog } from '../../shared/utils/audit';
import { requireCaller } from '../../shared/utils/caller';

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

export const createHarbor = onCall(async (request: CallableRequest) => {
  const caller = await requireCaller(request, { allowedRoles: ['admin'] });
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
    action: AUDIT_ACTIONS.HARBOR_CREATED,
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
  const caller = await requireCaller(request, { allowedRoles: ['admin'] });
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
    action: AUDIT_ACTIONS.HARBOR_UPDATED,
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
