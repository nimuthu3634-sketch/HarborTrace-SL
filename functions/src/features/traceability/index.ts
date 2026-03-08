import { onCall, type CallableRequest } from 'firebase-functions/v2/https';
import { randomBytes } from 'node:crypto';
import { AUDIT_ACTIONS, writeAuditLog } from '../../shared/utils/audit';
import { requireCaller } from '../../shared/utils/caller';

function generateBatchCodeValue() {
  return `HTSL-${Date.now().toString(36).toUpperCase()}-${randomBytes(3).toString('hex').toUpperCase()}`;
}

export const generateBatchCode = onCall(async (request: CallableRequest) => {
  const caller = await requireCaller(request, { allowedRoles: ['harbor_officer', 'admin'] });

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
