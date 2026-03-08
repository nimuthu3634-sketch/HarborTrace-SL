import { onCall } from 'firebase-functions/v2/https';

export const generateBatchCode = onCall(async () => {
  return { message: 'Batch generation scaffold is ready.' };
});
