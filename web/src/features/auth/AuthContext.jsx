import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut as firebaseSignOut } from 'firebase/auth';
import { httpsCallable } from 'firebase/functions';
import { auth, functions } from '../../lib/firebase';

const AuthContext = createContext(null);

const roleHomeRoutes = {
  fisherman: '/trips',
  harbor_officer: '/landings',
  buyer: '/batches',
  admin: '/audit'
};

const getSessionProfileCallable = httpsCallable(functions, 'getSessionProfile');
const logAuthAttemptCallable = httpsCallable(functions, 'logAuthAttempt');

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    return onAuthStateChanged(auth, async (currentUser) => {
      setLoading(true);
      setUser(currentUser);

      if (!currentUser) {
        setProfile(null);
        setLoading(false);
        return;
      }

      try {
        const response = await getSessionProfileCallable();
        setProfile(response.data || null);
      } catch {
        setProfile(null);
      } finally {
        setLoading(false);
      }
    });
  }, []);

  const value = useMemo(
    () => ({
      user,
      profile,
      role: profile?.role,
      loading,
      getDefaultRouteForRole: (role) => roleHomeRoutes[role] || '/unauthorized',
      signIn: async (email, password) => {
        try {
          const credential = await signInWithEmailAndPassword(auth, email, password);
          try {
            await logAuthAttemptCallable({ outcome: 'success' });
          } catch {
            // noop: audit logging should not block sign-in
          }
          return credential;
        } catch (error) {
          try {
            await logAuthAttemptCallable({
              outcome: 'failed',
              email,
              code: error?.code || 'unknown'
            });
          } catch {
            // noop: secondary failure should not shadow auth failure
          }
          throw error;
        }
      },
      signOut: () => firebaseSignOut(auth)
    }),
    [loading, profile, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
