import { Link } from 'react-router-dom';
import { useFishermanData } from '../hooks/useFishermanData';
import { formatMaybeDate } from '../../../shared/utils/dateFormatting';

export function NoticesPage() {
  const { loading, error, notices } = useFishermanData();

  return (
    <main className="page-wrap">
      <header className="page-header">
        <h1>Harbor Notices</h1>
        <Link className="secondary-link" to="/dashboard">Back to dashboard</Link>
      </header>

      {loading ? <p className="state-loading">Loading notices…</p> : null}
      {error ? <p className="state-error">{error}</p> : null}

      {!loading && !error && notices.length === 0 ? (
        <p className="state-empty">No notices are currently targeted to fishermen.</p>
      ) : null}

      {!loading && !error && notices.length > 0 ? (
        <ul className="simple-list panel">
          {notices.map((notice) => (
            <li key={notice.id}>
              <strong>{notice.title}</strong>
              <p>{notice.message}</p>
              <small>{formatMaybeDate(notice.createdAt)}</small>
            </li>
          ))}
        </ul>
      ) : null}
    </main>
  );
}
