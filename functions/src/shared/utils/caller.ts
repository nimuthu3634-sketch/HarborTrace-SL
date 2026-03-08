import { getFirestore } from 'firebase-admin/firestore';
import { HttpsError, type CallableRequest } from 'firebase-functions/v2/https';

export type CallerContext = {
  uid: string;
  role: string;
  homeHarborId: string | null;
  isActive: boolean;
  displayName: string | null;
};

type CallerOptions = {
  allowedRoles?: string[];
};

export async function requireCaller(request: CallableRequest, options: CallerOptions = {}): Promise<CallerContext> {
  if (!request.auth?.uid) {
    throw new HttpsError('unauthenticated', 'A signed-in session is required.');
  }

  const db = getFirestore();
  const userSnap = await db.collection('users').doc(request.auth.uid).get();
  if (!userSnap.exists) {
    throw new HttpsError('failed-precondition', 'No user profile found for signed-in account.');
  }

  const userData = userSnap.data() ?? {};
  const role = String(userData.role ?? 'unassigned');
  const isActive = userData.isActive !== false;

  if (!isActive) {
    throw new HttpsError('permission-denied', 'Your account is inactive. Contact support.');
  }

  if (options.allowedRoles && !options.allowedRoles.includes(role)) {
    throw new HttpsError('permission-denied', 'You do not have permission to perform this action.');
  }

  return {
    uid: request.auth.uid,
    role,
    homeHarborId: typeof userData.homeHarborId === 'string' ? userData.homeHarborId : null,
    isActive,
    displayName: typeof userData.displayName === 'string' ? userData.displayName : null
  };
}
