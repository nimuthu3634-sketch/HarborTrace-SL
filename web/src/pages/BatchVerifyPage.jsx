import { doc, getDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { db } from '../lib/firebase';
import { formatTimestamp } from '../features/trips/tripStatus';

export default function BatchVerifyPage() {
  const { batchCode: routeBatchCode } = useParams();
  const [batchCode, setBatchCode] = useState('');
  const [result, setResult] = useState(null);
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    document.title = 'HarborTrace SL | Public Seafood Verification';
  }, []);

  useEffect(() => {
    if (!routeBatchCode) {
      return;
    }

    setBatchCode(routeBatchCode);
  }, [routeBatchCode]);

  const verifyBatch = async (event) => {
    event?.preventDefault?.();

    const code = String(batchCode || '').trim();
    if (!code) {
      setResult(null);
      setSearched(true);
      return;
    }

    const snap = await getDoc(doc(db, 'batchPublicVerifications', code));
    setResult(snap.exists() ? snap.data() : null);
    setSearched(true);
  };

  useEffect(() => {
    if (!routeBatchCode) {
      return;
    }

    const run = async () => {
      const snap = await getDoc(doc(db, 'batchPublicVerifications', routeBatchCode));
      setResult(snap.exists() ? snap.data() : null);
      setSearched(true);
    };

    run();
  }, [routeBatchCode]);

  return (
    <section className="card narrow">
      <h2>Public Seafood Batch Verification</h2>
      <form onSubmit={verifyBatch}>
        <input value={batchCode} onChange={(e) => setBatchCode(e.target.value)} placeholder="Enter seafood batch code" required />
        <button type="submit">Check traceability</button>
      </form>
      {result && (
        <div className="landing-detail-grid" style={{ marginTop: '.85rem' }}>
          <p><strong>Batch Code:</strong> {result.batchCode}</p>
          <p><strong>Fish Type:</strong> {result.fishType || '—'}</p>
          <p><strong>Vessel:</strong> {result.vessel || '—'}</p>
          <p><strong>Landing Harbor:</strong> {result.landingHarbor || '—'}</p>
          <p><strong>Landing Time:</strong> {formatTimestamp(result.landingTime)}</p>
          <p><strong>Storage Method:</strong> {result.storageMethod || '—'}</p>
          <p><strong>Freshness Status:</strong> {result.freshnessStatus || '—'}</p>
          <p><strong>Verification Status:</strong> {result.verificationStatus || '—'}</p>
        </div>
      )}
      {searched && !result && <p className="state">No verified seafood batch found yet.</p>}
    </section>
  );
}
