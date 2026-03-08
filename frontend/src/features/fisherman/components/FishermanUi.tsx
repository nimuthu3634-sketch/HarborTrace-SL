import { Link } from 'react-router-dom';
import type { FishermanAlert, FishermanNotice, FishermanTrip } from '../hooks/useFishermanData';
import { formatDateTime, formatMaybeDate } from '../../../shared/utils/dateFormatting';

const STATUS_LABELS: Record<FishermanTrip['status'], string> = {
  registered: 'Registered',
  active: 'Active',
  overdue: 'Overdue',
  returned: 'Returned',
  cancelled: 'Cancelled',
};

const STATUS_CLASSNAMES: Record<FishermanTrip['status'], string> = {
  registered: 'badge badge-registered',
  active: 'badge badge-active',
  overdue: 'badge badge-overdue',
  returned: 'badge badge-returned',
  cancelled: 'badge badge-cancelled',
};

export function StatusBadge({ status }: { status: FishermanTrip['status'] }) {
  return <span className={STATUS_CLASSNAMES[status]}>{STATUS_LABELS[status]}</span>;
}

export function DashboardActionGrid() {
  return (
    <section className="panel">
      <h2 className="panel-title">Quick Actions</h2>
      <div className="action-grid">
        <Link className="action-button" to="/trips/new">Register Departure</Link>
        <Link className="action-button" to="/trips/history">My Voyages</Link>
        <Link className="action-button action-button-danger" to="/alerts/new">SOS</Link>
        <Link className="action-button" to="/landing/new">Landing Intake</Link>
      </div>
    </section>
  );
}

export function ActiveVoyageSummary({ trip }: { trip: FishermanTrip | null }) {
  return (
    <section className="panel">
      <div className="panel-header-row">
        <h2 className="panel-title">Active Voyage Summary</h2>
        {trip ? <StatusBadge status={trip.status} /> : null}
      </div>
      {trip ? (
        <div className="list-stack">
          <p><strong>Trip No:</strong> {trip.tripNumber}</p>
          <p><strong>Departure:</strong> {formatDateTime(trip.departureAt)}</p>
          <p><strong>Expected Return:</strong> {formatMaybeDate(trip.expectedReturnAt)}</p>
          <p><strong>Crew Count:</strong> {trip.crewCount ?? 'N/A'}</p>
          <Link className="secondary-link" to="/trips/active">Open full voyage details</Link>
        </div>
      ) : (
        <p className="state-empty">No active voyage currently registered.</p>
      )}
    </section>
  );
}

export function RecentNotices({ notices }: { notices: FishermanNotice[] }) {
  return (
    <section className="panel">
      <div className="panel-header-row">
        <h2 className="panel-title">Recent Notices</h2>
        <Link className="secondary-link" to="/notices">View all</Link>
      </div>
      {notices.length === 0 ? (
        <p className="state-empty">No notices for fishermen right now.</p>
      ) : (
        <ul className="simple-list">
          {notices.map((notice) => (
            <li key={notice.id}>
              <strong>{notice.title}</strong>
              <p>{notice.message}</p>
              <small>{formatMaybeDate(notice.createdAt)}</small>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function RecentIncidentAlerts({ alerts }: { alerts: FishermanAlert[] }) {
  return (
    <section className="panel">
      <h2 className="panel-title">Recent Incident Alerts</h2>
      {alerts.length === 0 ? (
        <p className="state-empty">No recent incident alerts.</p>
      ) : (
        <ul className="simple-list">
          {alerts.map((alert) => (
            <li key={alert.id}>
              <div className="alert-row">
                <strong>{alert.severity.toUpperCase()}</strong>
                <span className="subtle">{alert.status}</span>
              </div>
              <p>{alert.message}</p>
              <small>{formatMaybeDate(alert.createdAt)}</small>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
