import { Link } from 'react-router-dom';
import { useAuth } from '../features/auth/AuthContext';

export default function UnauthorizedPage() {
  const { role, getDefaultRouteForRole } = useAuth();

  return (
    <section className="card narrow">
      <h2>Unauthorized access</h2>
      <p>Your account does not have permission to open this route.</p>
      <p>Current role: <strong>{role || 'unassigned'}</strong></p>
      <Link className="cta-link" to={getDefaultRouteForRole(role)}>Go to your role dashboard</Link>
    </section>
  );
}
