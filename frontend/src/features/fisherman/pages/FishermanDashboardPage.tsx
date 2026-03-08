import {
  ActiveVoyageSummary,
  DashboardActionGrid,
  RecentIncidentAlerts,
  RecentNotices,
} from '../components/FishermanUi';
import { useFishermanData } from '../hooks/useFishermanData';

export function FishermanDashboardPage() {
  const { loading, error, profile, activeTrip, notices, alerts } = useFishermanData();

  if (loading) {
    return (
      <main className="page-wrap">
        <p className="state-loading">Loading fisherman dashboard…</p>
      </main>
    );
  }

  if (error) {
    return (
      <main className="page-wrap">
        <h1>Fisherman Dashboard</h1>
        <p className="state-error">{error}</p>
      </main>
    );
  }

  return (
    <main className="page-wrap">
      <header className="page-header">
        <h1>Welcome, {profile?.displayName ?? 'Fisherman'}</h1>
        <p className="subtle">Monitor trips, alerts, and harbor instructions.</p>
      </header>

      <DashboardActionGrid />
      <ActiveVoyageSummary trip={activeTrip} />
      <RecentNotices notices={notices} />
      <RecentIncidentAlerts alerts={alerts} />
    </main>
  );
}
