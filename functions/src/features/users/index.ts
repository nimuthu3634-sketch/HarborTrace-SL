import { onCall } from 'firebase-functions/v2/https';

export const setUserRole = onCall(async () => {
  return { message: 'User role management scaffold is ready.' };
});
