import {
  collection,
  getCountFromServer,
  limit,
  onSnapshot,
  orderBy,
  query,
  where
} from 'firebase/firestore';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../features/auth/AuthContext';
import { db } from '../lib/firebase';
import { formatTimestamp, resolveVoyageStatus, tripStatusClassName } from '../features/trips/tripStatus';

const roleDescriptions = {
  fisherman:
    'Start a voyage from your assigned harbor, monitor active trip status, submit landed catch details, and trigger emergency incident alerts when required.',
  harbor_officer:
    'Validate inbound vessel arrivals, verify landing declarations, issue operational harbor bulletins, and coordinate incident response actions.',
  buyer:
    'Review verified catch batches, validate traceability records, and confirm trusted seafood sourcing for procurement workflows.',
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
      <Link to={path} className="officer-widget-link">
        View details
      </Link>
    </article>
  );
}

function MiniBarChart({ title, data, emptyMessage }) {
  return (
    <article className="admin-chart-card">
      <h4>{title}</h4>
      {!data.length ? (
        <p className="admin-empty-note">{emptyMessage}</p>
      ) : (
        <ul className="admin-chart-list">
          {data.map((item) => (
            <li key={item.label}>
              <div className="admin-chart-label-row">
                <span>{item.label}</span>
                <strong>{item.value}</strong>
              </div>
              <div className="admin-bar-track">
                <div className="admin-bar-fill" style={{ width: `${item.percent}%` }} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}

export default function DashboardPage() {
  const { role, profile } = useAuth();
  const [trips, setTrips] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [landings, setLandings] = useState([]);
  const [notices, setNotices] = useState([]);
  const [adminCounts, setAdminCounts] = useState({
    totalUsers: 0,
    activeVoyages: 0,
    overdueVoyages: 0,
    pendingAlerts: 0,
    pendingLandings: 0,
    verifiedLandings: 0,
    totalFishBatches: 0
  });
  const [adminActivity, setAdminActivity] = useState({
    landings: [],
    alerts: [],
    voyages: [],
    audits: []
  });

  useEffect(() => {
    document.title = 'HarborTrace SL | Fisheries Operations Dashboard';
  }, []);

  useEffect(() => {
    if (!role) {
      return undefined;
    }

    const noticesQuery =
      role === 'harbor_officer' || role === 'admin'
        ? query(collection(db, 'notices'), orderBy('createdAt', 'desc'), limit(12))
        : query(collection(db, 'notices'), where('targetRole', 'in', [role, 'all']), orderBy('createdAt', 'desc'), limit(12));

    return onSnapshot(noticesQuery, (snapshot) =>
      setNotices(snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() })))
    );
  }, [role]);

  useEffect(() => {
    if (role !== 'harbor_officer' && role !== 'admin') {
      setTrips([]);
      setAlerts([]);
      setLandings([]);
      return undefined;
    }

    const tripsQuery = query(collection(db, 'trips'), orderBy('createdAt', 'desc'), limit(120));
    const alertsQuery = query(collection(db, 'emergencyAlerts'), orderBy('createdAt', 'desc'), limit(120));
    const landingsQuery = query(collection(db, 'landings'), orderBy('createdAt', 'desc'), limit(120));

    const unsubTrips = onSnapshot(tripsQuery, (snapshot) =>
      setTrips(snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() })))
    );
    const unsubAlerts = onSnapshot(alertsQuery, (snapshot) =>
      setAlerts(snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() })))
    );
    const unsubLandings = onSnapshot(landingsQuery, (snapshot) =>
      setLandings(snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() })))
    );

    return () => {
      unsubTrips();
      unsubAlerts();
      unsubLandings();
    };
  }, [role]);

  useEffect(() => {
    if (role !== 'admin') {
      return undefined;
    }

    let cancelled = false;
    const now = new Date();

    async function loadAdminCounts() {
      const [
        usersCountSnap,
        activeVoyagesSnap,
        overdueStatusSnap,
        overdueByTimeSnap,
        pendingAlertsSnap,
        pendingLandingsSnap,
        verifiedLandingsSnap,
        fishBatchCountSnap
      ] = await Promise.all([
        getCountFromServer(collection(db, 'users')),
        getCountFromServer(query(collection(db, 'trips'), where('status', '==', 'active'), where('expectedReturnTime', '>', now))),
        getCountFromServer(query(collection(db, 'trips'), where('status', '==', 'overdue'))),
        getCountFromServer(query(collection(db, 'trips'), where('status', '==', 'active'), where('expectedReturnTime', '<=', now))),
        getCountFromServer(query(collection(db, 'emergencyAlerts'), where('status', '==', 'pending'))),
        getCountFromServer(query(collection(db, 'landings'), where('verificationStatus', '==', 'pending'))),
        getCountFromServer(query(collection(db, 'landings'), where('verificationStatus', '==', 'verified'))),
        getCountFromServer(collection(db, 'fishBatches'))
      ]);

      if (cancelled) {
        return;
      }

      setAdminCounts({
        totalUsers: usersCountSnap.data().count,
        activeVoyages: activeVoyagesSnap.data().count,
        overdueVoyages: overdueStatusSnap.data().count + overdueByTimeSnap.data().count,
        pendingAlerts: pendingAlertsSnap.data().count,
        pendingLandings: pendingLandingsSnap.data().count,
        verifiedLandings: verifiedLandingsSnap.data().count,
        totalFishBatches: fishBatchCountSnap.data().count
      });
    }

    loadAdminCounts();

    const sixWeeksAgo = new Date();
    sixWeeksAgo.setDate(sixWeeksAgo.getDate() - 41);

    const unsubLandings = onSnapshot(
      query(collection(db, 'landings'), orderBy('createdAt', 'desc'), limit(240)),
      (snapshot) => {
        setAdminActivity((prev) => ({
          ...prev,
          landings: snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))
        }));
      }
    );

    const unsubAlerts = onSnapshot(
      query(collection(db, 'emergencyAlerts'), orderBy('createdAt', 'desc'), limit(240)),
      (snapshot) => {
        setAdminActivity((prev) => ({
          ...prev,
          alerts: snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))
        }));
      }
    );

    const unsubVoyages = onSnapshot(
      query(collection(db, 'trips'), where('createdAt', '>=', sixWeeksAgo), orderBy('createdAt', 'asc'), limit(300)),
      (snapshot) => {
        setAdminActivity((prev) => ({
          ...prev,
          voyages: snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))
        }));
      }
    );

    const unsubAudits = onSnapshot(
      query(collection(db, 'auditLogs'), orderBy('createdAt', 'desc'), limit(8)),
      (snapshot) => {
        setAdminActivity((prev) => ({
          ...prev,
          audits: snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))
        }));
      }
    );

    return () => {
      cancelled = true;
      unsubLandings();
      unsubAlerts();
      unsubVoyages();
      unsubAudits();
    };
  }, [role]);

  const activeVoyages = useMemo(() => trips.filter((trip) => resolveVoyageStatus(trip) === 'active'), [trips]);
  const overdueVoyages = useMemo(() => trips.filter((trip) => resolveVoyageStatus(trip) === 'overdue'), [trips]);
  const pendingAlerts = useMemo(() => alerts.filter((alert) => String(alert.status || 'pending') === 'pending'), [alerts]);
  const pendingLandingVerification = useMemo(
    () => landings.filter((landing) => String(landing.verificationStatus || 'pending') === 'pending'),
    [landings]
  );
  const recentLandings = useMemo(
    () =>
      [...landings]
        .sort((left, right) => (right.createdAt?.toMillis?.() || 0) - (left.createdAt?.toMillis?.() || 0))
        .slice(0, 6),
    [landings]
  );
  const recentNotices = useMemo(
    () => [...notices].sort((left, right) => noticeTimestamp(right) - noticeTimestamp(left)).slice(0, 6),
    [notices]
  );
  const urgentAlert = pendingAlerts.slice().sort((left, right) => alertTimestamp(right) - alertTimestamp(left))[0];

  const landingsByFishType = useMemo(() => {
    const counts = new Map();
    adminActivity.landings.forEach((landing) => {
      const fishType = String(landing.fishType || 'Unknown').trim() || 'Unknown';
      counts.set(fishType, (counts.get(fishType) || 0) + 1);
    });
    const max = Math.max(1, ...counts.values());
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([label, value]) => ({ label, value, percent: Math.round((value / max) * 100) }));
  }, [adminActivity.landings]);

  const weeklyVoyageActivity = useMemo(() => {
    const weekCounts = new Map();
    adminActivity.voyages.forEach((trip) => {
      const createdDate = trip.createdAt?.toDate?.();
      if (!(createdDate instanceof Date)) {
        return;
      }
      const weekStart = new Date(createdDate);
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      weekStart.setHours(0, 0, 0, 0);
      const key = weekStart.toISOString().slice(0, 10);
      weekCounts.set(key, (weekCounts.get(key) || 0) + 1);
    });

    const ordered = [...weekCounts.entries()].sort((a, b) => a[0].localeCompare(b[0])).slice(-6);
    const max = Math.max(1, ...ordered.map((entry) => entry[1]));

    return ordered.map(([key, value]) => {
      const date = new Date(`${key}T00:00:00`);
      return {
        label: `Week of ${date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`,
        value,
        percent: Math.round((value / max) * 100)
      };
    });
  }, [adminActivity.voyages]);

  const alertsByStatus = useMemo(() => {
    const statusCounts = new Map();
    adminActivity.alerts.forEach((alert) => {
      const status = String(alert.status || 'pending');
      statusCounts.set(status, (statusCounts.get(status) || 0) + 1);
    });
    const max = Math.max(1, ...statusCounts.values());
    return [...statusCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([label, value]) => ({ label, value, percent: Math.round((value / max) * 100) }));
  }, [adminActivity.alerts]);

  const landingStatusSplit = useMemo(() => {
    const pending = adminCounts.pendingLandings;
    const verified = adminCounts.verifiedLandings;
    const total = Math.max(1, pending + verified);
    return [
      { label: 'Verified', value: verified, percent: Math.round((verified / total) * 100) },
      { label: 'Pending', value: pending, percent: Math.round((pending / total) * 100) }
    ];
  }, [adminCounts.pendingLandings, adminCounts.verifiedLandings]);

  if (role === 'admin') {
    return (
      <section className="card officer-dashboard admin-dashboard">
        <div className="officer-dashboard-heading">
          <div>
            <h2>Executive Admin Dashboard</h2>
            <p>
              Welcome{profile?.displayName ? `, ${profile.displayName}` : ''}. Track operations health, verification throughput, and
              compliance activity in one view.
            </p>
          </div>
        </div>

        <section className="officer-widget-grid admin-widget-grid">
          {widgetCard('Total users', adminCounts.totalUsers, 'Registered users across all roles.', '/audit')}
          {widgetCard('Active voyages', adminCounts.activeVoyages, 'Current trips still within expected return time.', '/officer/trips/active')}
          {widgetCard('Overdue voyages', adminCounts.overdueVoyages, 'Trips requiring officer follow-up.', '/officer/trips/overdue')}
          {widgetCard('Pending alerts', adminCounts.pendingAlerts, 'Incident alerts waiting for resolution.', '/officer/alerts/pending')}
          {widgetCard('Pending landings', adminCounts.pendingLandings, 'Landing declarations awaiting verification.', '/officer/landings/pending-verification')}
          {widgetCard('Verified landings', adminCounts.verifiedLandings, 'Landings approved by officers/admins.', '/landings')}
          {widgetCard('Total fish batches', adminCounts.totalFishBatches, 'Traceability batches generated post-verification.', '/batches')}
        </section>

        <section className="admin-analytics-grid">
          <MiniBarChart
            title="Landings by fish type"
            data={landingsByFishType}
            emptyMessage="No landing intake data available yet."
          />
          <MiniBarChart
            title="Weekly voyage activity"
            data={weeklyVoyageActivity}
            emptyMessage="Not enough voyage data for weekly trending yet."
          />
          <MiniBarChart
            title="Alerts by status"
            data={alertsByStatus}
            emptyMessage="No alert status activity available yet."
          />
          <MiniBarChart
            title="Verified vs pending landings"
            data={landingStatusSplit}
            emptyMessage="No landing verification data available yet."
          />
        </section>

        <section className="dashboard-alert-block">
          <div className="officer-section-header">
            <h3>Recent audit activity</h3>
            <Link to="/audit">Open full compliance log</Link>
          </div>
          <ul className="officer-notice-list">
            {adminActivity.audits.map((entry) => (
              <li key={entry.id}>
                <strong>{entry.action || 'audit_event'}</strong>
                <span>{formatTimestamp(entry.createdAt)}</span>
              </li>
            ))}
            {!adminActivity.audits.length && <li>No recent audit events recorded.</li>}
          </ul>
        </section>
      </section>
    );
  }

  if (role !== 'harbor_officer') {
    return (
      <section className="card">
        <h2>Fisheries Operations Dashboard</h2>
        <p>
          Welcome{profile?.displayName ? `, ${profile.displayName}` : ''}.
        </p>
        <p>{roleDescriptions[role] || 'No fisheries role assigned yet. Please contact the system administrator to activate your account.'}</p>
        {role === 'buyer' && (
          <p>
            Start with the <Link to="/batches">Buyer Batch Verification</Link> page to search by batch code and review buyer-safe
            traceability details.
          </p>
        )}

        <div className="dashboard-alert-block">
          <div className="officer-section-header">
            <h3>Targeted notices</h3>
            <Link to="/notices">View all notices</Link>
          </div>
          <ul className="officer-notice-list">
            {recentNotices.map((notice) => (
              <li key={notice.id}>
                <strong>
                  <Link to={`/notices/${notice.id}`}>{notice.title || 'Untitled notice'}</Link>
                </strong>
                <span>{formatTimestamp(notice.createdAt)}</span>
              </li>
            ))}
            {!recentNotices.length && <li>No notices targeted to your role right now.</li>}
          </ul>
        </div>
      </section>
    );
  }

  return (
    <section className="card officer-dashboard">
      <div className="officer-dashboard-heading">
        <div>
          <h2>Harbor Officer Command Dashboard</h2>
          <p>
            Welcome{profile?.displayName ? `, ${profile.displayName}` : ''}. Review live voyage status, unresolved incidents, and
            landing verification queue.
          </p>
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
        {widgetCard(
          'Pending landings for verification',
          pendingLandingVerification.length,
          'Landing declarations awaiting review.',
          '/officer/landings/pending-verification'
        )}
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
                    <td>
                      <Link to={`/landings/${landing.id}`}>{landing.tripId || landing.id}</Link>
                    </td>
                    <td>{landing.fishermanUid || '—'}</td>
                    <td>{landing.totalWeightKg || '—'}</td>
                    <td>
                      <span className={`landing-status-badge landing-status-${landing.verificationStatus || 'pending'}`}>
                        {landing.verificationStatus || 'pending'}
                      </span>
                    </td>
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
                <strong>
                  <Link to={`/notices/${notice.id}`}>{notice.title || 'Untitled notice'}</Link>
                </strong>
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
                <Link to={`/trips/${trip.id}`}>{trip.vesselId || trip.id}</Link> · Due{' '}
                <span className={tripStatusClassName('overdue')}>{formatTimestamp(trip.expectedReturnTime)}</span>
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
