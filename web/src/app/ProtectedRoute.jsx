import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../features/auth/AuthContext';
import { getProtectedRouteDecision } from './protectedRouteDecision';

export default function ProtectedRoute({ children, allowedRoles }) {
  const { user, role, loading } = useAuth();
  const location = useLocation();

  const decision = getProtectedRouteDecision({ user, role, loading, allowedRoles });

  if (decision === 'loading') return <p className="state">Loading secure session...</p>;
  if (decision === 'login') return <Navigate to="/login" replace state={{ from: location }} />;
  if (decision === 'unauthorized') return <Navigate to="/unauthorized" replace />;

  return children;
}
