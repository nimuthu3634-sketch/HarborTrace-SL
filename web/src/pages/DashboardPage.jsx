import { collection, limit, onSnapshot, orderBy, query } from 'firebase/firestore';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../features/auth/AuthContext';
import { db } from '../lib/firebase';
import { formatTimestamp, resolveVoyageStatus, tripStatusClassName } from '../features/trips/tripStatus';

const roleDescriptions = {
  fisherman: 'Start a voyage from your assigned harbor, monitor active trip status, submit landed catch details, and trigger emergency incident alerts when required.',
  harbor_officer: 'Validate inbound vessel arrivals, verify landing declarations, issue operational harbor bulletins, and coordinate incident response actions.',
  buyer: 'Review verified catch batches, validate traceability records, and confirm trusted seafood sourcing for procurement workflows.',
  admin: 'Oversee ports, vessels, users, compliance controls, system analytics, and complete fisheries audit visibility.'
};

function noticeTimestamp(notice) {
  return notice.createdAt?.toMillis?.() || 0;
}

function alertTimestamp(alert) {
  return alert.createdAt?.toMillis?.() || 0;
}

function widgetCard(title, value, detail, path) {
  return (
    <article className="officer-widget-card" key={title}>
      <p className="officer-widget-title">{title}</p>
      <p className="officer-widget-value">{value}</p>
      <p className="officer-widget-detail">{detail}</p>
      <Link to={path} className="officer-widget-link">View details</Link>
    </article>
  );
}

export default function DashboardPage() {
  const { role, profile } = useAuth();
  const [trips, setTrips] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [landings, setLandings] = useState([]);
  const [notices, setNotices] = useState([]);

  useEffect(() => {
    document.title = 'HarborTrace SL | Fisheries Operations Dashboard';
  }, []);

  useEffect(() => {
    if (role !== 'harbor_officer' && role !== 'admin') {
      return undefined;
    }

    const tripsQuery = query(collection(db, 'trips'), orderBy('createdAt', 'desc'), limit(120));
    const alertsQuery = query(collection(db, 'emergencyAlerts'), orderBy('createdAt', 'desc'), limit(120));
    const landingsQuery = query(collection(db, 'landings'), orderBy('createdAt', 'desc'), limit(120));
    const noticesQuery = query(collection(db, 'notices'), orderBy('createdAt', 'desc'), limit(12));

    const unsubTrips = onSnapshot(tripsQuery, (snapshot) => setTrips(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))));
    const unsubAlerts = onSnapshot(alertsQuery, (snapshot) => setAlerts(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))));
    const unsubLandings = onSnapshot(landingsQuery, (snapshot) => setLandings(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))));
    const unsubNotices = onSnapshot(noticesQuery, (snapshot) => setNotices(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))));

    return () => {
      unsubTrips();
      unsubAlerts();
      unsubLandings();
      unsubNotices();
    };
  }, [role]);

  const activeVoyages = useMemo(
    () => trips.filter((trip) => resolveVoyageStatus(trip) === 'active'),
    [trips]
  );

  const overdueVoyages = useMemo(
    () => trips.filter((trip) => resolveVoyageStatus(trip) === 'overdue'),
    [trips]
  );

  const pendingAlerts = useMemo(
    () => alerts.filter((alert) => String(alert.status || 'pending') === 'pending'),
    [alerts]
  );

  const pendingLandingVerification = useMemo(
    () => landings.filter((landing) => String(landing.verificationStatus || 'pending') === 'pending'),
    [landings]
  );

  const recentLandings = useMemo(
    () => [...landings].sort((left, right) => (right.createdAt?.toMillis?.() || 0) - (left.createdAt?.toMillis?.() || 0)).slice(0, 6),
    [landings]
  );

  const recentNotices = useMemo(
    () => [...notices].sort((left, right) => noticeTimestamp(right) - noticeTimestamp(left)).slice(0, 6),
    [notices]
  );

  const urgentAlert = pendingAlerts.slice().sort((left, right) => alertTimestamp(right) - alertTimestamp(left))[0];

  if (role !== 'harbor_officer' && role !== 'admin') {
    return (
      <section className="card">
        <h2>Fisheries Operations Dashboard</h2>
        <p>Welcome{profile?.displayName ? `, ${profile.displayName}` : ''}.</p>
        <p>{roleDescriptions[role] || 'No fisheries role assigned yet. Please contact the system administrator to activate your account.'}</p>
        {role === 'buyer' && (
          <p>
            Start with the <Link to="/batches">Buyer Batch Verification</Link> page to search by batch code and review buyer-safe traceability details.
          </p>
        )}
      </section>
    );
  }

  return (
    <section className="card officer-dashboard">
      <div className="officer-dashboard-heading">
        <div>
          <h2>Harbor Officer Command Dashboard</h2>
          <p>Welcome{profile?.displayName ? `, ${profile.displayName}` : ''}. Review live voyage status, unresolved incidents, and landing verification queue.</p>
        </div>
        {urgentAlert && (
          <aside className="officer-urgent-banner">
            <strong>Pending incident:</strong> {urgentAlert.alertType || 'incident'} · {urgentAlert.activeTripId || urgentAlert.id}
          </aside>
        )}
      </div>

      <section className="officer-widget-grid">
        {widgetCard('Active voyages', activeVoyages.length, 'Trips currently at sea.', '/officer/trips/active')}
        {widgetCard('Overdue voyages', overdueVoyages.length, 'Trips past expected return.', '/officer/trips/overdue')}
        {widgetCard('Pending incident alerts', pendingAlerts.length, 'SOS alerts requiring action.', '/officer/alerts/pending')}
        {widgetCard('Pending landings for verification', pendingLandingVerification.length, 'Landing declarations awaiting review.', '/officer/landings/pending-verification')}
      </section>

      <section className="officer-dashboard-columns">
        <article>
          <div className="officer-section-header">
            <h3>Recent landings</h3>
            <Link to="/officer/landings/pending-verification">Go to verification queue</Link>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Trip</th>
                  <th>Fisher</th>
                  <th>Weight (kg)</th>
                  <th>Status</th>
                  <th>Submitted</th>
                </tr>
              </thead>
              <tbody>
                {recentLandings.map((landing) => (
                  <tr key={landing.id}>
                    <td><Link to={`/landings/${landing.id}`}>{landing.tripId || landing.id}</Link></td>
                    <td>{landing.fishermanUid || '—'}</td>
                    <td>{landing.totalWeightKg || '—'}</td>
                    <td><span className={`landing-status-badge landing-status-${landing.verificationStatus || 'pending'}`}>{landing.verificationStatus || 'pending'}</span></td>
                    <td>{formatTimestamp(landing.createdAt)}</td>
                  </tr>
                ))}
                {!recentLandings.length && (
                  <tr>
                    <td colSpan={5}>No landing submissions found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </article>

        <article>
          <div className="officer-section-header">
            <h3>Operational notices</h3>
            <Link to="/notices">Manage notices</Link>
          </div>
          <ul className="officer-notice-list">
            {recentNotices.map((notice) => (
              <li key={notice.id}>
                <strong>{notice.title || 'Untitled notice'}</strong>
                <span>{formatTimestamp(notice.createdAt)}</span>
              </li>
            ))}
            {!recentNotices.length && <li>No operational notices published yet.</li>}
          </ul>
        </article>
      </section>

      <section className="dashboard-alert-block">
        <h3>Overdue voyage quick list</h3>
        {overdueVoyages.length > 0 ? (
          <ul>
            {overdueVoyages.slice(0, 8).map((trip) => (
              <li key={trip.id}>
                <Link to={`/trips/${trip.id}`}>{trip.vesselId || trip.id}</Link> · Due <span className={tripStatusClassName('overdue')}>{formatTimestamp(trip.expectedReturnTime)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p>No overdue voyages in the monitored feed.</p>
        )}
      </section>
    </section>
  );
}
