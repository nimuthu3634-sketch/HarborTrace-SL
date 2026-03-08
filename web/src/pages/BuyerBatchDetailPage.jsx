import { doc, getDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { formatTimestamp } from '../features/trips/tripStatus';
import { db } from '../lib/firebase';

function cleanBatchCode(value) {
  return decodeURIComponent(String(value || '')).trim().toUpperCase();
}

export default function BuyerBatchDetailPage() {
  const { batchCode: routeBatchCode } = useParams();
  const [batch, setBatch] = useState(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    document.title = 'HarborTrace SL | Buyer Batch Details';
  }, []);

  useEffect(() => {
    const run = async () => {
      const code = cleanBatchCode(routeBatchCode);
      if (!code) {
        setBatch(null);
        setNotFound(true);
        return;
      }

      const snapshot = await getDoc(doc(db, 'batchPublicVerifications', code));
      if (!snapshot.exists()) {
        setBatch(null);
        setNotFound(true);
        return;
      }

      setBatch(snapshot.data());
      setNotFound(false);
    };

    run();
  }, [routeBatchCode]);

  return (
    <section className="card">
      <h2>Batch Verification Details</h2>
      <p>Buyer-safe traceability data for procurement validation.</p>

      {!batch && !notFound && <p className="state">Loading verification details…</p>}

      {batch && (
        <div className="landing-detail-grid" style={{ marginTop: '.85rem' }}>
          <p><strong>Batch Code:</strong> {batch.batchCode || cleanBatchCode(routeBatchCode)}</p>
          <p><strong>Fish Type:</strong> {batch.fishType || '—'}</p>
          <p><strong>Vessel:</strong> {batch.vessel || '—'}</p>
          <p><strong>Landing Harbor:</strong> {batch.landingHarbor || '—'}</p>
          <p><strong>Landing Time:</strong> {formatTimestamp(batch.landingTime)}</p>
          <p><strong>Storage Method:</strong> {batch.storageMethod || '—'}</p>
          <p><strong>Freshness Status:</strong> {batch.freshnessStatus || '—'}</p>
          <p><strong>Verification Status:</strong> {batch.verificationStatus || '—'}</p>
          <p><strong>Verified At:</strong> {formatTimestamp(batch.verifiedAt)}</p>
        </div>
      )}

      {notFound && <p className="state">No buyer-safe verification record was found for this batch code.</p>}

      <div className="detail-actions">
        <Link to="/batches">Back to buyer search</Link>
      </div>
    </section>
  );
}
