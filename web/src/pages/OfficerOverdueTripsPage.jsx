import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { formatTimestamp, resolveVoyageStatus, tripStatusClassName, tripRowClassName } from '../features/trips/tripStatus';
import { db } from '../lib/firebase';

export default function OfficerOverdueTripsPage() {
  const [trips, setTrips] = useState([]);

  useEffect(() => {
    const tripsQuery = query(collection(db, 'trips'), orderBy('createdAt', 'desc'));
    return onSnapshot(tripsQuery, (snapshot) => setTrips(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))));
  }, []);

  const overdueTrips = useMemo(
    () => trips.filter((trip) => resolveVoyageStatus(trip) === 'overdue'),
    [trips]
  );

  return (
    <section className="card">
      <h2>Overdue Trips</h2>
      <p>Voyages that exceeded expected return time and may require intervention.</p>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Vessel</th>
              <th>Trip</th>
              <th>Destination Zone</th>
              <th>Status</th>
              <th>Departure</th>
              <th>Expected Return</th>
            </tr>
          </thead>
          <tbody>
            {overdueTrips.map((trip) => {
              const status = resolveVoyageStatus(trip);
              return (
                <tr key={trip.id} className={tripRowClassName(status)}>
                  <td>{trip.vesselId || '—'}</td>
                  <td><Link to={`/trips/${trip.id}`}>{trip.id}</Link></td>
                  <td>{trip.destinationZone || '—'}</td>
                  <td><span className={tripStatusClassName(status)}>{status}</span></td>
                  <td>{formatTimestamp(trip.departureTime)}</td>
                  <td>{formatTimestamp(trip.expectedReturnTime)}</td>
                </tr>
              );
            })}
            {!overdueTrips.length && (
              <tr>
                <td colSpan={6}>No overdue trips found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
