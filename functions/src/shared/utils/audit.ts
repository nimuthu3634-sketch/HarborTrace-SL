import { getFirestore } from 'firebase-admin/firestore';

const SENSITIVE_KEY_PATTERN = /(password|token|secret|authorization|api[-_]?key|cookie|credential|session)/i;
const MAX_STRING_LENGTH = 500;

export const AUDIT_ACTIONS = {
  AUTH_LOGIN_SUCCESS: 'auth.login.success',
  AUTH_LOGIN_FAILED: 'auth.login.failed',
  TRIP_CREATED: 'trip.created',
  TRIP_STATUS_CHANGED: 'trip.status.changed',
  SOS_SUBMITTED: 'sos.submitted',
  SOS_STATUS_CHANGED: 'sos.status.changed',
  LANDING_SUBMITTED: 'landing.submitted',
  LANDING_STATUS_CHANGED: 'landing.status.changed',
  VESSEL_CREATED: 'vessel.created',
  VESSEL_UPDATED: 'vessel.updated',
  HARBOR_CREATED: 'harbor.created',
  HARBOR_UPDATED: 'harbor.updated',
  NOTICE_CREATED: 'notice.created',
  NOTICE_UPDATED: 'notice.updated',
  BATCH_GENERATED: 'batch.generated',
  USER_CREATED: 'user.created',
  USER_UPDATED: 'user.updated'
} as const;

function sanitizeAuditValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((entry) => sanitizeAuditValue(entry));
  }

  if (value && typeof value === 'object') {
    return Object.entries(value as Record<string, unknown>).reduce<Record<string, unknown>>((acc, [key, entry]) => {
      if (SENSITIVE_KEY_PATTERN.test(key)) {
        acc[key] = '[REDACTED]';
      } else {
        acc[key] = sanitizeAuditValue(entry);
      }
      return acc;
    }, {});
  }

  if (typeof value === 'string') {
    return value.length > MAX_STRING_LENGTH ? `${value.slice(0, MAX_STRING_LENGTH)}…` : value;
  }

  return value;
}

export async function writeAuditLog(input: {
  actorUid: string;
  actorRole: string;
  action: string;
  targetType: string;
  targetId: string;
  metadata?: Record<string, unknown>;
}) {
  const db = getFirestore();
  await db.collection('auditLogs').add({
    actorUid: input.actorUid,
    actorRole: input.actorRole,
    action: input.action,
    targetType: input.targetType,
    targetId: input.targetId,
    metadata: sanitizeAuditValue(input.metadata ?? {}),
    createdAt: new Date()
  });
}
