import { NavLink } from 'react-router-dom';
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
  const roleLabel = String(role || 'unassigned').replace('_', ' ');

  return (
    <div className="layout">
      <header className="app-header">
        <div>
          <p className="eyebrow">Maritime catch traceability platform</p>
          <h1>HarborTrace SL</h1>
        </div>
        <div className="header-meta">
          <p>
            Signed in as <strong>{profile?.displayName || 'User'}</strong>
          </p>
          <span className="role-badge">{roleLabel}</span>
          <button onClick={signOut}>Sign out securely</button>
        </div>
      </header>
      <nav className="app-nav">
        {visibleLinks.map(({ to, label }) => (
          <NavLink key={to} to={to} className={({ isActive }) => (isActive ? 'active' : '')}>
            {label}
          </NavLink>
        ))}
      </nav>
      <main>{children}</main>
    </div>
  );
}
