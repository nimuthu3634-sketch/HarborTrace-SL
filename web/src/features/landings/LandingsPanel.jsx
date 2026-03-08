import { addDoc, collection, onSnapshot, orderBy, query, serverTimestamp } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { useEffect, useState } from 'react';
import { db, functions } from '../../lib/firebase';

export default function LandingsPanel() {
  const [landings, setLandings] = useState([]);

  useEffect(() => {
    const q = query(collection(db, 'landings'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snapshot) => setLandings(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))));
  }, []);

  const submitLanding = async () => {
    await addDoc(collection(db, 'landings'), {
      status: 'submitted',
      harborId: 'default-harbor',
      totalWeightKg: 120,
      speciesItems: [{ species: 'Tuna', weightKg: 120 }],
      createdAt: serverTimestamp()
    });
  };

  const verifyLanding = async (landingId) => {
    const call = httpsCallable(functions, 'verifyLanding');
    await call({ landingId });
  };

  return (
    <>
      <button onClick={submitLanding}>Submit Landing Intake</button>
      <ul>
        {landings.slice(0, 8).map((landing) => (
          <li key={landing.id}>
            {landing.id} - {landing.status}
            <button onClick={() => verifyLanding(landing.id)}>Verify</button>
          </li>
        ))}
      </ul>
    </>
  );
}
