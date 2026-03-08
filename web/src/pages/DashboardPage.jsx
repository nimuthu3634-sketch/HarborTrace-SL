import { useAuth } from '../features/auth/AuthContext';

const roleDescriptions = {
  fisherman: 'Register Departure, monitor Active Voyage, submit Landing Intake and Incident Alert.',
  harbor_officer: 'Review arrivals, verify landings, publish Harbor Notice, and respond to incidents.',
  buyer: 'Review verified batches and perform Batch Traceability checks.',
  admin: 'Manage harbors, users, security posture, analytics, and audit logs.'
};

export default function DashboardPage() {
  const { role } = useAuth();

  return (
    <section className="card">
      <h2>Role Dashboard</h2>
      <p>{roleDescriptions[role] || 'No role assigned. Contact administrator.'}</p>
    </section>
  );
}
