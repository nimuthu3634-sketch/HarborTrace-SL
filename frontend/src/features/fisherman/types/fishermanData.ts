import type { Timestamp } from 'firebase/firestore';
import type { AlertStatus, TripStatus } from '../../../shared/types/firestoreModels';

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

export interface FishermanDashboardData {
  profile: FishermanProfile;
  activeTrip: FishermanTrip | null;
  tripHistory: FishermanTrip[];
  notices: FishermanNotice[];
  alerts: FishermanAlert[];
}
