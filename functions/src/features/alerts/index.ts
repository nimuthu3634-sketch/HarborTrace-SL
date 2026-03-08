import { onCall } from 'firebase-functions/v2/https';

export const escalateIncidentAlert = onCall(async () => {
  return { message: 'Alert escalation scaffold is ready.' };
});
