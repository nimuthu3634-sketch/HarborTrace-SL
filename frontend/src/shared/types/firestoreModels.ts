import type { Timestamp } from 'firebase/firestore';

export type AppRole = 'fisherman' | 'harbor_officer' | 'buyer' | 'admin';

export const COLLECTIONS = {
  users: 'users',
  vessels: 'vessels',
  harbors: 'harbors',
  trips: 'trips',
  emergencyAlerts: 'emergencyAlerts',
  catchLandings: 'catchLandings',
  fishBatches: 'fishBatches',
  notices: 'notices',
  auditLogs: 'auditLogs',
} as const;

export type TripStatus =
  | 'registered'
  | 'active'
  | 'overdue'
  | 'returned'
  | 'cancelled';

export type VerificationStatus = 'pending' | 'verified' | 'rejected';
export type AlertStatus = 'open' | 'acknowledged' | 'resolved' | 'dismissed';

interface TimestampFields {
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface TripDocument extends TimestampFields {
  tripNumber: string;
  vesselId: string;
  fishermanUid: string;
  departureHarborId: string;
  arrivalHarborId: string | null;
  status: TripStatus;
  departureAt: Timestamp;
  expectedReturnAt: Timestamp;
  actualReturnAt: Timestamp | null;
  crewCount: number;
  riskScore: number;
  createdByUid: string;
  createdByRole: AppRole;
}

export interface EmergencyAlertDocument extends TimestampFields {
  tripId: string;
  fishermanUid: string;
  harborId: string;
  status: AlertStatus;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  acknowledgedByUid: string | null;
  resolvedByUid: string | null;
  closedAt: Timestamp | null;
  tripStatus: TripStatus;
}

export interface CatchLandingDocument extends TimestampFields {
  landingNumber: string;
  tripId: string;
  harborId: string;
  fishermanUid: string;
  vesselId: string;
  speciesCode: string;
  speciesName: string;
  weightKg: number;
  qualityGrade: 'A' | 'B' | 'C' | null;
  verificationStatus: VerificationStatus;
  verifiedByUid: string | null;
  verifiedAt: Timestamp | null;
  tripStatus: TripStatus;
}

export const DASHBOARD_FILTER_FIELDS = {
  tripStatus: 'status',
  verificationStatus: 'verificationStatus',
  alertStatus: 'status',
} as const;
