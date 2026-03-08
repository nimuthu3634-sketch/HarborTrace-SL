import { doc, onSnapshot } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../features/auth/AuthContext';
import { db, functions } from '../lib/firebase';

const verifyLandingCallable = httpsCallable(functions, 'verifyLandingIntake');

function badgeClass(status) {
  return `landing-status-badge landing-status-${status || 'pending'}`;
}

export default function LandingDetailPage() {
  const { landingId } = useParams();
  const { role } = useAuth();
  const [landing, setLanding] = useState(null);
  const [error, setError] = useState('');
  const [working, setWorking] = useState(false);

  useEffect(() => {
    if (!landingId) {
      return undefined;
    }

    return onSnapshot(doc(db, 'landings', landingId), (snapshot) => {
      setLanding(snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null);
    });
  }, [landingId]);

  const verify = async (verificationStatus) => {
    setError('');
    setWorking(true);
    try {
      await verifyLandingCallable({ landingId, verificationStatus });
    } catch (verifyError) {
      setError(verifyError?.message || 'Failed to update verification status.');
    } finally {
      setWorking(false);
    }
  };

  if (!landing) {
    return <section className="card"><p>Landing record not found.</p></section>;
  }

  return (
    <section className="card">
      <h2>Landing Detail</h2>
      <div className="landing-detail-grid">
        <p><strong>Trip ID:</strong> {landing.tripId}</p>
        <p><strong>Fish Type:</strong> {landing.fishType}</p>
        <p><strong>Quantity:</strong> {landing.quantity}</p>
        <p><strong>Total Weight (kg):</strong> {landing.totalWeightKg}</p>
        <p><strong>Storage Method:</strong> {landing.storageMethod}</p>
        <p><strong>Condition Status:</strong> {landing.conditionStatus}</p>
        <p><strong>Landing Harbor ID:</strong> {landing.landingHarborId}</p>
        <p><strong>Landing Time:</strong> {landing.landingTime?.toDate ? landing.landingTime.toDate().toLocaleString() : '-'}</p>
        <p>
          <strong>Verification Status:</strong>{' '}
          <span className={badgeClass(landing.verificationStatus)}>{landing.verificationStatus || 'pending'}</span>
        </p>
      </div>

      {(role === 'harbor_officer' || role === 'admin') && (
        <div className="detail-actions">
          <button type="button" disabled={working} onClick={() => verify('verified')}>Mark Verified</button>
          <button type="button" className="secondary" disabled={working} onClick={() => verify('rejected')}>Mark Rejected</button>
        </div>
      )}

      {error && <p className="error">{error}</p>}
    </section>
  );
}
