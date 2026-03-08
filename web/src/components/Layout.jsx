import { Link } from 'react-router-dom';
import { useAuth } from '../features/auth/AuthContext';

const links = [
  ['/', 'Operations Dashboard'],
  ['/trips', 'Voyage Log'],
  ['/alerts', 'Incident Alerts'],
  ['/landings', 'Landing Intake'],
  ['/batches', 'Catch Batches'],
  ['/notices', 'Harbor Bulletins'],
  ['/vessels', 'Fleet Registry'],
  ['/harbors', 'Port Directory'],
  ['/audit', 'Compliance Audit'],
  ['/analytics', 'Performance Insights'],
  ['/about', 'About HarborTrace SL']
];

export default function Layout({ children }) {
  const { role, signOut } = useAuth();

  return (
    <div className="layout">
      <header>
        <h1>HarborTrace SL</h1>
        <p>Fisheries Role: {role || 'guest'}</p>
        <button onClick={signOut}>Sign out securely</button>
      </header>
      <nav>
        {links.map(([to, label]) => (
          <Link key={to} to={to}>
            {label}
          </Link>
        ))}
      </nav>
      <main>{children}</main>
    </div>
  );
}
