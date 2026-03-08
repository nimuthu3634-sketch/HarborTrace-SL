import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import { useEffect, useMemo, useState } from 'react';
import { db } from '../lib/firebase';
import { formatTimestamp } from '../features/trips/tripStatus';

export default function OfficerPendingAlertsPage() {
  const [alerts, setAlerts] = useState([]);

  useEffect(() => {
    const alertsQuery = query(collection(db, 'emergencyAlerts'), orderBy('createdAt', 'desc'));
    return onSnapshot(alertsQuery, (snapshot) => setAlerts(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))));
  }, []);

  const pendingAlerts = useMemo(
    () => alerts.filter((alert) => String(alert.status || 'pending') === 'pending'),
    [alerts]
  );

  return (
    <section className="card">
      <h2>Pending Incident Alerts</h2>
      <p>Unresolved incident alerts waiting for harbor response action.</p>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Alert ID</th>
              <th>Trip</th>
              <th>Type</th>
              <th>Message</th>
              <th>Location</th>
              <th>Reported</th>
            </tr>
          </thead>
          <tbody>
            {pendingAlerts.map((alert) => (
              <tr key={alert.id}>
                <td>{alert.id}</td>
                <td>{alert.activeTripId || '—'}</td>
                <td>{alert.alertType || '—'}</td>
                <td>{alert.incidentMessage || '—'}</td>
                <td>{alert.lastKnownLocation || '—'}</td>
                <td>{formatTimestamp(alert.createdAt)}</td>
              </tr>
            ))}
            {!pendingAlerts.length && (
              <tr>
                <td colSpan={6}>No pending alerts found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
