import { Timestamp } from 'firebase-admin/firestore';

type TripStatus = 'planned' | 'active' | 'completed' | 'overdue' | 'emergency';

type TripStatusInput = {
  status?: unknown;
  expectedReturnTime?: unknown;
};

function toDate(value: unknown): Date | null {
  if (value instanceof Timestamp) {
    return value.toDate();
  }

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value;
  }

  if (typeof value === 'string' || typeof value === 'number') {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  if (typeof value === 'object' && value !== null && 'toDate' in value && typeof (value as { toDate?: unknown }).toDate === 'function') {
    const converted = (value as { toDate: () => Date }).toDate();
    return converted instanceof Date && !Number.isNaN(converted.getTime()) ? converted : null;
  }

  return null;
}

export function resolveTripStatus(trip: TripStatusInput, nowMs = Date.now()): TripStatus {
  const rawStatus = String(trip.status ?? 'planned') as TripStatus;

  if (rawStatus === 'completed' || rawStatus === 'emergency' || rawStatus === 'planned') {
    return rawStatus;
  }

  const expectedReturn = toDate(trip.expectedReturnTime);
  if (rawStatus === 'active' && expectedReturn && expectedReturn.getTime() <= nowMs) {
    return 'overdue';
  }

  return rawStatus === 'overdue' ? 'overdue' : 'active';
}

