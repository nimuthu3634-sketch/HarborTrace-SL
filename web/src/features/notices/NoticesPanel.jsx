import { collection, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { useEffect, useMemo, useState } from 'react';
import { useI18n } from '../../i18n/I18nProvider';
import { Link } from 'react-router-dom';
import { db, functions } from '../../lib/firebase';
import { useAuth } from '../auth/AuthContext';
import { formatTimestamp } from '../trips/tripStatus';
import { getLocalizedText } from '../../lib/localizedNotice';

const createNoticeCallable = httpsCallable(functions, 'createNotice');
const updateNoticeCallable = httpsCallable(functions, 'updateNotice');

const severityOptions = ['info', 'warning', 'critical'];
const roleOptions = ['fisherman', 'harbor_officer', 'buyer', 'admin', 'all'];

const initialForm = {
  titleEn: '',
  titleSi: '',
  titleTa: '',
  bodyEn: '',
  bodySi: '',
  bodyTa: '',
  severity: 'info',
  targetRole: 'all'
};

export default function NoticesPanel() {
  const { role } = useAuth();
  const { t, language } = useI18n();
  const [notices, setNotices] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [state, setState] = useState({ loading: false, error: '', success: '' });
  const [editDrafts, setEditDrafts] = useState({});

  const canManage = role === 'harbor_officer' || role === 'admin';

  useEffect(() => {
    if (!role) return undefined;
    const noticesQuery = canManage ? query(collection(db, 'notices'), orderBy('createdAt', 'desc')) : query(collection(db, 'notices'), where('targetRole', 'in', [role, 'all']), orderBy('createdAt', 'desc'));
    return onSnapshot(noticesQuery, (snapshot) => setNotices(snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))));
  }, [canManage, role]);

  const visibleNotices = useMemo(() => notices.slice(0, 40), [notices]);
  const onChange = (event) => setForm((previous) => ({ ...previous, [event.target.name]: event.target.value }));

  const onCreate = async (event) => {
    event.preventDefault();
    setState({ loading: true, error: '', success: '' });
    try {
      await createNoticeCallable({ ...form });
      setForm(initialForm);
      setState({ loading: false, error: '', success: t('notice.published') });
    } catch (error) {
      setState({ loading: false, error: error?.message || t('notice.createFailed'), success: '' });
    }
  };

  const setEditField = (noticeId, name, value) => setEditDrafts((previous) => ({ ...previous, [noticeId]: { ...previous[noticeId], [name]: value } }));

  const currentDraft = (notice) => ({
    titleEn: editDrafts[notice.id]?.titleEn ?? notice.titleEn ?? notice.title ?? '',
    titleSi: editDrafts[notice.id]?.titleSi ?? notice.titleSi ?? '',
    titleTa: editDrafts[notice.id]?.titleTa ?? notice.titleTa ?? '',
    bodyEn: editDrafts[notice.id]?.bodyEn ?? notice.bodyEn ?? notice.body ?? '',
    bodySi: editDrafts[notice.id]?.bodySi ?? notice.bodySi ?? '',
    bodyTa: editDrafts[notice.id]?.bodyTa ?? notice.bodyTa ?? '',
    severity: editDrafts[notice.id]?.severity ?? notice.severity ?? 'info',
    targetRole: editDrafts[notice.id]?.targetRole ?? notice.targetRole ?? 'all'
  });

  const updateNotice = async (notice) => {
    setState({ loading: true, error: '', success: '' });
    try {
      await updateNoticeCallable({ noticeId: notice.id, ...currentDraft(notice) });
      setState({ loading: false, error: '', success: t('notice.updated', { id: notice.id }) });
    } catch (error) {
      setState({ loading: false, error: error?.message || t('notice.updateFailed'), success: '' });
    }
  };

  return (
    <section>
      <h3>{t('notice.title')}</h3>
      <p>{t('notice.description')}</p>
      {canManage && (
        <form onSubmit={onCreate}>
          <label>{t('notice.fields.title')} (EN)<input name="titleEn" value={form.titleEn} onChange={onChange} required /></label>
          <label>{t('notice.fields.title')} (SI)<input name="titleSi" value={form.titleSi} onChange={onChange} /></label>
          <label>{t('notice.fields.title')} (TA)<input name="titleTa" value={form.titleTa} onChange={onChange} /></label>
          <label>{t('notice.fields.body')} (EN)<textarea name="bodyEn" rows={3} value={form.bodyEn} onChange={onChange} required /></label>
          <label>{t('notice.fields.body')} (SI)<textarea name="bodySi" rows={3} value={form.bodySi} onChange={onChange} /></label>
          <label>{t('notice.fields.body')} (TA)<textarea name="bodyTa" rows={3} value={form.bodyTa} onChange={onChange} /></label>
          <label>{t('common.severity')}<select name="severity" value={form.severity} onChange={onChange}>{severityOptions.map((severity) => <option key={severity} value={severity}>{severity}</option>)}</select></label>
          <label>{t('notice.fields.targetRole')}<select name="targetRole" value={form.targetRole} onChange={onChange}>{roleOptions.map((roleName) => <option key={roleName} value={roleName}>{t(`roles.${roleName}`)}</option>)}</select></label>
          <button type="submit" disabled={state.loading}>{t('notice.publish')}</button>
        </form>
      )}
      {!canManage && <p>{t('notice.viewOnly')}</p>}
      {state.error && <p className="error">{state.error}</p>}
      {state.success && <p>{state.success}</p>}
      <div className="table-wrap"><table><thead><tr><th>{t('notice.table.title')}</th><th>{t('notice.table.severity')}</th><th>{t('notice.table.audience')}</th><th>{t('notice.table.createdBy')}</th><th>{t('notice.table.createdAt')}</th><th>{t('notice.table.details')}</th>{canManage && <th>{t('notice.table.edit')}</th>}</tr></thead>
        <tbody>{visibleNotices.map((notice) => { const draft = currentDraft(notice); return <tr key={notice.id}><td>{getLocalizedText(notice, 'title', language) || t('common.untitledNotice')}</td><td>{notice.severity || 'info'}</td><td>{t(`roles.${notice.targetRole || 'all'}`)}</td><td>{notice.createdByName || notice.createdBy || '—'}</td><td>{formatTimestamp(notice.createdAt, language)}</td><td><Link to={`/notices/${notice.id}`}>{t('common.open')}</Link></td>{canManage && <td><input value={draft.titleEn} onChange={(e)=>setEditField(notice.id,'titleEn',e.target.value)} /><button type="button" onClick={() => updateNotice(notice)} disabled={state.loading}>{t('common.save')}</button></td>}</tr>; })}
          {!visibleNotices.length && <tr><td colSpan={canManage ? 7 : 6}>{t('notice.none')}</td></tr>}</tbody></table></div>
    </section>
  );
}
