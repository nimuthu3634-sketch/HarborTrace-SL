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

export default function DashboardPage() {
  const { role, profile } = useAuth();
  const [recentTrips, setRecentTrips] = useState([]);

  useEffect(() => {
    document.title = 'HarborTrace SL | Fisheries Operations Dashboard';
  }, []);

  useEffect(() => {
    if (role !== 'harbor_officer' && role !== 'admin') {
      return undefined;
    }

    const tripsQuery = query(collection(db, 'trips'), orderBy('createdAt', 'desc'), limit(40));
    return onSnapshot(tripsQuery, (snapshot) => {
      setRecentTrips(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    });
  }, [role]);

  const overdueTrips = useMemo(
    () => recentTrips.filter((trip) => resolveVoyageStatus(trip) === 'overdue'),
    [recentTrips]
  );

  return (
    <section className="card">
      <h2>Fisheries Operations Dashboard</h2>
      <p>Welcome{profile?.displayName ? `, ${profile.displayName}` : ''}.</p>
      <p>{roleDescriptions[role] || 'No fisheries role assigned yet. Please contact the system administrator to activate your account.'}</p>

      {(role === 'harbor_officer' || role === 'admin') && (
        <section className="dashboard-alert-block">
          <h3>Overdue Voyages</h3>
          <p>Automatically flagged from expected return time.</p>
          <p>
            <strong>Total overdue in recent view:</strong>{' '}
            <span className={tripStatusClassName('overdue')}>{overdueTrips.length}</span>
          </p>
          {overdueTrips.length > 0 ? (
            <ul>
              {overdueTrips.slice(0, 8).map((trip) => (
                <li key={trip.id}>
                  <Link to={`/trips/${trip.id}`}>{trip.vesselId || trip.id}</Link> · Due {formatTimestamp(trip.expectedReturnTime)}
                </li>
              ))}
            </ul>
          ) : (
            <p>No overdue voyages in the most recent trips.</p>
          )}
        </section>
      )}
    </section>
  );
}
