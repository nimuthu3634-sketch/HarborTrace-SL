import { doc, getDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { useI18n } from '../i18n/I18nProvider';
import { Link, useParams } from 'react-router-dom';
import { formatTimestamp } from '../features/trips/tripStatus';
import { db } from '../lib/firebase';
import { getLocalizedRole, getLocalizedText } from '../lib/localizedNotice';

export default function NoticeDetailPage() {
  const { noticeId } = useParams();
  const { t, language } = useI18n();
  const [notice, setNotice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    async function loadNotice() {
      try {
        const snapshot = await getDoc(doc(db, 'notices', noticeId));
        if (!snapshot.exists()) throw new Error(t('notice.notFound'));
        if (active) { setNotice({ id: snapshot.id, ...snapshot.data() }); setLoading(false); }
      } catch (loadError) {
        if (active) { setLoading(false); setError(loadError?.message || t('notice.createFailed')); }
      }
    }
    loadNotice();
    return () => { active = false; };
  }, [noticeId, t]);

  if (loading) return <section className="card"><p className="state">{t('common.loading')}</p></section>;
  if (error) return <section className="card"><p className="error">{error}</p><Link to="/notices">{t('common.backToNotices')}</Link></section>;

  return (
    <section className="card">
      <h2>{getLocalizedText(notice, 'title', language) || t('common.untitledNotice')}</h2>
      <p><strong>{t('common.severity')}:</strong> {notice.severity || 'info'}</p>
      <p><strong>{t('common.audience')}:</strong> {getLocalizedRole(notice.targetRole, t)}</p>
      <p><strong>{t('common.createdBy')}:</strong> {notice.createdByName || notice.createdBy || '—'}</p>
      <p><strong>{t('common.createdAt')}:</strong> {formatTimestamp(notice.createdAt, language)}</p>
      <article><p>{getLocalizedText(notice, 'body', language) || t('common.noMessageBody')}</p></article>
      <Link to="/notices">{t('common.backToNotices')}</Link>
    </section>
  );
}
