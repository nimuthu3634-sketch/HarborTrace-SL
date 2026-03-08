import { collection, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../features/auth/AuthContext';
import { resolveVoyageStatus, voyageFilters, formatTimestamp, tripStatusClassName, tripRowClassName } from '../features/trips/tripStatus';
import { db } from '../lib/firebase';

export default function VoyageListPage() {
  const { user, role } = useAuth();
  const [trips, setTrips] = useState([]);
  const [statusFilter, setStatusFilter] = useState('active');

  useEffect(() => {
    if (!user?.uid) {
      return undefined;
    }

    const base = collection(db, 'trips');
    const tripsQuery = role === 'fisherman'
      ? query(base, where('fishermanUid', '==', user.uid), orderBy('createdAt', 'desc'))
      : query(base, orderBy('createdAt', 'desc'));

    return onSnapshot(tripsQuery, (snapshot) => {
      setTrips(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    });
  }, [role, user?.uid]);

  const filteredTrips = useMemo(
    () => trips.filter((trip) => resolveVoyageStatus(trip) === statusFilter),
    [statusFilter, trips]
  );

  return (
    <section className="card">
      <h2>Voyage List</h2>
      <p>Track planned departures, active trips, completed voyages, overdue returns, and emergency situations.</p>
      {role === 'fisherman' && <Link to="/trips/register">Register Departure</Link>}

      <div className="filter-row">
        {voyageFilters.map((filter) => (
          <button key={filter} type="button" className={filter === statusFilter ? 'secondary active' : 'secondary'} onClick={() => setStatusFilter(filter)}>
            {filter}
          </button>
        ))}
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Vessel</th>
              <th>Destination Zone</th>
              <th>Status</th>
              <th>Departure</th>
              <th>Expected Return</th>
              <th>Owner</th>
            </tr>
          </thead>
          <tbody>
            {filteredTrips.map((trip) => {
              const status = resolveVoyageStatus(trip);
              return (
                <tr key={trip.id} className={tripRowClassName(status)}>
                  <td><Link to={`/trips/${trip.id}`}>{trip.vesselId}</Link></td>
                  <td>{trip.destinationZone}</td>
                  <td><span className={tripStatusClassName(status)}>{status}</span></td>
                  <td>{formatTimestamp(trip.departureTime)}</td>
                  <td>{formatTimestamp(trip.expectedReturnTime)}</td>
                  <td>{trip.fishermanUid}</td>
                </tr>
              );
            })}
            {!filteredTrips.length && (
              <tr>
                <td colSpan={6}>No voyages found in this filter.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
