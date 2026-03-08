import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { useEffect, useMemo, useState } from 'react';
import { db, functions } from '../../lib/firebase';
import { useAuth } from '../auth/AuthContext';

const submitEmergencyAlertCallable = httpsCallable(functions, 'submitEmergencyAlert');
const updateEmergencyAlertStatusCallable = httpsCallable(functions, 'updateEmergencyAlertStatus');

const alertTypeOptions = [
  { value: 'medical', label: 'Medical emergency' },
  { value: 'collision', label: 'Collision risk' },
  { value: 'engine_failure', label: 'Engine failure' },
  { value: 'man_overboard', label: 'Man overboard' },
  { value: 'weather', label: 'Severe weather threat' },
  { value: 'other', label: 'Other incident' }
];

function formatTimestamp(value) {
  if (!value) {
    return '—';
  }

  const date = typeof value?.toDate === 'function' ? value.toDate() : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '—';
  }

  return date.toLocaleString();
}

export default function AlertsPanel() {
  const { user, role } = useAuth();
  const [alerts, setAlerts] = useState([]);
  const [activeTrips, setActiveTrips] = useState([]);
  const [form, setForm] = useState({
    alertType: alertTypeOptions[0].value,
    incidentMessage: '',
    lastKnownLocation: '',
    activeTripId: ''
  });
  const [state, setState] = useState({ loading: false, error: '', success: '' });

  useEffect(() => {
    if (!user?.uid) {
      return undefined;
    }

    const alertsQuery = role === 'fisherman'
      ? query(collection(db, 'emergencyAlerts'), where('fishermanUid', '==', user.uid))
      : query(collection(db, 'emergencyAlerts'));

    return onSnapshot(alertsQuery, (snapshot) => {
      const rows = snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
      rows.sort((a, b) => {
        const left = a.createdAt?.toMillis?.() || 0;
        const right = b.createdAt?.toMillis?.() || 0;
        return right - left;
      });
      setAlerts(rows);
    });
  }, [role, user?.uid]);

  useEffect(() => {
    if (!user?.uid || role !== 'fisherman') {
      setActiveTrips([]);
      return undefined;
    }

    const tripsQuery = query(
      collection(db, 'trips'),
      where('fishermanUid', '==', user.uid),
      where('status', '==', 'active')
    );

    return onSnapshot(tripsQuery, (snapshot) => {
      const rows = snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
      setActiveTrips(rows);
    });
  }, [role, user?.uid]);

  useEffect(() => {
    if (!form.activeTripId && activeTrips.length > 0) {
      setForm((previous) => ({ ...previous, activeTripId: activeTrips[0].id }));
    }
  }, [activeTrips, form.activeTripId]);

  const canSubmit = useMemo(
    () => role === 'fisherman' && !!form.activeTripId && !!form.incidentMessage.trim() && !!form.lastKnownLocation.trim(),
    [form.activeTripId, form.incidentMessage, form.lastKnownLocation, role]
  );

  const onChange = (event) => {
    const { name, value } = event.target;
    setForm((previous) => ({ ...previous, [name]: value }));
  };

  const submitAlert = async (event) => {
    event.preventDefault();
    setState({ loading: true, error: '', success: '' });

    try {
      await submitEmergencyAlertCallable({
        fishermanUid: user.uid,
        activeTripId: form.activeTripId,
        alertType: form.alertType,
        incidentMessage: form.incidentMessage.trim(),
        lastKnownLocation: form.lastKnownLocation.trim()
      });

      setForm((previous) => ({
        ...previous,
        incidentMessage: '',
        lastKnownLocation: ''
      }));
      setState({ loading: false, error: '', success: 'SOS alert submitted to harbor response team.' });
    } catch (error) {
      setState({ loading: false, error: error?.message || 'Failed to submit SOS alert.', success: '' });
    }
  };

  const updateStatus = async (alertId, status) => {
    try {
      await updateEmergencyAlertStatusCallable({ alertId, status });
    } catch (error) {
      setState({ loading: false, error: error?.message || 'Failed to update alert status.', success: '' });
    }
  };

  return (
    <section>
      <h3>SOS / Incident Alert</h3>
      {role === 'fisherman' && (
        <form onSubmit={submitAlert}>
          <label htmlFor="alertType">Alert type</label>
          <select id="alertType" name="alertType" value={form.alertType} onChange={onChange}>
            {alertTypeOptions.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>

          <label htmlFor="incidentMessage">Short incident message</label>
          <textarea
            id="incidentMessage"
            name="incidentMessage"
            rows={3}
            maxLength={240}
            placeholder="Describe what happened in one short message"
            value={form.incidentMessage}
            onChange={onChange}
            required
          />

          <label htmlFor="lastKnownLocation">Last known location</label>
          <input
            id="lastKnownLocation"
            name="lastKnownLocation"
            placeholder="Example: 6.932,79.857 or Galle outer reef"
            value={form.lastKnownLocation}
            onChange={onChange}
            required
          />

          <label htmlFor="activeTripId">Active trip reference</label>
          <select id="activeTripId" name="activeTripId" value={form.activeTripId} onChange={onChange} required>
            <option value="">Select active trip</option>
            {activeTrips.map((trip) => (
              <option key={trip.id} value={trip.id}>{trip.id} · {trip.vesselId || 'Unassigned vessel'}</option>
            ))}
          </select>

          <button type="submit" disabled={!canSubmit || state.loading}>Send SOS alert</button>
          {activeTrips.length === 0 && <p className="error">No active trips available. Start an active trip before sending an SOS.</p>}
          {state.error && <p className="error">{state.error}</p>}
          {state.success && <p>{state.success}</p>}
        </form>
      )}

      {(role === 'harbor_officer' || role === 'admin') && state.error && <p className="error">{state.error}</p>}

      <h3>Incident history</h3>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Alert</th>
              <th>Trip</th>
              <th>Type</th>
              <th>Message</th>
              <th>Location</th>
              <th>Status</th>
              <th>Created</th>
              {(role === 'harbor_officer' || role === 'admin') && <th>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {alerts.slice(0, 20).map((alert) => (
              <tr key={alert.id}>
                <td>{alert.id}</td>
                <td>{alert.activeTripId}</td>
                <td>{alert.alertType}</td>
                <td>{alert.incidentMessage}</td>
                <td>{alert.lastKnownLocation}</td>
                <td>{alert.status}</td>
                <td>{formatTimestamp(alert.createdAt)}</td>
                {(role === 'harbor_officer' || role === 'admin') && (
                  <td>
                    <button type="button" className="secondary" onClick={() => updateStatus(alert.id, 'acknowledged')} disabled={alert.status !== 'pending'}>
                      Acknowledge
                    </button>{' '}
                    <button type="button" className="secondary" onClick={() => updateStatus(alert.id, 'resolved')} disabled={alert.status === 'resolved'}>
                      Resolve
                    </button>
                  </td>
                )}
              </tr>
            ))}
            {alerts.length === 0 && (
              <tr>
                <td colSpan={role === 'harbor_officer' || role === 'admin' ? 8 : 7}>No incidents recorded yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
