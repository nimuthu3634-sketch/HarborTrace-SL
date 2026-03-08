import { onCall } from 'firebase-functions/v2/https';

export const verifyLandingIntake = onCall(async () => {
  return { message: 'Landing verification scaffold is ready.' };
});
