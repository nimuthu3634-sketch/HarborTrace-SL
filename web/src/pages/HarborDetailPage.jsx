import { doc, onSnapshot } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../features/auth/AuthContext';
import { db, functions } from '../lib/firebase';
import { formatTimestamp } from '../features/trips/tripStatus';

const updateHarborCallable = httpsCallable(functions, 'updateHarbor');

export default function HarborDetailPage() {
  const { harborId = '' } = useParams();
  const { role } = useAuth();
  const canManageHarbor = role === 'admin';
  const [harbor, setHarbor] = useState(null);
  const [draft, setDraft] = useState(null);
  const [state, setState] = useState({ loading: false, error: '', success: '' });

  useEffect(() => {
    if (!harborId) {
      return undefined;
    }

    return onSnapshot(doc(db, 'harbors', harborId), (snapshot) => {
      if (!snapshot.exists()) {
        setHarbor(null);
        setDraft(null);
        return;
      }

      const data = { id: snapshot.id, ...snapshot.data() };
      setHarbor(data);
      setDraft((previous) => previous ?? {
        name: data.name || '',
        district: data.district || '',
        locationDescription: data.locationDescription || ''
      });
    });
  }, [harborId]);

  const detailRows = useMemo(() => {
    if (!harbor) {
      return [];
    }

    return [
      ['Name', harbor.name],
      ['District', harbor.district],
      ['Location Description', harbor.locationDescription],
      ['Created At', formatTimestamp(harbor.createdAt)],
      ['Updated At', formatTimestamp(harbor.updatedAt)]
    ];
  }, [harbor]);

  const onChange = (event) => {
    const { name, value } = event.target;
    setDraft((previous) => ({ ...previous, [name]: value }));
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    if (!draft || !canManageHarbor) {
      return;
    }

    setState({ loading: true, error: '', success: '' });

    try {
      await updateHarborCallable({
        harborId,
        name: draft.name.trim(),
        district: draft.district.trim(),
        locationDescription: draft.locationDescription.trim()
      });
      setState({ loading: false, error: '', success: 'Harbor updated successfully.' });
    } catch (error) {
      setState({ loading: false, error: error?.message || 'Failed to update harbor.', success: '' });
    }
  };

  if (!harbor) {
    return (
      <section className="card">
        <h2>Harbor Detail</h2>
        <p>Harbor not found.</p>
        <Link to="/harbors">Back to harbors</Link>
      </section>
    );
  }

  return (
    <section className="card">
      <h2>Harbor Detail</h2>
      <p>Review harbor profile information and update operational details.</p>
      <Link to="/harbors">← Back to harbors</Link>

      <ul>
        {detailRows.map(([label, value]) => (
          <li key={label}><strong>{label}:</strong> {value || '—'}</li>
        ))}
      </ul>

      {canManageHarbor ? (
        <>
          <h3>Edit harbor</h3>
          <form onSubmit={onSubmit}>
            <label htmlFor="name">Harbor Name</label>
            <input id="name" name="name" value={draft?.name || ''} onChange={onChange} required maxLength={140} />

            <label htmlFor="district">District</label>
            <input id="district" name="district" value={draft?.district || ''} onChange={onChange} required maxLength={80} />

            <label htmlFor="locationDescription">Location Description</label>
            <textarea id="locationDescription" name="locationDescription" value={draft?.locationDescription || ''} onChange={onChange} required maxLength={300} rows={3} />

            {state.error && <p className="error">{state.error}</p>}
            {state.success && <p>{state.success}</p>}
            <button type="submit" disabled={state.loading}>{state.loading ? 'Saving…' : 'Save Changes'}</button>
          </form>
        </>
      ) : (
        <p>Only admins can edit harbor records.</p>
      )}
    </section>
  );
}
