import { useEffect, useMemo, useState } from 'react';
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
  type QueryDocumentSnapshot,
  type Timestamp,
} from 'firebase/firestore';
import { COLLECTIONS, type AlertStatus, type TripStatus } from '../../../shared/types/firestoreModels';

export interface FishermanProfile {
  uid: string;
  displayName: string;
  phoneNumber?: string;
  role: string;
}

export interface FishermanTrip {
  id: string;
  tripNumber: string;
  departureAt: Timestamp;
  expectedReturnAt?: Timestamp;
  actualReturnAt?: Timestamp;
  crewCount?: number;
  status: TripStatus;
}

export interface FishermanNotice {
  id: string;
  title: string;
  message: string;
  severity?: 'info' | 'warning' | 'critical';
  createdAt?: Timestamp;
}

export interface FishermanAlert {
  id: string;
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: AlertStatus;
  createdAt?: Timestamp;
}

interface FishermanDataState {
  loading: boolean;
  error: string | null;
  profile: FishermanProfile | null;
  activeTrip: FishermanTrip | null;
  tripHistory: FishermanTrip[];
  notices: FishermanNotice[];
  alerts: FishermanAlert[];
}

const initialState: FishermanDataState = {
  loading: true,
  error: null,
  profile: null,
  activeTrip: null,
  tripHistory: [],
  notices: [],
  alerts: [],
};

function asDateField(value: DocumentData): Timestamp | undefined {
  return value && typeof value.toDate === 'function' ? (value as Timestamp) : undefined;
}

function mapTrip(snapshot: QueryDocumentSnapshot<DocumentData>): FishermanTrip {
  const data = snapshot.data();
  return {
    id: snapshot.id,
    tripNumber: data.tripNumber ?? snapshot.id,
    departureAt: data.departureAt,
    expectedReturnAt: asDateField(data.expectedReturnAt),
    actualReturnAt: asDateField(data.actualReturnAt),
    crewCount: data.crewCount,
    status: (data.status ?? 'registered') as TripStatus,
  };
}

function mapNotice(snapshot: QueryDocumentSnapshot<DocumentData>): FishermanNotice {
  const data = snapshot.data();
  return {
    id: snapshot.id,
    title: data.title ?? 'Notice',
    message: data.message ?? '',
    severity: data.severity ?? 'info',
    createdAt: asDateField(data.createdAt),
  };
}

function mapAlert(snapshot: QueryDocumentSnapshot<DocumentData>): FishermanAlert {
  const data = snapshot.data();
  return {
    id: snapshot.id,
    message: data.message ?? 'Incident alert',
    severity: data.severity ?? 'low',
    status: data.status ?? 'open',
    createdAt: asDateField(data.createdAt),
  };
}

export function useFishermanData() {
  const [state, setState] = useState<FishermanDataState>(initialState);

  useEffect(() => {
    let active = true;

    async function loadData() {
      try {
        const user = auth.currentUser;
        if (!user) {
          throw new Error('You need to sign in to view your dashboard.');
        }

        const profileDoc = await getDoc(doc(db, COLLECTIONS.users, user.uid));
        const profileData = profileDoc.data() as FishermanProfile | undefined;

        if (!profileData) {
          throw new Error('Fisherman profile not found.');
        }

        const activeTripQuery = query(
          collection(db, COLLECTIONS.trips),
          where('fishermanUid', '==', user.uid),
          where('status', 'in', ['registered', 'active', 'overdue']),
          orderBy('departureAt', 'desc'),
          limit(1),
        );

        const tripHistoryQuery = query(
          collection(db, COLLECTIONS.trips),
          where('fishermanUid', '==', user.uid),
          orderBy('departureAt', 'desc'),
          limit(20),
        );

        const noticesQuery = query(
          collection(db, COLLECTIONS.notices),
          where('targetRoles', 'array-contains', 'fisherman'),
          orderBy('createdAt', 'desc'),
          limit(5),
        );

        const alertQuery = query(
          collection(db, COLLECTIONS.emergencyAlerts),
          where('fishermanUid', '==', user.uid),
          orderBy('createdAt', 'desc'),
          limit(5),
        );

        const [activeTripSnapshot, tripHistorySnapshot, noticesSnapshot, alertSnapshot] = await Promise.all([
          getDocs(activeTripQuery),
          getDocs(tripHistoryQuery),
          getDocs(noticesQuery),
          getDocs(alertQuery),
        ]);

        if (!active) {
          return;
        }

        setState({
          loading: false,
          error: null,
          profile: {
            uid: profileData.uid,
            displayName: profileData.displayName ?? 'Fisherman',
            phoneNumber: profileData.phoneNumber,
            role: profileData.role,
          },
          activeTrip: activeTripSnapshot.docs[0] ? mapTrip(activeTripSnapshot.docs[0]) : null,
          tripHistory: tripHistorySnapshot.docs.map(mapTrip),
          notices: noticesSnapshot.docs.map(mapNotice),
          alerts: alertSnapshot.docs.map(mapAlert),
        });
      } catch (error) {
        if (!active) {
          return;
        }
        setState((current) => ({
          ...current,
          loading: false,
          error: error instanceof Error ? error.message : 'Failed to load dashboard data.',
        }));
      }
    }

    loadData();

    return () => {
      active = false;
    };
  }, []);

  return useMemo(() => state, [state]);
}
