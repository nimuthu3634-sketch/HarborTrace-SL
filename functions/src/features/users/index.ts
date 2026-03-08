import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { HttpsError, onCall, type CallableRequest } from 'firebase-functions/v2/https';
import { AUDIT_ACTIONS, writeAuditLog } from '../../shared/utils/audit';
import { requireCaller } from '../../shared/utils/caller';

const MAX_RESULTS = 100;

function asText(value: unknown, fieldName: string, maxLength = 140, required = true) {
  const parsed = String(value ?? '').trim();
  if (!parsed && required) {
    throw new HttpsError('invalid-argument', `${fieldName} is required.`);
  }

  if (parsed.length > maxLength) {
    throw new HttpsError('invalid-argument', `${fieldName} exceeds allowed length.`);
  }

  return parsed;
}

function asOptionalText(value: unknown, maxLength = 140) {
  return value === null || value === undefined ? null : asText(value, 'value', maxLength, false) || null;
}

function asBoolean(value: unknown, fieldName: string) {
  if (typeof value !== 'boolean') {
    throw new HttpsError('invalid-argument', `${fieldName} must be a boolean.`);
  }

  return value;
}

function normalizeSearch(value: unknown) {
  return String(value ?? '').trim().toLowerCase();
}

function normalizeName(value: unknown) {
  return String(value ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function isVisibleForCaller(
  caller: { role: string; homeHarborId: string | null },
  fisherman: Record<string, unknown>
) {
  if (caller.role === 'admin') {
    return true;
  }

  if (!caller.homeHarborId) {
    return false;
  }

  return fisherman.homeHarborId === caller.homeHarborId;
}

function mapFisherman(id: string, data: Record<string, unknown>) {
  return {
    uid: id,
    displayName: String(data.displayName ?? ''),
    phoneNumber: typeof data.phoneNumber === 'string' ? data.phoneNumber : null,
    homeHarborId: typeof data.homeHarborId === 'string' ? data.homeHarborId : null,
    isActive: data.isActive === false ? false : true,
    role: String(data.role ?? 'fisherman')
  };
}

async function loadVesselsByOwner(ownerUid: string) {
  const db = getFirestore();

  const [ownerUserIdSnap, ownerUidSnap] = await Promise.all([
    db.collection('vessels').where('ownerUserId', '==', ownerUid).limit(50).get(),
    db.collection('vessels').where('ownerUid', '==', ownerUid).limit(50).get()
  ]);

  const vesselMap = new Map<string, { vesselId: string; vesselName: string; registrationNumber: string | null; status: string | null }>();

  for (const snap of [...ownerUserIdSnap.docs, ...ownerUidSnap.docs]) {
    const data = snap.data();
    vesselMap.set(snap.id, {
      vesselId: snap.id,
      vesselName: String(data.vesselName ?? data.name ?? snap.id),
      registrationNumber: typeof data.registrationNumber === 'string' ? data.registrationNumber : null,
      status: typeof data.status === 'string' ? data.status : null
    });
  }

  return Array.from(vesselMap.values());
}

export const listFishermen = onCall(async (request: CallableRequest) => {
  const caller = await requireCaller(request, { allowedRoles: ['admin', 'harbor_officer'] });
  const search = normalizeSearch(request.data?.search);
  const harborFilter = normalizeSearch(request.data?.harborId);
  const statusFilter = normalizeSearch(request.data?.status);

  const db = getFirestore();
  const usersSnap = await db.collection('users').where('role', '==', 'fisherman').limit(MAX_RESULTS).get();

  const fishermen = usersSnap.docs
    .map((snapshot) => mapFisherman(snapshot.id, snapshot.data()))
    .filter((fisherman) => isVisibleForCaller(caller, fisherman as unknown as Record<string, unknown>))
    .filter((fisherman) => {
      if (search && !normalizeName(fisherman.displayName).includes(search)) {
        return false;
      }

      if (harborFilter && (fisherman.homeHarborId ?? '').toLowerCase() !== harborFilter) {
        return false;
      }

      if (statusFilter) {
        const normalizedStatus = fisherman.isActive ? 'active' : 'inactive';
        if (normalizedStatus !== statusFilter) {
          return false;
        }
      }

      return true;
    });

  return {
    fishermen
  };
});

export const getFishermanDetail = onCall(async (request: CallableRequest) => {
  const caller = await requireCaller(request, { allowedRoles: ['admin', 'harbor_officer'] });
  const fishermanUid = asText(request.data?.fishermanUid, 'fishermanUid', 128);

  const db = getFirestore();
  const fishermanRef = db.collection('users').doc(fishermanUid);
  const fishermanSnap = await fishermanRef.get();

  if (!fishermanSnap.exists) {
    throw new HttpsError('not-found', 'Fisherman not found.');
  }

  const fishermanData = fishermanSnap.data() ?? {};
  if (String(fishermanData.role ?? '') !== 'fisherman') {
    throw new HttpsError('failed-precondition', 'Requested user is not a fisherman account.');
  }

  if (!isVisibleForCaller(caller, fishermanData)) {
    throw new HttpsError('permission-denied', 'You can only view fishermen from your harbor.');
  }

  const vessels = await loadVesselsByOwner(fishermanUid);

  return {
    fisherman: mapFisherman(fishermanUid, fishermanData),
    vessels
  };
});

export const createFisherman = onCall(async (request: CallableRequest) => {
  const caller = await requireCaller(request, { allowedRoles: ['admin', 'harbor_officer'] });
  const uid = asText(request.data?.uid, 'uid', 128);
  const displayName = asText(request.data?.displayName, 'displayName', 140);
  const phoneNumber = asOptionalText(request.data?.phoneNumber, 40);
  const requestedHarborId = asOptionalText(request.data?.homeHarborId, 128);
  const isActive = request.data?.isActive === undefined ? true : asBoolean(request.data?.isActive, 'isActive');

  const homeHarborId = caller.role === 'admin' ? requestedHarborId : caller.homeHarborId;
  if (caller.role !== 'admin' && !homeHarborId) {
    throw new HttpsError('failed-precondition', 'Harbor officer must have a home harbor to create fishermen.');
  }

  if (caller.role === 'harbor_officer' && requestedHarborId && requestedHarborId !== caller.homeHarborId) {
    throw new HttpsError('permission-denied', 'Harbor officers can only create fishermen in their own harbor.');
  }

  const db = getFirestore();
  const fishermanRef = db.collection('users').doc(uid);
  const existingSnap = await fishermanRef.get();
  if (existingSnap.exists) {
    throw new HttpsError('already-exists', 'A user with this uid already exists.');
  }

  await fishermanRef.set({
    uid,
    displayName,
    phoneNumber,
    homeHarborId: homeHarborId ?? null,
    isActive,
    role: 'fisherman',
    createdByUid: caller.uid,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp()
  });

  await writeAuditLog({
    actorUid: caller.uid,
    actorRole: caller.role,
    action: AUDIT_ACTIONS.USER_CREATED,
    targetType: 'user',
    targetId: uid,
    metadata: {
      role: 'fisherman',
      homeHarborId: homeHarborId ?? null,
      isActive
    }
  });

  return { uid };
});

export const updateFisherman = onCall(async (request: CallableRequest) => {
  const caller = await requireCaller(request, { allowedRoles: ['admin', 'harbor_officer'] });
  const fishermanUid = asText(request.data?.fishermanUid, 'fishermanUid', 128);

  if (request.data?.role !== undefined && request.data.role !== 'fisherman') {
    throw new HttpsError('permission-denied', 'Role changes are not allowed through fisherman management.');
  }

  const db = getFirestore();
  const fishermanRef = db.collection('users').doc(fishermanUid);
  const fishermanSnap = await fishermanRef.get();

  if (!fishermanSnap.exists) {
    throw new HttpsError('not-found', 'Fisherman not found.');
  }

  const fishermanData = fishermanSnap.data() ?? {};
  if (String(fishermanData.role ?? '') !== 'fisherman') {
    throw new HttpsError('failed-precondition', 'Requested user is not a fisherman account.');
  }

  if (!isVisibleForCaller(caller, fishermanData)) {
    throw new HttpsError('permission-denied', 'You can only update fishermen from your harbor.');
  }

  const updatePayload: Record<string, unknown> = {
    updatedAt: FieldValue.serverTimestamp()
  };

  if (request.data?.displayName !== undefined) {
    updatePayload.displayName = asText(request.data.displayName, 'displayName', 140);
  }

  if (request.data?.phoneNumber !== undefined) {
    updatePayload.phoneNumber = asOptionalText(request.data.phoneNumber, 40);
  }

  if (request.data?.isActive !== undefined) {
    updatePayload.isActive = asBoolean(request.data.isActive, 'isActive');
  }

  if (request.data?.homeHarborId !== undefined) {
    const requestedHarborId = asOptionalText(request.data.homeHarborId, 128);
    if (caller.role === 'harbor_officer' && requestedHarborId !== caller.homeHarborId) {
      throw new HttpsError('permission-denied', 'Harbor officers can only assign their own harbor.');
    }

    updatePayload.homeHarborId = requestedHarborId;
  }

  updatePayload.role = 'fisherman';

  await fishermanRef.update(updatePayload);

  await writeAuditLog({
    actorUid: caller.uid,
    actorRole: caller.role,
    action: AUDIT_ACTIONS.USER_UPDATED,
    targetType: 'user',
    targetId: fishermanUid,
    metadata: {
      changedFields: Object.keys(updatePayload)
    }
  });

  return {
    fishermanUid,
    updated: true
  };
});
