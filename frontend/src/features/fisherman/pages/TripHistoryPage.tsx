import { Link } from 'react-router-dom';
import { StatusBadge } from '../components/FishermanUi';
import { useFishermanData } from '../hooks/useFishermanData';
import { formatDateTime, formatMaybeDate } from '../../../shared/utils/dateFormatting';

export function TripHistoryPage() {
  const { loading, error, tripHistory } = useFishermanData();

  return (
    <main className="page-wrap">
      <header className="page-header">
        <h1>My Voyages</h1>
        <Link className="secondary-link" to="/dashboard">Back to dashboard</Link>
      </header>

      {loading ? <p className="state-loading">Loading trip history…</p> : null}
      {error ? <p className="state-error">{error}</p> : null}

      {!loading && !error && tripHistory.length === 0 ? (
        <p className="state-empty">No trip history yet.</p>
      ) : null}

      {!loading && !error && tripHistory.length > 0 ? (
        <ul className="trip-list">
          {tripHistory.map((trip) => (
            <li key={trip.id} className="panel">
              <div className="panel-header-row">
                <strong>{trip.tripNumber}</strong>
                <StatusBadge status={trip.status} />
              </div>
              <p><strong>Departure:</strong> {formatDateTime(trip.departureAt)}</p>
              <p><strong>Expected Return:</strong> {formatMaybeDate(trip.expectedReturnAt)}</p>
              <p><strong>Actual Return:</strong> {formatMaybeDate(trip.actualReturnAt)}</p>
            </li>
          ))}
        </ul>
      ) : null}
    </main>
  );
}
