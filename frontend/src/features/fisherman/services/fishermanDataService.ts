import { auth, db } from '../../../firebase/config/firebaseClient';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  where,
  type DocumentData,
  type Query,
  type QueryDocumentSnapshot,
  type Timestamp,
} from 'firebase/firestore';
import { COLLECTIONS, type TripStatus } from '../../../shared/types/firestoreModels';
import type {
  FishermanAlert,
  FishermanDashboardData,
  FishermanNotice,
  FishermanProfile,
  FishermanTrip,
} from '../types/fishermanData';

const ACTIVE_TRIP_STATUSES: TripStatus[] = ['registered', 'active', 'overdue'];
const DASHBOARD_TRIP_HISTORY_LIMIT = 20;
const DASHBOARD_NOTICE_LIMIT = 5;
const DASHBOARD_ALERT_LIMIT = 5;

function toTimestamp(value: unknown): Timestamp | undefined {
  return value && typeof value === 'object' && 'toDate' in value && typeof value.toDate === 'function'
    ? (value as Timestamp)
    : undefined;
}

function mapTrip(snapshot: QueryDocumentSnapshot<DocumentData>): FishermanTrip {
  const data = snapshot.data();
  return {
    id: snapshot.id,
    tripNumber: typeof data.tripNumber === 'string' ? data.tripNumber : snapshot.id,
    departureAt: data.departureAt as Timestamp,
    expectedReturnAt: toTimestamp(data.expectedReturnAt),
    actualReturnAt: toTimestamp(data.actualReturnAt),
    crewCount: typeof data.crewCount === 'number' ? data.crewCount : undefined,
    status: (data.status ?? 'registered') as TripStatus,
  };
}

function mapNotice(snapshot: QueryDocumentSnapshot<DocumentData>): FishermanNotice {
  const data = snapshot.data();
  return {
    id: snapshot.id,
    title: typeof data.title === 'string' ? data.title : 'Notice',
    message: typeof data.message === 'string' ? data.message : '',
    severity: data.severity ?? 'info',
    createdAt: toTimestamp(data.createdAt),
  };
}

function mapAlert(snapshot: QueryDocumentSnapshot<DocumentData>): FishermanAlert {
  const data = snapshot.data();
  return {
    id: snapshot.id,
    message: typeof data.message === 'string' ? data.message : 'Incident alert',
    severity: data.severity ?? 'low',
    status: data.status ?? 'open',
    createdAt: toTimestamp(data.createdAt),
  };
}

async function getRequiredFishermanProfile(uid: string): Promise<FishermanProfile> {
  const profileSnapshot = await getDoc(doc(db, COLLECTIONS.users, uid));
  const profile = profileSnapshot.data() as FishermanProfile | undefined;

  if (!profile) {
    throw new Error('Fisherman profile not found.');
  }

  return {
    uid: profile.uid,
    displayName: profile.displayName ?? 'Fisherman',
    phoneNumber: profile.phoneNumber,
    role: profile.role,
  };
}

function buildFishermanDashboardQueries(uid: string): {
  activeTrip: Query<DocumentData>;
  tripHistory: Query<DocumentData>;
  notices: Query<DocumentData>;
  alerts: Query<DocumentData>;
} {
  const tripsCollection = collection(db, COLLECTIONS.trips);

  return {
    activeTrip: query(
      tripsCollection,
      where('fishermanUid', '==', uid),
      where('status', 'in', ACTIVE_TRIP_STATUSES),
      orderBy('departureAt', 'desc'),
      limit(1),
    ),
    tripHistory: query(
      tripsCollection,
      where('fishermanUid', '==', uid),
      orderBy('departureAt', 'desc'),
      limit(DASHBOARD_TRIP_HISTORY_LIMIT),
    ),
    notices: query(
      collection(db, COLLECTIONS.notices),
      where('targetRoles', 'array-contains', 'fisherman'),
      orderBy('createdAt', 'desc'),
      limit(DASHBOARD_NOTICE_LIMIT),
    ),
    alerts: query(
      collection(db, COLLECTIONS.emergencyAlerts),
      where('fishermanUid', '==', uid),
      orderBy('createdAt', 'desc'),
      limit(DASHBOARD_ALERT_LIMIT),
    ),
  };
}

export async function fetchFishermanDashboardData(): Promise<FishermanDashboardData> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('You need to sign in to view your dashboard.');
  }

  const profile = await getRequiredFishermanProfile(user.uid);
  const dashboardQueries = buildFishermanDashboardQueries(user.uid);

  const [activeTripSnapshot, tripHistorySnapshot, noticesSnapshot, alertsSnapshot] = await Promise.all([
    getDocs(dashboardQueries.activeTrip),
    getDocs(dashboardQueries.tripHistory),
    getDocs(dashboardQueries.notices),
    getDocs(dashboardQueries.alerts),
  ]);

  return {
    profile,
    activeTrip: activeTripSnapshot.docs[0] ? mapTrip(activeTripSnapshot.docs[0]) : null,
    tripHistory: tripHistorySnapshot.docs.map(mapTrip),
    notices: noticesSnapshot.docs.map(mapNotice),
    alerts: alertsSnapshot.docs.map(mapAlert),
  };
}
