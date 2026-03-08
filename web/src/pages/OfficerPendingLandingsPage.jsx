import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { db } from '../lib/firebase';
import { formatTimestamp } from '../features/trips/tripStatus';

export default function OfficerPendingLandingsPage() {
  const [landings, setLandings] = useState([]);

  useEffect(() => {
    const landingsQuery = query(collection(db, 'landings'), orderBy('createdAt', 'desc'));
    return onSnapshot(landingsQuery, (snapshot) => setLandings(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))));
  }, []);

  const pendingLandings = useMemo(
    () => landings.filter((landing) => String(landing.verificationStatus || 'pending') === 'pending'),
    [landings]
  );

  return (
    <section className="card">
      <h2>Pending Landing Verification</h2>
      <p>Landing declarations requiring officer verification review.</p>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Landing</th>
              <th>Trip</th>
              <th>Fisher</th>
              <th>Fish Type</th>
              <th>Weight (kg)</th>
              <th>Submitted</th>
            </tr>
          </thead>
          <tbody>
            {pendingLandings.map((landing) => (
              <tr key={landing.id}>
                <td><Link to={`/landings/${landing.id}`}>{landing.id}</Link></td>
                <td>{landing.tripId || '—'}</td>
                <td>{landing.fishermanUid || '—'}</td>
                <td>{landing.fishType || '—'}</td>
                <td>{landing.totalWeightKg || '—'}</td>
                <td>{formatTimestamp(landing.createdAt)}</td>
              </tr>
            ))}
            {!pendingLandings.length && (
              <tr>
                <td colSpan={6}>No pending landing verification records found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
