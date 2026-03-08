import { useEffect } from 'react';
import { useAuth } from '../features/auth/AuthContext';

const roleDescriptions = {
  fisherman: 'Start a voyage from your assigned harbor, monitor active trip status, submit landed catch details, and trigger emergency incident alerts when required.',
  harbor_officer: 'Validate inbound vessel arrivals, verify landing declarations, issue operational harbor bulletins, and coordinate incident response actions.',
  buyer: 'Review verified catch batches, validate traceability records, and confirm trusted seafood sourcing for procurement workflows.',
  admin: 'Oversee ports, vessels, users, compliance controls, system analytics, and complete fisheries audit visibility.'
};

export default function DashboardPage() {
  const { role, profile } = useAuth();

  useEffect(() => {
    document.title = 'HarborTrace SL | Fisheries Operations Dashboard';
  }, []);

  return (
    <section className="card">
      <h2>Fisheries Operations Dashboard</h2>
      <p>Welcome{profile?.displayName ? `, ${profile.displayName}` : ''}.</p>
      <p>{roleDescriptions[role] || 'No fisheries role assigned yet. Please contact the system administrator to activate your account.'}</p>
    </section>
  );
}
