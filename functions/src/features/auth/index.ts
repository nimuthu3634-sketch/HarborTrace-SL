import { getFirestore } from 'firebase-admin/firestore';
import { HttpsError, onCall, type CallableRequest } from 'firebase-functions/v2/https';
import { AUDIT_ACTIONS, writeAuditLog } from '../../shared/utils/audit';
import { requireCaller } from '../../shared/utils/caller';

const ALLOWED_FAILURE_CODES = new Set([
  'auth/invalid-credential',
  'auth/invalid-email',
  'auth/too-many-requests',
  'auth/user-disabled',
  'auth/user-not-found',
  'auth/wrong-password',
  'unknown'
]);

export const getSessionProfile = onCall(async (request: CallableRequest) => {
  const caller = await requireCaller(request);

  const db = getFirestore();
  const profileSnap = await db.collection('users').doc(caller.uid).get();
  const profile = profileSnap.data() ?? {};

  return {
    uid: caller.uid,
    role: profile.role ?? null,
    displayName: profile.displayName ?? null,
    harborId: profile.harborId ?? profile.homeHarborId ?? null,
    homeHarborId: profile.homeHarborId ?? null,
    preferredLanguage: profile.preferredLanguage ?? null
  };
});

export const logAuthAttempt = onCall(async (request: CallableRequest) => {
  const outcome = request.data?.outcome === 'success' ? 'success' : 'failed';
  const attemptAt = new Date().toISOString();

  if (outcome === 'success') {
    if (!request.auth?.uid) {
      throw new HttpsError('unauthenticated', 'Cannot log a successful login without auth context.');
    }

    const db = getFirestore();
    const profileSnap = await db.collection('users').doc(request.auth.uid).get();
    const role = profileSnap.exists ? profileSnap.data()?.role ?? 'unassigned' : 'unassigned';

    await writeAuditLog({
      actorUid: request.auth.uid,
      actorRole: role,
      action: AUDIT_ACTIONS.AUTH_LOGIN_SUCCESS,
      targetType: 'session',
      targetId: request.auth.uid,
      metadata: {
        attemptAt,
        provider: 'password'
      }
    });

    return { ok: true };
  }

  const email = String(request.data?.email ?? '').trim().toLowerCase();
  const failureCode = String(request.data?.code ?? 'unknown').trim();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
    throw new HttpsError('invalid-argument', 'A valid email is required for failed login events.');
  }

  await writeAuditLog({
    actorUid: 'anonymous',
    actorRole: 'anonymous',
    action: AUDIT_ACTIONS.AUTH_LOGIN_FAILED,
    targetType: 'session',
    targetId: email,
    metadata: {
      attemptAt,
      provider: 'password',
      code: ALLOWED_FAILURE_CODES.has(failureCode) ? failureCode : 'unknown'
    }
  });

  return { ok: true };
});
