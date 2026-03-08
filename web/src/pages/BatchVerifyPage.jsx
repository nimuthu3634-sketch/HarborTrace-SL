import { collection, getDocs, query, where } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { db } from '../lib/firebase';

export default function BatchVerifyPage() {
  const [batchCode, setBatchCode] = useState('');
  const [result, setResult] = useState(null);

  useEffect(() => {
    document.title = 'HarborTrace SL | Public Seafood Verification';
  }, []);

  const verifyBatch = async (event) => {
    event.preventDefault();
    const q = query(collection(db, 'batches'), where('batchCode', '==', batchCode));
    const snap = await getDocs(q);
    setResult(snap.empty ? null : snap.docs[0].data());
  };

  return (
    <section className="card narrow">
      <h2>Public Seafood Batch Verification</h2>
      <form onSubmit={verifyBatch}>
        <input value={batchCode} onChange={(e) => setBatchCode(e.target.value)} placeholder="Enter seafood batch code" required />
        <button type="submit">Check traceability</button>
      </form>
      {result ? <p>Verified Seafood Record: {result.species} - {result.weightKg}kg</p> : <p>No verified seafood batch found yet.</p>}
    </section>
  );
}
