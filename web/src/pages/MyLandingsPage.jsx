import { collection, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../features/auth/AuthContext';
import { db } from '../lib/firebase';

function badgeClass(status) {
  return `landing-status-badge landing-status-${status || 'pending'}`;
}

export default function MyLandingsPage() {
  const { role, user } = useAuth();
  const [landings, setLandings] = useState([]);

  useEffect(() => {
    if (!user?.uid) {
      return undefined;
    }

    const base = collection(db, 'landings');
    const landingsQuery = role === 'fisherman'
      ? query(base, where('fishermanUid', '==', user.uid), orderBy('createdAt', 'desc'))
      : query(base, orderBy('createdAt', 'desc'));

    return onSnapshot(landingsQuery, (snapshot) => {
      setLandings(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    });
  }, [role, user?.uid]);

  return (
    <section className="card">
      <h2>My Landings</h2>
      {role === 'fisherman' && (
        <Link to="/landings/new">+ Add Landing Intake</Link>
      )}

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Trip</th>
              <th>Fish Type</th>
              <th>Quantity</th>
              <th>Total Weight (kg)</th>
              <th>Harbor</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {landings.map((landing) => (
              <tr key={landing.id}>
                <td><Link to={`/landings/${landing.id}`}>{landing.tripId}</Link></td>
                <td>{landing.fishType}</td>
                <td>{landing.quantity}</td>
                <td>{landing.totalWeightKg}</td>
                <td>{landing.landingHarborId}</td>
                <td><span className={badgeClass(landing.verificationStatus)}>{landing.verificationStatus || 'pending'}</span></td>
              </tr>
            ))}
            {!landings.length && (
              <tr>
                <td colSpan={6}>No landing records found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
