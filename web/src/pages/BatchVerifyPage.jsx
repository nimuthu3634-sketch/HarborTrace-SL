import { collection, getDocs, query, where } from 'firebase/firestore';
import { useState } from 'react';
import { db } from '../lib/firebase';

export default function BatchVerifyPage() {
  const [batchCode, setBatchCode] = useState('');
  const [result, setResult] = useState(null);

  const verify = async (event) => {
    event.preventDefault();
    const q = query(collection(db, 'batches'), where('batchCode', '==', batchCode));
    const snap = await getDocs(q);
    setResult(snap.empty ? null : snap.docs[0].data());
  };

  return (
    <section className="card narrow">
      <h2>Public Batch Verification</h2>
      <form onSubmit={verify}>
        <input value={batchCode} onChange={(e) => setBatchCode(e.target.value)} placeholder="Enter batch code" required />
        <button type="submit">Verify</button>
      </form>
      {result ? <p>Verified: {result.species} - {result.weightKg}kg</p> : <p>No match yet.</p>}
    </section>
  );
}
