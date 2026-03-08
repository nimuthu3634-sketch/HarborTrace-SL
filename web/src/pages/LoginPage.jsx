import { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../features/auth/AuthContext';

export default function LoginPage() {
  const { user, role, loading, signIn, getDefaultRouteForRole } = useAuth();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    document.title = 'HarborTrace SL | Secure Sign In';
  }, []);

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
      setError('Unable to sign in. Check your credentials and verify your account role assignment.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="card narrow auth-card">
      <h2>HarborTrace SL Access</h2>
      <p className="auth-subtitle">Sign in with your institutional account to access secure fisheries workflows.</p>
      <form onSubmit={onSubmit}>
        <label>
          Institutional Email
          <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" autoComplete="email" required />
        </label>
        <label>
          Password
          <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" autoComplete="current-password" required />
        </label>
        <button type="submit" disabled={submitting}>{submitting ? 'Signing in...' : 'Enter fisheries control center'}</button>
      </form>
      {error ? <p className="error">{error}</p> : null}
    </section>
  );
}
