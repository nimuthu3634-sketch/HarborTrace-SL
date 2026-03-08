import { collection, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { db, functions } from '../../lib/firebase';
import { useAuth } from '../auth/AuthContext';
import { formatTimestamp } from '../trips/tripStatus';

const createNoticeCallable = httpsCallable(functions, 'createNotice');
const updateNoticeCallable = httpsCallable(functions, 'updateNotice');

const severityOptions = ['info', 'warning', 'critical'];
const roleOptions = ['fisherman', 'harbor_officer', 'buyer', 'admin', 'all'];

const initialForm = {
  title: '',
  body: '',
  severity: 'info',
  targetRole: 'all'
};

function noticeAudienceLabel(targetRole) {
  return targetRole === 'all' ? 'All roles' : targetRole;
}

export default function NoticesPanel() {
  const { role } = useAuth();
  const [notices, setNotices] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [state, setState] = useState({ loading: false, error: '', success: '' });
  const [editDrafts, setEditDrafts] = useState({});

  const canManage = role === 'harbor_officer' || role === 'admin';

  useEffect(() => {
    if (!role) {
      return undefined;
    }

    const noticesQuery = canManage
      ? query(collection(db, 'notices'), orderBy('createdAt', 'desc'))
      : query(
        collection(db, 'notices'),
        where('targetRole', 'in', [role, 'all']),
        orderBy('createdAt', 'desc')
      );

    return onSnapshot(noticesQuery, (snapshot) => {
      setNotices(snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() })));
    });
  }, [canManage, role]);

  const visibleNotices = useMemo(() => notices.slice(0, 40), [notices]);

  const onChange = (event) => {
    const { name, value } = event.target;
    setForm((previous) => ({ ...previous, [name]: value }));
  };

  const onCreate = async (event) => {
    event.preventDefault();
    setState({ loading: true, error: '', success: '' });

    try {
      await createNoticeCallable({
        title: form.title.trim(),
        body: form.body.trim(),
        severity: form.severity,
        targetRole: form.targetRole
      });
      setForm(initialForm);
      setState({ loading: false, error: '', success: 'Notice published.' });
    } catch (error) {
      setState({ loading: false, error: error?.message || 'Failed to create notice.', success: '' });
    }
  };

  const setEditField = (noticeId, name, value) => {
    setEditDrafts((previous) => ({
      ...previous,
      [noticeId]: {
        ...previous[noticeId],
        [name]: value
      }
    }));
  };

  const currentDraft = (notice) => ({
    title: editDrafts[notice.id]?.title ?? notice.title ?? '',
    body: editDrafts[notice.id]?.body ?? notice.body ?? '',
    severity: editDrafts[notice.id]?.severity ?? notice.severity ?? 'info',
    targetRole: editDrafts[notice.id]?.targetRole ?? notice.targetRole ?? 'all'
  });

  const updateNotice = async (notice) => {
    const draft = currentDraft(notice);
    setState({ loading: true, error: '', success: '' });

    try {
      await updateNoticeCallable({
        noticeId: notice.id,
        ...draft,
        title: draft.title.trim(),
        body: draft.body.trim()
      });
      setState({ loading: false, error: '', success: `Updated notice ${notice.id}.` });
    } catch (error) {
      setState({ loading: false, error: error?.message || 'Failed to update notice.', success: '' });
    }
  };

  return (
    <section>
      <h3>Harbor notices</h3>
      <p>Role-targeted bulletins for fishermen, buyers, officers, and admins.</p>

      {canManage && (
        <form onSubmit={onCreate}>
          <label htmlFor="title">Title</label>
          <input id="title" name="title" value={form.title} onChange={onChange} maxLength={140} required />

          <label htmlFor="body">Body</label>
          <textarea id="body" name="body" rows={4} value={form.body} onChange={onChange} maxLength={5000} required />

          <label htmlFor="severity">Severity</label>
          <select id="severity" name="severity" value={form.severity} onChange={onChange}>
            {severityOptions.map((severity) => (
              <option key={severity} value={severity}>{severity}</option>
            ))}
          </select>

          <label htmlFor="targetRole">Target role</label>
          <select id="targetRole" name="targetRole" value={form.targetRole} onChange={onChange}>
            {roleOptions.map((roleName) => (
              <option key={roleName} value={roleName}>{noticeAudienceLabel(roleName)}</option>
            ))}
          </select>

          <button type="submit" disabled={state.loading}>Create notice</button>
        </form>
      )}

      {!canManage && <p>You can view notices targeted for your role.</p>}
      {state.error && <p className="error">{state.error}</p>}
      {state.success && <p>{state.success}</p>}

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Title</th>
              <th>Severity</th>
              <th>Audience</th>
              <th>Created by</th>
              <th>Created at</th>
              <th>Details</th>
              {canManage && <th>Edit</th>}
            </tr>
          </thead>
          <tbody>
            {visibleNotices.map((notice) => {
              const draft = currentDraft(notice);
              return (
                <tr key={notice.id}>
                  <td>{notice.title || 'Untitled'}</td>
                  <td>{notice.severity || 'info'}</td>
                  <td>{noticeAudienceLabel(notice.targetRole || 'all')}</td>
                  <td>{notice.createdByName || notice.createdBy || '—'}</td>
                  <td>{formatTimestamp(notice.createdAt)}</td>
                  <td>
                    <Link to={`/notices/${notice.id}`}>Open</Link>
                  </td>
                  {canManage && (
                    <td>
                      <details>
                        <summary>Edit</summary>
                        <label>Title<input value={draft.title} onChange={(event) => setEditField(notice.id, 'title', event.target.value)} /></label>
                        <label>Body<textarea rows={3} value={draft.body} onChange={(event) => setEditField(notice.id, 'body', event.target.value)} /></label>
                        <label>Severity
                          <select value={draft.severity} onChange={(event) => setEditField(notice.id, 'severity', event.target.value)}>
                            {severityOptions.map((severity) => (
                              <option key={severity} value={severity}>{severity}</option>
                            ))}
                          </select>
                        </label>
                        <label>Target role
                          <select value={draft.targetRole} onChange={(event) => setEditField(notice.id, 'targetRole', event.target.value)}>
                            {roleOptions.map((roleName) => (
                              <option key={roleName} value={roleName}>{noticeAudienceLabel(roleName)}</option>
                            ))}
                          </select>
                        </label>
                        <button type="button" className="secondary" disabled={state.loading} onClick={() => updateNotice(notice)}>
                          Save
                        </button>
                      </details>
                    </td>
                  )}
                </tr>
              );
            })}
            {visibleNotices.length === 0 && (
              <tr>
                <td colSpan={canManage ? 7 : 6}>No notices available for this role.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
