import { FieldValue, Timestamp, getFirestore } from 'firebase-admin/firestore';
import { HttpsError, onCall, type CallableRequest } from 'firebase-functions/v2/https';
import { writeAuditLog } from '../../shared/utils/audit';

const ALLOWED_AUTHOR_ROLES = new Set(['harbor_officer', 'admin']);
const ALLOWED_TARGET_ROLES = new Set(['fisherman', 'harbor_officer', 'buyer', 'admin', 'all']);
const ALLOWED_SEVERITIES = new Set(['info', 'warning', 'critical']);

function asString(value: unknown, fieldName: string, max = 5000) {
  const parsed = String(value ?? '').trim();
  if (!parsed) {
    throw new HttpsError('invalid-argument', `${fieldName} is required.`);
  }

  if (parsed.length > max) {
    throw new HttpsError('invalid-argument', `${fieldName} exceeds allowed length.`);
  }

  return parsed;
}

async function getCallerRole(request: CallableRequest) {
  if (!request.auth?.uid) {
    throw new HttpsError('unauthenticated', 'A signed-in session is required.');
  }

  const db = getFirestore();
  const userSnap = await db.collection('users').doc(request.auth.uid).get();
  if (!userSnap.exists) {
    throw new HttpsError('failed-precondition', 'No user profile found for signed-in account.');
  }

  const role = String(userSnap.data()?.role ?? 'unassigned');
  return {
    uid: request.auth.uid,
    role,
    displayName: String(userSnap.data()?.displayName ?? request.auth.uid)
  };
}

export const createNotice = onCall(async (request: CallableRequest) => {
  const caller = await getCallerRole(request);
  if (!ALLOWED_AUTHOR_ROLES.has(caller.role)) {
    throw new HttpsError('permission-denied', 'Only harbor officers and admins can create notices.');
  }

  const title = asString(request.data?.title, 'title', 140);
  const body = asString(request.data?.body, 'body', 5000);
  const severity = asString(request.data?.severity, 'severity', 32);
  const targetRole = asString(request.data?.targetRole, 'targetRole', 32);

  if (!ALLOWED_SEVERITIES.has(severity)) {
    throw new HttpsError('invalid-argument', 'Unsupported severity.');
  }

  if (!ALLOWED_TARGET_ROLES.has(targetRole)) {
    throw new HttpsError('invalid-argument', 'Unsupported target role.');
  }

  const db = getFirestore();
  const payload = {
    title,
    body,
    severity,
    targetRole,
    createdBy: caller.uid,
    createdByName: caller.displayName,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp()
  };

  const noticeRef = await db.collection('notices').add(payload);

  await writeAuditLog({
    actorUid: caller.uid,
    actorRole: caller.role,
    action: 'notice.created',
    targetType: 'notice',
    targetId: noticeRef.id,
    metadata: {
      severity,
      targetRole,
      title
    }
  });

  return { noticeId: noticeRef.id };
});

export const updateNotice = onCall(async (request: CallableRequest) => {
  const caller = await getCallerRole(request);
  if (!ALLOWED_AUTHOR_ROLES.has(caller.role)) {
    throw new HttpsError('permission-denied', 'Only harbor officers and admins can update notices.');
  }

  const noticeId = asString(request.data?.noticeId, 'noticeId', 128);
  const db = getFirestore();
  const noticeRef = db.collection('notices').doc(noticeId);
  const noticeSnap = await noticeRef.get();

  if (!noticeSnap.exists) {
    throw new HttpsError('not-found', 'Notice not found.');
  }

  const nextTitle = request.data?.title === undefined ? undefined : asString(request.data?.title, 'title', 140);
  const nextBody = request.data?.body === undefined ? undefined : asString(request.data?.body, 'body', 5000);
  const nextSeverity = request.data?.severity === undefined ? undefined : asString(request.data?.severity, 'severity', 32);
  const nextTargetRole = request.data?.targetRole === undefined ? undefined : asString(request.data?.targetRole, 'targetRole', 32);

  if (nextSeverity && !ALLOWED_SEVERITIES.has(nextSeverity)) {
    throw new HttpsError('invalid-argument', 'Unsupported severity.');
  }

  if (nextTargetRole && !ALLOWED_TARGET_ROLES.has(nextTargetRole)) {
    throw new HttpsError('invalid-argument', 'Unsupported target role.');
  }

  const updatePayload: Record<string, unknown> = {
    updatedAt: FieldValue.serverTimestamp()
  };

  if (nextTitle !== undefined) {
    updatePayload.title = nextTitle;
  }

  if (nextBody !== undefined) {
    updatePayload.body = nextBody;
  }

  if (nextSeverity !== undefined) {
    updatePayload.severity = nextSeverity;
  }

  if (nextTargetRole !== undefined) {
    updatePayload.targetRole = nextTargetRole;
  }

  await noticeRef.update(updatePayload);

  await writeAuditLog({
    actorUid: caller.uid,
    actorRole: caller.role,
    action: 'notice.updated',
    targetType: 'notice',
    targetId: noticeId,
    metadata: {
      changedFields: Object.keys(updatePayload),
      updatedAt: Timestamp.now().toDate().toISOString()
    }
  });

  return { noticeId, updated: true };
});
