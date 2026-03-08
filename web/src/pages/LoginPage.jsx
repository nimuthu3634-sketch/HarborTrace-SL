import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../features/auth/AuthContext';

export default function LoginPage() {
  const { user, signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  if (user) return <Navigate to="/" replace />;

  const onSubmit = async (event) => {
    event.preventDefault();
    setError('');
    try {
      await signIn(email, password);
    } catch {
      setError('Unable to sign in. Please verify credentials.');
    }
  };

  return (
    <section className="card narrow">
      <h2>Login</h2>
      <form onSubmit={onSubmit}>
        <label>
          Email
          <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required />
        </label>
        <label>
          Password
          <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" required />
        </label>
        <button type="submit">Sign in</button>
      </form>
      {error ? <p className="error">{error}</p> : null}
    </section>
  );
}
