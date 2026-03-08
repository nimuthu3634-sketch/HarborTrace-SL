import { httpsCallable } from 'firebase/functions';
import { useEffect, useMemo, useState } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../features/auth/AuthContext';
import { db, functions } from '../lib/firebase';

const createTripCallable = httpsCallable(functions, 'createTrip');

function toInputDateTime(value) {
  const dt = value ? new Date(value) : new Date();
  dt.setMinutes(dt.getMinutes() - dt.getTimezoneOffset());
  return dt.toISOString().slice(0, 16);
}

export default function RegisterDeparturePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [vessels, setVessels] = useState([]);
  const [harbors, setHarbors] = useState([]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    vesselId: '',
    departureHarborId: '',
    destinationZone: '',
    crewCount: 1,
    departureTime: toInputDateTime(),
    expectedReturnTime: toInputDateTime(Date.now() + 1000 * 60 * 60 * 10),
    emergencyContact: '',
    notes: ''
  });

  useEffect(() => {
    const unsubVessels = onSnapshot(collection(db, 'vessels'), (snap) => setVessels(snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }))));
    const unsubHarbors = onSnapshot(collection(db, 'harbors'), (snap) => setHarbors(snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }))));
    return () => {
      unsubVessels();
      unsubHarbors();
    };
  }, []);

  const canSubmit = useMemo(() => !!form.vesselId && !!form.departureHarborId && !!form.destinationZone && !!form.emergencyContact, [form]);

  const onChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: name === 'crewCount' ? Number(value) : value }));
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSaving(true);

    try {
      const response = await createTripCallable({
        ...form,
        fishermanUid: user.uid
      });
      navigate(`/trips/${response.data.tripId}`);
    } catch (submissionError) {
      setError(submissionError?.message || 'Failed to register departure.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="card">
      <h2>Register Departure</h2>
      <p className="helper-text">Provide complete departure and return planning details before leaving harbor.</p>
      <form onSubmit={onSubmit}>
        <div className="form-grid">
        <label htmlFor="vesselId">Vessel</label>
        <select id="vesselId" name="vesselId" value={form.vesselId} onChange={onChange} required>
          <option value="">Select vessel</option>
          {vessels.map((vessel) => <option key={vessel.id} value={vessel.id}>{vessel.vesselName || vessel.id}</option>)}
        </select>

        <label htmlFor="departureHarborId">Departure Harbor</label>
        <select id="departureHarborId" name="departureHarborId" value={form.departureHarborId} onChange={onChange} required>
          <option value="">Select harbor</option>
          {harbors.map((harbor) => <option key={harbor.id} value={harbor.id}>{harbor.harborName || harbor.name || harbor.id}</option>)}
        </select>

        <label htmlFor="destinationZone">Destination Zone</label>
        <input id="destinationZone" name="destinationZone" value={form.destinationZone} onChange={onChange} required />

        <label htmlFor="crewCount">Crew Count</label>
        <input id="crewCount" name="crewCount" type="number" min={1} value={form.crewCount} onChange={onChange} required />

        <label htmlFor="departureTime">Departure Time</label>
        <input id="departureTime" name="departureTime" type="datetime-local" value={form.departureTime} onChange={onChange} required />

        <label htmlFor="expectedReturnTime">Expected Return Time</label>
        <input id="expectedReturnTime" name="expectedReturnTime" type="datetime-local" value={form.expectedReturnTime} onChange={onChange} required />

        <label htmlFor="emergencyContact">Emergency Contact</label>
        <input id="emergencyContact" name="emergencyContact" value={form.emergencyContact} onChange={onChange} required />

        <label htmlFor="notes">Notes</label>
        <textarea id="notes" name="notes" value={form.notes} onChange={onChange} rows={4} />
        </div>

        {error && <p className="error">{error}</p>}
        <div className="form-actions">
          <button type="submit" disabled={saving || !canSubmit}>{saving ? 'Registering…' : 'Register Departure'}</button>
          <p className="helper-text">All required fields must be completed before submission.</p>
        </div>
      </form>
    </section>
  );
}
