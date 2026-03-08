import { onCall } from 'firebase-functions/v2/https';

export const transitionTripStatus = onCall(async () => {
  return { message: 'Trip status transition scaffold is ready.' };
});
