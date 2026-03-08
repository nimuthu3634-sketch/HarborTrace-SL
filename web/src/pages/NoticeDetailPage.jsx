import { doc, getDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { db } from '../lib/firebase';
import { formatTimestamp } from '../features/trips/tripStatus';

export default function NoticeDetailPage() {
  const { noticeId } = useParams();
  const [notice, setNotice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    async function loadNotice() {
      try {
        const snapshot = await getDoc(doc(db, 'notices', noticeId));
        if (!snapshot.exists()) {
          throw new Error('Notice not found.');
        }

        if (active) {
          setNotice({ id: snapshot.id, ...snapshot.data() });
          setLoading(false);
        }
      } catch (loadError) {
        if (active) {
          setLoading(false);
          setError(loadError?.message || 'Failed to load notice.');
        }
      }
    }

    loadNotice();
    return () => {
      active = false;
    };
  }, [noticeId]);

  if (loading) {
    return <section className="card"><p className="state">Loading notice…</p></section>;
  }

  if (error) {
    return (
      <section className="card">
        <p className="error">{error}</p>
        <Link to="/notices">Back to notices</Link>
      </section>
    );
  }

  return (
    <section className="card">
      <h2>{notice.title || 'Untitled notice'}</h2>
      <p><strong>Severity:</strong> {notice.severity || 'info'}</p>
      <p><strong>Audience:</strong> {notice.targetRole || 'all'}</p>
      <p><strong>Created by:</strong> {notice.createdByName || notice.createdBy || '—'}</p>
      <p><strong>Created at:</strong> {formatTimestamp(notice.createdAt)}</p>
      <article>
        <p>{notice.body || 'No message body.'}</p>
      </article>
      <Link to="/notices">Back to notices</Link>
    </section>
  );
}
