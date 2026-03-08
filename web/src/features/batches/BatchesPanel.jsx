import { collection, doc, getDoc, limit, onSnapshot, query } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { formatTimestamp } from '../trips/tripStatus';
import { db } from '../../lib/firebase';

function normalizeBatchCode(value) {
  return String(value || '').trim().toUpperCase();
}

export default function BatchesPanel() {
  const [batchCode, setBatchCode] = useState('');
  const [searchedCode, setSearchedCode] = useState('');
  const [searchResult, setSearchResult] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [recentBatches, setRecentBatches] = useState([]);

  useEffect(() => {
    const recentQuery = query(collection(db, 'batchPublicVerifications'), limit(12));
    return onSnapshot(recentQuery, (snapshot) => {
      setRecentBatches(snapshot.docs.map((batch) => ({ id: batch.id, ...batch.data() })));
    });
  }, []);

  const onSearch = async (event) => {
    event.preventDefault();
    const normalized = normalizeBatchCode(batchCode);
    setSearchedCode(normalized);

    if (!normalized) {
      setSearchResult(null);
      return;
    }

    setIsSearching(true);
    const snapshot = await getDoc(doc(db, 'batchPublicVerifications', normalized));
    setSearchResult(snapshot.exists() ? snapshot.data() : null);
    setIsSearching(false);
  };

  const recentRows = recentBatches
    .slice()
    .sort((left, right) => (right.verifiedAt?.toMillis?.() || 0) - (left.verifiedAt?.toMillis?.() || 0));

  return (
    <section className="buyer-verify-page">
      <div className="buyer-search-card">
        <h3>Buyer Batch Verification</h3>
        <p>Enter a batch code to validate safe traceability details before purchase.</p>

        <form onSubmit={onSearch} className="buyer-search-form">
          <label htmlFor="buyer-batch-code">Batch code</label>
          <div className="buyer-search-row">
            <input
              id="buyer-batch-code"
              value={batchCode}
              onChange={(event) => setBatchCode(normalizeBatchCode(event.target.value))}
              placeholder="e.g. SL-NEG-2026-00041"
              autoComplete="off"
            />
            <button type="submit" disabled={isSearching}>
              {isSearching ? 'Checking…' : 'Search'}
            </button>
          </div>
          <p className="buyer-helper-text">
            QR scan integration hook is prepared. Use this input as the target for scanner output in a future release.
          </p>
        </form>

        {searchedCode && (
          <div className="buyer-search-result">
            {searchResult ? (
              <>
                <p><strong>Verified batch found:</strong> {searchResult.batchCode || searchedCode}</p>
                <p>
                  <Link to={`/batches/verify/${encodeURIComponent(searchResult.batchCode || searchedCode)}`}>
                    Open full verification details
                  </Link>
                </p>
              </>
            ) : (
              <p>No buyer-safe verification record found for <strong>{searchedCode}</strong>.</p>
            )}
          </div>
        )}
      </div>

      <div className="buyer-search-card">
        <h3>Recent verified batches</h3>
        <p>Only buyer-safe verification fields are displayed.</p>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Batch code</th>
                <th>Fish type</th>
                <th>Harbor</th>
                <th>Verified</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {recentRows.map((batch) => (
                <tr key={batch.id}>
                  <td>{batch.batchCode || batch.id}</td>
                  <td>{batch.fishType || '—'}</td>
                  <td>{batch.landingHarbor || '—'}</td>
                  <td>{formatTimestamp(batch.verifiedAt || batch.landingTime)}</td>
                  <td>
                    <Link to={`/batches/verify/${encodeURIComponent(batch.batchCode || batch.id)}`}>View</Link>
                  </td>
                </tr>
              ))}
              {!recentRows.length && (
                <tr>
                  <td colSpan={5}>No verified buyer batches are available yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
