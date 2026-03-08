export const voyageFilters = ['planned', 'active', 'completed', 'overdue', 'emergency'];

function toDate(value) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value;
  }

  const fromTimestamp = value?.toDate?.();
  if (fromTimestamp instanceof Date && !Number.isNaN(fromTimestamp.getTime())) {
    return fromTimestamp;
  }

  if (typeof value === 'string' || typeof value === 'number') {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  return null;
}

export function resolveVoyageStatus(trip, nowMs = Date.now()) {
  const rawStatus = String(trip?.status ?? 'planned');
  if (rawStatus === 'completed' || rawStatus === 'emergency' || rawStatus === 'planned') {
    return rawStatus;
  }

  const expectedReturn = toDate(trip?.expectedReturnTime);
  if (rawStatus === 'active' && expectedReturn && expectedReturn.getTime() <= nowMs) {
    return 'overdue';
  }

  return rawStatus === 'overdue' ? 'overdue' : 'active';
}

export function formatTimestamp(value) {
  const dateValue = toDate(value);
  if (!dateValue) {
    return '—';
  }
  return dateValue.toLocaleString();
}

export function tripStatusClassName(status) {
  return `trip-status-badge trip-status-${status}`;
}

export function tripRowClassName(status) {
  return status === 'overdue' ? 'trip-row-overdue' : '';
}
