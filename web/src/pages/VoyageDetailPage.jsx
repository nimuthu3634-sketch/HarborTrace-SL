import { doc, onSnapshot } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { db, functions } from '../lib/firebase';
import { useAuth } from '../features/auth/AuthContext';
import { formatTimestamp, resolveVoyageStatus } from '../features/trips/tripStatus';

const transitionTripStatusCallable = httpsCallable(functions, 'transitionTripStatus');

export default function VoyageDetailPage() {
  const { tripId } = useParams();
  const { role, user } = useAuth();
  const [trip, setTrip] = useState(null);
  const [error, setError] = useState('');
  const [busyStatus, setBusyStatus] = useState('');

  useEffect(() => {
    if (!tripId) {
      return undefined;
    }
    return onSnapshot(doc(db, 'trips', tripId), (snap) => {
      setTrip(snap.exists() ? { id: snap.id, ...snap.data() } : null);
    });
  }, [tripId]);

  const statusOptions = useMemo(() => {
    if (!trip) {
      return [];
    }
    if (role === 'admin' || role === 'harbor_officer') {
      return ['planned', 'active', 'completed', 'overdue', 'emergency'];
    }
    if (trip.fishermanUid === user?.uid) {
      return ['active', 'completed', 'emergency'];
    }
    return [];
  }, [role, trip, user?.uid]);

  const updateStatus = async (status) => {
    setBusyStatus(status);
    setError('');
    try {
      await transitionTripStatusCallable({ tripId, status });
    } catch (statusError) {
      setError(statusError?.message || 'Unable to update status.');
    } finally {
      setBusyStatus('');
    }
  };

  if (!trip) {
    return (
      <section className="card">
        <h2>Voyage detail</h2>
        <p>Trip not found or you do not have access.</p>
      </section>
    );
  }

  return (
    <section className="card">
      <h2>Voyage Detail</h2>
      <p><Link to="/trips">← Back to voyage list</Link></p>
      <ul>
        <li><strong>Vessel:</strong> {trip.vesselId}</li>
        <li><strong>Departure Harbor:</strong> {trip.departureHarborId}</li>
        <li><strong>Destination Zone:</strong> {trip.destinationZone}</li>
        <li><strong>Crew Count:</strong> {trip.crewCount}</li>
        <li><strong>Departure Time:</strong> {formatTimestamp(trip.departureTime)}</li>
        <li><strong>Expected Return Time:</strong> {formatTimestamp(trip.expectedReturnTime)}</li>
        <li><strong>Emergency Contact:</strong> {trip.emergencyContact}</li>
        <li><strong>Status:</strong> {resolveVoyageStatus(trip)}</li>
        <li><strong>Notes:</strong> {trip.notes || '—'}</li>
      </ul>

      {!!statusOptions.length && (
        <div className="filter-row">
          {statusOptions.map((status) => (
            <button key={status} type="button" className="secondary" disabled={busyStatus === status} onClick={() => updateStatus(status)}>
              {busyStatus === status ? 'Updating…' : `Mark ${status}`}
            </button>
          ))}
        </div>
      )}
      {error && <p className="error">{error}</p>}
    </section>
  );
}
