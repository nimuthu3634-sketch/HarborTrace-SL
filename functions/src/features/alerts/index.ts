import { FieldValue, getFirestore, Timestamp } from 'firebase-admin/firestore';
import { HttpsError, onCall, type CallableRequest } from 'firebase-functions/v2/https';
import { AUDIT_ACTIONS, writeAuditLog } from '../../shared/utils/audit';

const ALERT_STATUSES = new Set(['pending', 'acknowledged', 'resolved']);

function asString(value: unknown, fieldName: string) {
  const parsed = String(value ?? '').trim();
  if (!parsed) {
    throw new HttpsError('invalid-argument', `${fieldName} is required.`);
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

  return {
    uid: request.auth.uid,
    role: String(userSnap.data()?.role ?? 'unassigned')
  };
}

export const submitEmergencyAlert = onCall(async (request: CallableRequest) => {
  const caller = await getCallerRole(request);
  if (caller.role !== 'fisherman') {
    throw new HttpsError('permission-denied', 'Only fishermen can submit emergency alerts.');
  }

  const fishermanUid = asString(request.data?.fishermanUid, 'fishermanUid');
  if (fishermanUid !== caller.uid) {
    throw new HttpsError('permission-denied', 'Fishermen can only submit alerts for themselves.');
  }

  const activeTripId = asString(request.data?.activeTripId, 'activeTripId');
  const alertType = asString(request.data?.alertType, 'alertType');
  const incidentMessage = asString(request.data?.incidentMessage, 'incidentMessage');
  const lastKnownLocation = asString(request.data?.lastKnownLocation, 'lastKnownLocation');

  const db = getFirestore();
  const tripSnap = await db.collection('trips').doc(activeTripId).get();
  if (!tripSnap.exists) {
    throw new HttpsError('failed-precondition', 'Active trip reference was not found.');
  }

  const trip = tripSnap.data() as { fishermanUid?: string; status?: string };
  if (trip.fishermanUid !== caller.uid || trip.status !== 'active') {
    throw new HttpsError('permission-denied', 'Alerts can only be submitted for your own active trip.');
  }

  const payload = {
    fishermanUid: caller.uid,
    activeTripId,
    alertType,
    incidentMessage,
    lastKnownLocation,
    status: 'pending',
    statusUpdatedByUid: null,
    statusUpdatedAt: null,
    acknowledgedAt: null,
    resolvedAt: null,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp()
  };

  const alertRef = await db.collection('emergencyAlerts').add(payload);

  await writeAuditLog({
    actorUid: caller.uid,
    actorRole: caller.role,
    action: AUDIT_ACTIONS.SOS_SUBMITTED,
    targetType: 'emergencyAlert',
    targetId: alertRef.id,
    metadata: {
      activeTripId,
      alertType,
      status: 'pending'
    }
  });

  return { alertId: alertRef.id, status: 'pending' };
});

export const updateEmergencyAlertStatus = onCall(async (request: CallableRequest) => {
  const caller = await getCallerRole(request);
  const isOfficerOrAdmin = caller.role === 'harbor_officer' || caller.role === 'admin';
  if (!isOfficerOrAdmin) {
    throw new HttpsError('permission-denied', 'Only harbor officers or admins can update alert statuses.');
  }

  const alertId = asString(request.data?.alertId, 'alertId');
  const nextStatus = asString(request.data?.status, 'status');
  if (!ALERT_STATUSES.has(nextStatus)) {
    throw new HttpsError('invalid-argument', 'Unsupported emergency alert status.');
  }

  const db = getFirestore();
  const alertRef = db.collection('emergencyAlerts').doc(alertId);
  const alertSnap = await alertRef.get();
  if (!alertSnap.exists) {
    throw new HttpsError('not-found', 'Emergency alert does not exist.');
  }

  const currentStatus = String(alertSnap.data()?.status ?? 'pending');
  if (currentStatus === nextStatus) {
    return { alertId, status: currentStatus, unchanged: true };
  }

  const updatePayload: Record<string, unknown> = {
    status: nextStatus,
    statusUpdatedByUid: caller.uid,
    statusUpdatedAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp()
  };

  if (nextStatus === 'acknowledged') {
    updatePayload.acknowledgedAt = FieldValue.serverTimestamp();
  }

  if (nextStatus === 'resolved') {
    updatePayload.resolvedAt = FieldValue.serverTimestamp();
  }

  await alertRef.update(updatePayload);

  await writeAuditLog({
    actorUid: caller.uid,
    actorRole: caller.role,
    action: AUDIT_ACTIONS.SOS_STATUS_CHANGED,
    targetType: 'emergencyAlert',
    targetId: alertId,
    metadata: {
      previousStatus: currentStatus,
      nextStatus,
      changedAt: Timestamp.now().toDate().toISOString()
    }
  });

  return { alertId, status: nextStatus };
});
