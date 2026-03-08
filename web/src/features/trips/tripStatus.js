export const voyageFilters = ['planned', 'active', 'completed', 'overdue', 'emergency'];

export function resolveVoyageStatus(trip) {
  const rawStatus = String(trip?.status ?? 'planned');
  if (rawStatus === 'emergency' || rawStatus === 'completed' || rawStatus === 'planned') {
    return rawStatus;
  }

  const expectedReturn = trip?.expectedReturnTime?.toDate?.();
  if (expectedReturn instanceof Date && !Number.isNaN(expectedReturn.getTime()) && expectedReturn.getTime() < Date.now()) {
    return 'overdue';
  }

  return rawStatus === 'active' ? 'active' : 'planned';
}

export function formatTimestamp(value) {
  const dateValue = value?.toDate?.();
  if (!(dateValue instanceof Date) || Number.isNaN(dateValue.getTime())) {
    return '—';
  }
  return dateValue.toLocaleString();
}
