import { doc, onSnapshot } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { db, functions } from '../lib/firebase';
import { formatTimestamp } from '../features/trips/tripStatus';

const updateVesselCallable = httpsCallable(functions, 'updateVessel');

export default function VesselDetailPage() {
  const { vesselId = '' } = useParams();
  const [vessel, setVessel] = useState(null);
  const [draft, setDraft] = useState(null);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [state, setState] = useState({ loading: false, error: '', success: '' });

  useEffect(() => {
    if (!vesselId) {
      return undefined;
    }

    return onSnapshot(doc(db, 'vessels', vesselId), (snapshot) => {
      setHasLoaded(true);
      if (!snapshot.exists()) {
        setVessel(null);
        setDraft(null);
        return;
      }

      const data = { id: snapshot.id, ...snapshot.data() };
      setVessel(data);
      setDraft((previous) => previous ?? {
        vesselName: data.vesselName || '',
        registrationNumber: data.registrationNumber || '',
        ownerUserId: data.ownerUserId || '',
        vesselType: data.vesselType || '',
        capacity: String(data.capacity ?? ''),
        status: data.status || 'active'
      });
    });
  }, [vesselId]);

  if (!vesselId) {
    return (
      <section className="card">
        <h2>Vessel Detail</h2>
        <p>Missing vessel ID in route.</p>
        <Link to="/vessels">Back to vessels</Link>
      </section>
    );
  }

  if (!hasLoaded) {
    return (
      <section className="card">
        <h2>Vessel Detail</h2>
        <p>Loading vessel record…</p>
      </section>
    );
  }

  const detailRows = vessel
    ? [
      ['Vessel Name', vessel.vesselName],
      ['Registration Number', vessel.registrationNumber],
      ['Owner User ID', vessel.ownerUserId],
      ['Vessel Type', vessel.vesselType],
      ['Capacity', vessel.capacity],
      ['Status', vessel.status],
      ['Created At', formatTimestamp(vessel.createdAt)],
      ['Updated At', formatTimestamp(vessel.updatedAt)]
    ]
    : [];

  const onChange = (event) => {
    const { name, value } = event.target;
    setDraft((previous) => ({ ...previous, [name]: value }));
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    if (!draft) {
      return;
    }

    setState({ loading: true, error: '', success: '' });

    try {
      await updateVesselCallable({
        vesselId,
        vesselName: draft.vesselName.trim(),
        registrationNumber: draft.registrationNumber.trim(),
        ownerUserId: draft.ownerUserId.trim(),
        vesselType: draft.vesselType.trim(),
        capacity: Number(draft.capacity),
        status: draft.status
      });
      setState({ loading: false, error: '', success: 'Vessel updated successfully.' });
    } catch (error) {
      setState({ loading: false, error: error?.message || 'Failed to update vessel.', success: '' });
    }
  };

  if (!vessel) {
    return (
      <section className="card">
        <h2>Vessel Detail</h2>
        <p>Vessel not found or you no longer have access.</p>
        <Link to="/vessels">Back to vessels</Link>
      </section>
    );
  }

  return (
    <section className="card">
      <h2>Vessel Detail</h2>
      <p>Manage this vessel record and keep registration data current.</p>
      <Link to="/vessels">← Back to vessels</Link>

      <ul>
        {detailRows.map(([label, value]) => (
          <li key={label}><strong>{label}:</strong> {value || '—'}</li>
        ))}
      </ul>

      <h3>Edit vessel</h3>
      <form onSubmit={onSubmit}>
        <label htmlFor="vesselName">Vessel Name</label>
        <input id="vesselName" name="vesselName" value={draft?.vesselName || ''} onChange={onChange} required />

        <label htmlFor="registrationNumber">Registration Number</label>
        <input id="registrationNumber" name="registrationNumber" value={draft?.registrationNumber || ''} onChange={onChange} required />

        <label htmlFor="ownerUserId">Owner User ID</label>
        <input id="ownerUserId" name="ownerUserId" value={draft?.ownerUserId || ''} onChange={onChange} required />

        <label htmlFor="vesselType">Vessel Type</label>
        <input id="vesselType" name="vesselType" value={draft?.vesselType || ''} onChange={onChange} required />

        <label htmlFor="capacity">Capacity</label>
        <input id="capacity" name="capacity" type="number" min={0.1} step="0.1" value={draft?.capacity || ''} onChange={onChange} required />

        <label htmlFor="status">Status</label>
        <select id="status" name="status" value={draft?.status || 'active'} onChange={onChange}>
          <option value="active">active</option>
          <option value="inactive">inactive</option>
          <option value="maintenance">maintenance</option>
        </select>

        {state.error && <p className="error">{state.error}</p>}
        {state.success && <p>{state.success}</p>}
        <button type="submit" disabled={state.loading}>{state.loading ? 'Saving…' : 'Save Changes'}</button>
      </form>
    </section>
  );
}
