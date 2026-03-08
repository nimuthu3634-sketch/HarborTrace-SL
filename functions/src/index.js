const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { onDocumentCreated } = require('firebase-functions/v2/firestore');
const admin = require('firebase-admin');

admin.initializeApp();
const db = admin.firestore();

async function getRole(uid) {
  const snap = await db.collection('users').doc(uid).get();
  return snap.exists ? snap.data().role : null;
}

async function writeAudit(actorUid, action, targetType, targetId, meta = {}) {
  const role = actorUid ? await getRole(actorUid) : 'system';
  return db.collection('auditLogs').add({
    actorUid: actorUid || 'system',
    actorRole: role,
    action,
    targetType,
    targetId,
    meta,
    createdAt: admin.firestore.FieldValue.serverTimestamp()
  });
}

exports.verifyLanding = onCall(async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Sign in required');
  const role = await getRole(request.auth.uid);
  if (!['harbor_officer', 'admin'].includes(role)) {
    throw new HttpsError('permission-denied', 'Officer or admin role required');
  }

  const { landingId } = request.data;
  if (!landingId) throw new HttpsError('invalid-argument', 'landingId is required');

  const landingRef = db.collection('landings').doc(landingId);
  await landingRef.update({
    status: 'verified',
    verifiedBy: request.auth.uid,
    verifiedAt: admin.firestore.FieldValue.serverTimestamp()
  });

  await writeAudit(request.auth.uid, 'verify_landing', 'landing', landingId);
  return { ok: true, landingId, status: 'verified' };
});

exports.generateFishBatch = onCall(async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Sign in required');
  const role = await getRole(request.auth.uid);
  if (!['harbor_officer', 'admin'].includes(role)) {
    throw new HttpsError('permission-denied', 'Officer or admin role required');
  }

  const { landingId, species, weightKg, qualityGrade } = request.data;
  if (!landingId || !species || !weightKg) {
    throw new HttpsError('invalid-argument', 'landingId, species, and weightKg are required');
  }

  const batchCode = `HTSL-${Date.now().toString(36).toUpperCase()}`;
  const batchRef = await db.collection('batches').add({
    batchCode,
    landingId,
    species,
    weightKg,
    qualityGrade: qualityGrade || 'B',
    verified: true,
    verifiedByOfficerUid: request.auth.uid,
    createdAt: admin.firestore.FieldValue.serverTimestamp()
  });

  await writeAudit(request.auth.uid, 'generate_batch', 'batch', batchRef.id, { landingId, batchCode });
  return { ok: true, batchId: batchRef.id, batchCode };
});

exports.publishNotice = onCall(async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Sign in required');
  const role = await getRole(request.auth.uid);
  if (!['harbor_officer', 'admin'].includes(role)) {
    throw new HttpsError('permission-denied', 'Officer or admin role required');
  }

  const { title, body, scope, harborId, priority } = request.data;
  if (!title || !body) throw new HttpsError('invalid-argument', 'title and body are required');

  const ref = await db.collection('notices').add({
    title,
    body,
    scope: scope || 'all',
    harborId: harborId || null,
    priority: priority || 'normal',
    createdBy: request.auth.uid,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    expiresAt: null
  });

  await writeAudit(request.auth.uid, 'publish_notice', 'notice', ref.id);
  return { ok: true, noticeId: ref.id };
});

exports.onLandingCreated = onDocumentCreated('landings/{landingId}', async (event) => {
  const data = event.data?.data();
  await writeAudit(data?.fishermanUid || null, 'landing_created', 'landing', event.params.landingId, {
    harborId: data?.harborId || null,
    status: data?.status || 'submitted'
  });
});
