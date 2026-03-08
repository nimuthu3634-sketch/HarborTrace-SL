import { Link } from 'react-router-dom';
import { ActiveVoyageSummary } from '../components/FishermanUi';
import { useFishermanData } from '../hooks/useFishermanData';

export function ActiveVoyagePage() {
  const { loading, error, activeTrip } = useFishermanData();

  return (
    <main className="page-wrap">
      <header className="page-header">
        <h1>Active Voyage</h1>
        <Link className="secondary-link" to="/dashboard">Back to dashboard</Link>
      </header>
      {loading ? <p className="state-loading">Loading active voyage…</p> : null}
      {error ? <p className="state-error">{error}</p> : null}
      {!loading && !error ? <ActiveVoyageSummary trip={activeTrip} /> : null}
    </main>
  );
}
