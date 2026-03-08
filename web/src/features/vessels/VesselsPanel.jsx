import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { db, functions } from '../../lib/firebase';
import { formatTimestamp } from '../trips/tripStatus';

const createVesselCallable = httpsCallable(functions, 'createVessel');

const initialForm = {
  vesselName: '',
  registrationNumber: '',
  ownerUserId: '',
  vesselType: '',
  capacity: '',
  status: 'active'
};

export default function VesselsPanel() {
  const [vessels, setVessels] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [state, setState] = useState({ loading: false, error: '', success: '' });

  useEffect(() => {
    const vesselsQuery = query(collection(db, 'vessels'), orderBy('createdAt', 'desc'));
    return onSnapshot(vesselsQuery, (snapshot) => {
      setVessels(snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() })));
    });
  }, []);

  const visibleVessels = useMemo(() => vessels.slice(0, 50), [vessels]);

  const onChange = (event) => {
    const { name, value } = event.target;
    setForm((previous) => ({ ...previous, [name]: value }));
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    setState({ loading: true, error: '', success: '' });

    try {
      await createVesselCallable({
        vesselName: form.vesselName.trim(),
        registrationNumber: form.registrationNumber.trim(),
        ownerUserId: form.ownerUserId.trim(),
        vesselType: form.vesselType.trim(),
        capacity: Number(form.capacity),
        status: form.status
      });
      setForm(initialForm);
      setState({ loading: false, error: '', success: 'Vessel created successfully.' });
    } catch (error) {
      setState({ loading: false, error: error?.message || 'Failed to create vessel.', success: '' });
    }
  };

  return (
    <section>
      <h3>Vessel registry</h3>
      <p>Create and manage registered fishing vessels.</p>

      <form onSubmit={onSubmit}>
        <label htmlFor="vesselName">Vessel Name</label>
        <input id="vesselName" name="vesselName" value={form.vesselName} onChange={onChange} required maxLength={140} />

        <label htmlFor="registrationNumber">Registration Number</label>
        <input id="registrationNumber" name="registrationNumber" value={form.registrationNumber} onChange={onChange} required maxLength={50} />

        <label htmlFor="ownerUserId">Owner User ID</label>
        <input id="ownerUserId" name="ownerUserId" value={form.ownerUserId} onChange={onChange} required maxLength={128} />

        <label htmlFor="vesselType">Vessel Type</label>
        <input id="vesselType" name="vesselType" value={form.vesselType} onChange={onChange} required maxLength={64} />

        <label htmlFor="capacity">Capacity</label>
        <input id="capacity" name="capacity" type="number" min={0.1} step="0.1" value={form.capacity} onChange={onChange} required />

        <label htmlFor="status">Status</label>
        <select id="status" name="status" value={form.status} onChange={onChange}>
          <option value="active">active</option>
          <option value="inactive">inactive</option>
          <option value="maintenance">maintenance</option>
        </select>

        {state.error && <p className="error">{state.error}</p>}
        {state.success && <p>{state.success}</p>}

        <button type="submit" disabled={state.loading}>{state.loading ? 'Saving…' : 'Create Vessel'}</button>
      </form>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Vessel Name</th>
              <th>Registration #</th>
              <th>Owner User</th>
              <th>Type</th>
              <th>Capacity</th>
              <th>Status</th>
              <th>Created</th>
              <th>Detail</th>
            </tr>
          </thead>
          <tbody>
            {visibleVessels.map((vessel) => (
              <tr key={vessel.id}>
                <td>{vessel.vesselName || '—'}</td>
                <td>{vessel.registrationNumber || '—'}</td>
                <td>{vessel.ownerUserId || '—'}</td>
                <td>{vessel.vesselType || '—'}</td>
                <td>{vessel.capacity ?? '—'}</td>
                <td>{vessel.status || '—'}</td>
                <td>{formatTimestamp(vessel.createdAt)}</td>
                <td><Link to={`/vessels/${vessel.id}`}>Open</Link></td>
              </tr>
            ))}
            {visibleVessels.length === 0 && (
              <tr>
                <td colSpan={8}>No vessels in registry.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
