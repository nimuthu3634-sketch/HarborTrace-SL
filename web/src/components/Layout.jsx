import { NavLink } from 'react-router-dom';
import { useI18n } from '../i18n/I18nProvider';
import { useAuth } from '../features/auth/AuthContext';
import LanguageSwitcher from './LanguageSwitcher';

const links = [
  { to: '/', labelKey: 'nav.dashboard', roles: ['fisherman', 'harbor_officer', 'buyer', 'admin'] },
  { to: '/trips', labelKey: 'nav.voyages', roles: ['fisherman', 'admin'] },
  { to: '/alerts', labelKey: 'nav.alerts', roles: ['fisherman', 'harbor_officer', 'admin'] },
  { to: '/landings', labelKey: 'nav.landingIntake', roles: ['fisherman', 'harbor_officer', 'admin'] },
  { to: '/batches', labelKey: 'nav.batches', roles: ['buyer', 'harbor_officer', 'admin'] },
  { to: '/notices', labelKey: 'nav.notices', roles: ['fisherman', 'harbor_officer', 'buyer', 'admin'] },
  { to: '/vessels', labelKey: 'nav.vessels', roles: ['harbor_officer', 'admin'] },
  { to: '/harbors', labelKey: 'nav.harbors', roles: ['harbor_officer', 'admin'] },
  { to: '/audit', labelKey: 'nav.audit', roles: ['admin'] },
  { to: '/analytics', labelKey: 'nav.analytics', roles: ['admin'] },
  { to: '/about', labelKey: 'nav.about', roles: ['fisherman', 'harbor_officer', 'buyer', 'admin'] }
];

export default function Layout({ children }) {
  const { role, signOut, profile } = useAuth();
  const { t } = useI18n();
  const visibleLinks = links.filter((link) => !role || link.roles.includes(role));
  const roleLabel = t(`roles.${String(role || 'unassigned')}`);

  return (
    <div className="layout">
      <header className="app-header">
        <div>
          <p className="eyebrow">{t('platformTagline')}</p>
          <h1>{t('appName')}</h1>
        </div>
        <div className="header-meta">
          <LanguageSwitcher />
          <p>
            {t('signedInAs')} <strong>{profile?.displayName || t('genericUser')}</strong>
          </p>
          <span className="role-badge">{roleLabel}</span>
          <button onClick={signOut}>{t('signOut')}</button>
        </div>
      </header>
      <nav className="app-nav">
        {visibleLinks.map(({ to, labelKey }) => (
          <NavLink key={to} to={to} className={({ isActive }) => (isActive ? 'active' : '')}>
            {t(labelKey)}
          </NavLink>
        ))}
      </nav>
      <main>{children}</main>
    </div>
  );
}
