import type { Timestamp } from 'firebase/firestore';

export function formatDateTime(timestamp: Timestamp) {
  return timestamp.toDate().toLocaleString();
}

export function formatMaybeDate(timestamp?: Timestamp) {
  return timestamp ? formatDateTime(timestamp) : 'N/A';
}
