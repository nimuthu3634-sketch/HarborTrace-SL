import { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useI18n } from '../i18n/I18nProvider';
import LanguageSwitcher from '../components/LanguageSwitcher';
import { useAuth } from '../features/auth/AuthContext';

export default function LoginPage() {
  const { user, role, loading, signIn, getDefaultRouteForRole } = useAuth();
  const location = useLocation();
  const { t } = useI18n();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    document.title = `${t('appName')} | ${t('login.title')}`;
  }, [t]);

  if (!loading && user) {
    const routeFromGuard = location.state?.from?.pathname;
    const destination = routeFromGuard && routeFromGuard !== '/login' ? routeFromGuard : getDefaultRouteForRole(role);
    return <Navigate to={destination} replace />;
  }

  const onSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      await signIn(email.trim(), password);
    } catch {
      setError(t('login.error'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="card narrow auth-card">
      <LanguageSwitcher />
      <h2>{t('login.title')}</h2>
      <p className="auth-subtitle">{t('login.subtitle')}</p>
      <form onSubmit={onSubmit}>
        <label>
          {t('login.email')}
          <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" autoComplete="email" required />
        </label>
        <label>
          {t('login.password')}
          <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" autoComplete="current-password" required />
        </label>
        <button type="submit" disabled={submitting}>{submitting ? t('login.submitting') : t('login.submit')}</button>
      </form>
      {error ? <p className="error">{error}</p> : null}
    </section>
  );
}
