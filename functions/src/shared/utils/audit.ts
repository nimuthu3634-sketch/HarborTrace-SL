import { getFirestore } from 'firebase-admin/firestore';

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
    ...input,
    metadata: input.metadata ?? {},
    createdAt: new Date(),
  });
}
