import { onCall } from 'firebase-functions/v2/https';

export const publishHarborNotice = onCall(async () => {
  return { message: 'Harbor notice publish scaffold is ready.' };
});
