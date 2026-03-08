import { useState } from 'react';
import { httpsCallable } from 'firebase/functions';
import { useNavigate } from 'react-router-dom';
import { functions } from '../lib/firebase';

const submitLandingIntakeCallable = httpsCallable(functions, 'submitLandingIntake');

const initialForm = {
  tripId: '',
  fishType: '',
  quantity: '',
  totalWeightKg: '',
  storageMethod: '',
  conditionStatus: '',
  landingHarborId: '',
  landingTime: ''
};

export default function LandingIntakePage() {
  const navigate = useNavigate();
  const [form, setForm] = useState(initialForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const onChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');

    try {
      const response = await submitLandingIntakeCallable({
        ...form,
        quantity: Number(form.quantity),
        totalWeightKg: Number(form.totalWeightKg)
      });
      navigate(`/landings/${response.data.landingId}`);
    } catch (submitError) {
      setError(submitError?.message || 'Failed to submit landing intake.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="card">
      <h2>Landing Intake Form</h2>
      <p className="helper-text">Submit your landed catch with complete details. Verification status is automatically set to pending.</p>
      <form className="landing-form" onSubmit={onSubmit}>
        <div className="form-grid">
        <label>Trip ID<input name="tripId" value={form.tripId} onChange={onChange} required /></label>
        <label>Fish Type<input name="fishType" value={form.fishType} onChange={onChange} required /></label>
        <label>Quantity<input type="number" min="1" name="quantity" value={form.quantity} onChange={onChange} required /></label>
        <label>Total Weight (kg)<input type="number" min="0.1" step="0.1" name="totalWeightKg" value={form.totalWeightKg} onChange={onChange} required /></label>
        <label>Storage Method<input name="storageMethod" value={form.storageMethod} onChange={onChange} required /></label>
        <label>Condition Status<input name="conditionStatus" value={form.conditionStatus} onChange={onChange} required /></label>
        <label>Landing Harbor ID<input name="landingHarborId" value={form.landingHarborId} onChange={onChange} required /></label>
        <label>Landing Time<input type="datetime-local" name="landingTime" value={form.landingTime} onChange={onChange} required /></label>
        </div>
        {error && <p className="error">{error}</p>}
        <div className="form-actions">
          <button type="submit" disabled={saving}>{saving ? 'Submitting...' : 'Submit Landing Intake'}</button>
          <p className="helper-text">Ensure trip ID and harbor ID match your registered voyage.</p>
        </div>
      </form>
    </section>
  );
}
