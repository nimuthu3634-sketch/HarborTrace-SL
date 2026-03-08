import { getFirestore } from 'firebase-admin/firestore';
import { HttpsError, onCall, type CallableRequest } from 'firebase-functions/v2/https';
import { randomBytes } from 'node:crypto';
import { AUDIT_ACTIONS, writeAuditLog } from '../../shared/utils/audit';

function generateBatchCodeValue() {
  return `HTSL-${Date.now().toString(36).toUpperCase()}-${randomBytes(3).toString('hex').toUpperCase()}`;
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

export const generateBatchCode = onCall(async (request: CallableRequest) => {
  const caller = await getCaller(request);
  if (!['harbor_officer', 'admin'].includes(caller.role)) {
    throw new HttpsError('permission-denied', 'Only harbor officers and admins can generate batch codes.');
  }

  const batchCode = generateBatchCodeValue();

  await writeAuditLog({
    actorUid: caller.uid,
    actorRole: caller.role,
    action: AUDIT_ACTIONS.BATCH_GENERATED,
    targetType: 'batch',
    targetId: batchCode,
    metadata: {
      source: 'manual-generator'
    }
  });

  return { batchCode };
});
