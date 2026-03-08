import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { db, functions } from '../../lib/firebase';
import { formatTimestamp } from '../trips/tripStatus';

const createHarborCallable = httpsCallable(functions, 'createHarbor');

const initialForm = {
  name: '',
  district: '',
  locationDescription: ''
};

export default function HarborsPanel() {
  const { role } = useAuth();
  const canManageHarbors = role === 'admin';
  const [harbors, setHarbors] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [state, setState] = useState({ loading: false, error: '', success: '' });

  useEffect(() => {
    const harborQuery = query(collection(db, 'harbors'), orderBy('createdAt', 'desc'));
    return onSnapshot(harborQuery, (snapshot) => {
      setHarbors(snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() })));
    });
  }, []);

  const visibleHarbors = useMemo(() => harbors.slice(0, 100), [harbors]);

  const onChange = (event) => {
    const { name, value } = event.target;
    setForm((previous) => ({ ...previous, [name]: value }));
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    setState({ loading: true, error: '', success: '' });

    try {
      await createHarborCallable({
        name: form.name.trim(),
        district: form.district.trim(),
        locationDescription: form.locationDescription.trim()
      });
      setForm(initialForm);
      setState({ loading: false, error: '', success: 'Harbor created successfully.' });
    } catch (error) {
      setState({ loading: false, error: error?.message || 'Failed to create harbor.', success: '' });
    }
  };

  return (
    <section>
      <h3>Harbor directory</h3>
      <p>Browse registered harbors and maintain official harbor profiles.</p>

      {canManageHarbors && (
        <form onSubmit={onSubmit}>
          <label htmlFor="name">Harbor Name</label>
          <input id="name" name="name" value={form.name} onChange={onChange} required maxLength={140} />

          <label htmlFor="district">District</label>
          <input id="district" name="district" value={form.district} onChange={onChange} required maxLength={80} />

          <label htmlFor="locationDescription">Location Description</label>
          <textarea id="locationDescription" name="locationDescription" value={form.locationDescription} onChange={onChange} required maxLength={300} rows={3} />

          {state.error && <p className="error">{state.error}</p>}
          {state.success && <p>{state.success}</p>}

          <button type="submit" disabled={state.loading}>{state.loading ? 'Saving…' : 'Create Harbor'}</button>
        </form>
      )}

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>District</th>
              <th>Location</th>
              <th>Created</th>
              <th>Detail</th>
            </tr>
          </thead>
          <tbody>
            {visibleHarbors.map((harbor) => (
              <tr key={harbor.id}>
                <td>{harbor.name || '—'}</td>
                <td>{harbor.district || '—'}</td>
                <td>{harbor.locationDescription || '—'}</td>
                <td>{formatTimestamp(harbor.createdAt)}</td>
                <td><Link to={`/harbors/${harbor.id}`}>Open</Link></td>
              </tr>
            ))}
            {visibleHarbors.length === 0 && (
              <tr>
                <td colSpan={5}>No harbors found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
