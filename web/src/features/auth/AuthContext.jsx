import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut as firebaseSignOut } from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { useI18n } from '../../i18n/I18nProvider';
import { normalizeLanguage } from '../../i18n/translations';
import { auth, db, functions } from '../../lib/firebase';

const AuthContext = createContext(null);

const roleHomeRoutes = {
  fisherman: '/trips',
  harbor_officer: '/landings',
  buyer: '/batches',
  admin: '/audit'
};

const getSessionProfileCallable = httpsCallable(functions, 'getSessionProfile');
const logAuthAttemptCallable = httpsCallable(functions, 'logAuthAttempt');

function swallowError() {
  // Intentionally ignore non-critical telemetry/profile sync errors.
}

export function AuthProvider({ children }) {
  const { setLanguage, language } = useI18n();
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
        const nextProfile = response.data || null;
        setProfile(nextProfile);

        if (nextProfile?.preferredLanguage) {
          setLanguage(normalizeLanguage(nextProfile.preferredLanguage));
        }
      } catch {
        setProfile(null);
      } finally {
        setLoading(false);
      }
    });
  }, [setLanguage]);

  useEffect(() => {
    if (!user?.uid) {
      return;
    }

    updateDoc(doc(db, 'users', user.uid), {
      preferredLanguage: normalizeLanguage(language)
    }).catch(swallowError);
  }, [language, user?.uid]);

  const value = useMemo(
    () => ({
      user,
      profile,
      role: profile?.role,
      loading,
      getDefaultRouteForRole: (nextRole) => roleHomeRoutes[nextRole] || '/unauthorized',
      signIn: async (email, password) => {
        try {
          const credential = await signInWithEmailAndPassword(auth, email, password);
          await logAuthAttemptCallable({ outcome: 'success' }).catch(swallowError);
          return credential;
        } catch (error) {
          await logAuthAttemptCallable({
            outcome: 'failed',
            email,
            code: error?.code || 'unknown'
          }).catch(swallowError);
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
