import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { useEffect, useState } from 'react';
import { db, functions } from '../../lib/firebase';

export default function BatchesPanel() {
  const [batches, setBatches] = useState([]);

  useEffect(() => {
    const q = query(collection(db, 'batches'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snapshot) => setBatches(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))));
  }, []);

  const generateBatch = async () => {
    const call = httpsCallable(functions, 'generateFishBatch');
    await call({
      landingId: 'demo-landing',
      species: 'Tuna',
      weightKg: 45,
      qualityGrade: 'A'
    });
  };

  return (
    <>
      <button onClick={generateBatch}>Generate Fish Batch</button>
      <ul>{batches.slice(0, 10).map((b) => <li key={b.id}>{b.batchCode} | {b.species} | {b.weightKg}kg</li>)}</ul>
    </>
  );
}
