import { Navigate } from 'react-router-dom';
import { useAuth } from '../features/auth/AuthContext';

export default function ProtectedRoute({ children, allowedRoles }) {
  const { user, role, loading } = useAuth();

  if (loading) return <p className="state">Loading session...</p>;
  if (!user) return <Navigate to="/login" replace />;
  if (allowedRoles && !allowedRoles.includes(role)) return <Navigate to="/" replace />;

  return children;
}
