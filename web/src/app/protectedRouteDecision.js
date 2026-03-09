export function getProtectedRouteDecision({ user, role, loading, allowedRoles }) {
  if (loading) return 'loading';
  if (!user) return 'login';
  if (!role) return 'unauthorized';
  if (allowedRoles && !allowedRoles.includes(role)) return 'unauthorized';
  return 'allow';
}
