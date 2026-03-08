import { describe, expect, it } from 'vitest';
import { getProtectedRouteDecision } from './protectedRouteDecision';

describe('getProtectedRouteDecision', () => {
  it('requires login for anonymous visitors', () => {
    const decision = getProtectedRouteDecision({
      user: null,
      role: null,
      loading: false,
      allowedRoles: ['admin']
    });

    expect(decision).toBe('login');
  });

  it('denies authenticated users missing required role', () => {
    const decision = getProtectedRouteDecision({
      user: { uid: 'u-1' },
      role: 'fisherman',
      loading: false,
      allowedRoles: ['admin']
    });

    expect(decision).toBe('unauthorized');
  });

  it('allows authenticated users with required role', () => {
    const decision = getProtectedRouteDecision({
      user: { uid: 'u-1' },
      role: 'admin',
      loading: false,
      allowedRoles: ['admin']
    });

    expect(decision).toBe('allow');
  });
});
