import { addDoc, collection, onSnapshot, orderBy, query, serverTimestamp } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { db } from '../../lib/firebase';
import { useAuth } from '../auth/AuthContext';

export default function TripsPanel() {
  const { user } = useAuth();
  const [trips, setTrips] = useState([]);

  useEffect(() => {
    const q = query(collection(db, 'trips'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snapshot) => setTrips(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))));
  }, []);

  const registerDeparture = async () => {
    await addDoc(collection(db, 'trips'), {
      fishermanUid: user.uid,
      status: 'active',
      harborId: 'default-harbor',
      departureAt: serverTimestamp(),
      expectedReturnAt: serverTimestamp(),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
  };

  return (
    <>
      <button onClick={registerDeparture}>Register Departure</button>
      <ul>
        {trips.slice(0, 8).map((trip) => (
          <li key={trip.id}>{trip.id} - {trip.status}</li>
        ))}
      </ul>
    </>
  );
}
