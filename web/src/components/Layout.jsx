import { Link } from 'react-router-dom';
import { useAuth } from '../features/auth/AuthContext';

const links = [
  ['/', 'Dashboard'],
  ['/trips', 'Trips'],
  ['/alerts', 'SOS Alerts'],
  ['/landings', 'Landings'],
  ['/batches', 'Batches'],
  ['/notices', 'Notices'],
  ['/vessels', 'Vessels'],
  ['/harbors', 'Harbors'],
  ['/audit', 'Audit'],
  ['/analytics', 'Analytics']
];

export default function Layout({ children }) {
  const { role, signOut } = useAuth();

  return (
    <div className="layout">
      <header>
        <h1>HarborTrace SL</h1>
        <p>Role: {role || 'guest'}</p>
        <button onClick={signOut}>Sign out</button>
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
