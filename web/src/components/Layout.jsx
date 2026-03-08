import { Link } from 'react-router-dom';
import { useAuth } from '../features/auth/AuthContext';

const links = [
  { to: '/', label: 'Operations Dashboard', roles: ['fisherman', 'harbor_officer', 'buyer', 'admin'] },
  { to: '/trips', label: 'Voyage Log', roles: ['fisherman', 'admin'] },
  { to: '/alerts', label: 'Incident Alerts', roles: ['fisherman', 'harbor_officer', 'admin'] },
  { to: '/landings', label: 'Landing Intake', roles: ['fisherman', 'harbor_officer', 'admin'] },
  { to: '/batches', label: 'Catch Batches', roles: ['buyer', 'harbor_officer', 'admin'] },
  { to: '/notices', label: 'Harbor Bulletins', roles: ['fisherman', 'harbor_officer', 'buyer', 'admin'] },
  { to: '/vessels', label: 'Fleet Registry', roles: ['harbor_officer', 'admin'] },
  { to: '/harbors', label: 'Port Directory', roles: ['harbor_officer', 'admin'] },
  { to: '/audit', label: 'Compliance Audit', roles: ['admin'] },
  { to: '/analytics', label: 'Performance Insights', roles: ['admin'] },
  { to: '/about', label: 'About HarborTrace SL', roles: ['fisherman', 'harbor_officer', 'buyer', 'admin'] }
];

export default function Layout({ children }) {
  const { role, signOut, profile } = useAuth();
  const visibleLinks = links.filter((link) => !role || link.roles.includes(role));

  return (
    <div className="layout">
      <header>
        <h1>HarborTrace SL</h1>
        <p>
          Signed in as <strong>{profile?.displayName || 'User'}</strong> · Role: <strong>{role || 'unassigned'}</strong>
        </p>
        <button onClick={signOut}>Sign out securely</button>
      </header>
      <nav>
        {visibleLinks.map(({ to, label }) => (
          <Link key={to} to={to}>
            {label}
          </Link>
        ))}
      </nav>
      <main>{children}</main>
    </div>
  );
}
