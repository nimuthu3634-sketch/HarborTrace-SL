import { useState } from 'react';
import { httpsCallable } from 'firebase/functions';
import { useNavigate } from 'react-router-dom';
import { functions } from '../lib/firebase';
import { useI18n } from '../i18n/I18nProvider';

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
  const { t } = useI18n();
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
      setError(submitError?.message || t('landingIntake.messages.submitFailed'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="card">
      <h2>{t('landingIntake.title')}</h2>
      <p className="helper-text">{t('landingIntake.description')}</p>
      <form className="landing-form" onSubmit={onSubmit}>
        <div className="form-grid">
        <label>{t('landingIntake.fields.tripId')}<input name="tripId" value={form.tripId} onChange={onChange} required /></label>
        <label>{t('landingIntake.fields.fishType')}<input name="fishType" value={form.fishType} onChange={onChange} required /></label>
        <label>{t('landingIntake.fields.quantity')}<input type="number" min="1" name="quantity" value={form.quantity} onChange={onChange} required /></label>
        <label>{t('landingIntake.fields.totalWeightKg')}<input type="number" min="0.1" step="0.1" name="totalWeightKg" value={form.totalWeightKg} onChange={onChange} required /></label>
        <label>{t('landingIntake.fields.storageMethod')}<input name="storageMethod" value={form.storageMethod} onChange={onChange} required /></label>
        <label>{t('landingIntake.fields.conditionStatus')}<input name="conditionStatus" value={form.conditionStatus} onChange={onChange} required /></label>
        <label>{t('landingIntake.fields.landingHarborId')}<input name="landingHarborId" value={form.landingHarborId} onChange={onChange} required /></label>
        <label>{t('landingIntake.fields.landingTime')}<input type="datetime-local" name="landingTime" value={form.landingTime} onChange={onChange} required /></label>
        </div>
        {error && <p className="error">{error}</p>}
        <div className="form-actions">
          <button type="submit" disabled={saving}>{saving ? t('landingIntake.actions.submitting') : t('landingIntake.actions.submit')}</button>
          <p className="helper-text">{t('landingIntake.helper')}</p>
        </div>
      </form>
    </section>
  );
}
