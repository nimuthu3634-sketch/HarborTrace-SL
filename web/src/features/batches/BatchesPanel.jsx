import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { db } from '../../lib/firebase';

export default function BatchesPanel() {
  const [batches, setBatches] = useState([]);

  useEffect(() => {
    const q = query(collection(db, 'fishBatches'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snapshot) => setBatches(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))));
  }, []);

  return (
    <>
      <p>Latest traceability batches (buyer-visible records only).</p>
      <ul>
        {batches.slice(0, 20).map((b) => (
          <li key={b.id}>
            {b.batchCode} | {b.fishType || '—'} | {b.totalWeightKg || 0}kg | {b.freshnessStatus || '—'}
            {b.verificationUrl ? <a href={b.verificationUrl} target="_blank" rel="noreferrer"> {' '}Verify</a> : null}
          </li>
        ))}
      </ul>
    </>
  );
}
