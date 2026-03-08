import type { AppRole } from './roles';

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

export type CollectionName = (typeof COLLECTIONS)[keyof typeof COLLECTIONS];

export type TripStatus =
  | 'registered'
  | 'active'
  | 'overdue'
  | 'returned'
  | 'cancelled';

export type VerificationStatus = 'pending' | 'verified' | 'rejected';

export type AlertStatus = 'open' | 'acknowledged' | 'resolved' | 'dismissed';

export type NoticeStatus = 'draft' | 'published' | 'archived';

export type AuditActionStatus = 'success' | 'failure';

export interface TimestampFields {
  createdAt: FirebaseFirestore.Timestamp;
  updatedAt: FirebaseFirestore.Timestamp;
}

export interface UserDocument extends TimestampFields {
  uid: string;
  email: string;
  displayName: string;
  role: AppRole;
  isActive: boolean;
  homeHarborId: string | null;
  phoneNumber: string | null;
  createdByUid: string;
}

export interface VesselDocument extends TimestampFields {
  registrationNumber: string;
  vesselName: string;
  ownerUid: string;
  ownerRole: Extract<AppRole, 'fisherman' | 'admin'>;
  homeHarborId: string;
  vesselType: 'motorized' | 'non_motorized' | 'multi_day';
  capacityTons: number;
  isActive: boolean;
}

export interface HarborDocument extends TimestampFields {
  harborCode: string;
  harborName: string;
  district: string;
  province: string;
  latitude: number;
  longitude: number;
  contactPhone: string | null;
  managedByUid: string | null;
}

export interface TripDocument extends TimestampFields {
  tripNumber: string;
  vesselId: string;
  fishermanUid: string;
  departureHarborId: string;
  arrivalHarborId: string | null;
  status: TripStatus;
  departureAt: FirebaseFirestore.Timestamp;
  expectedReturnAt: FirebaseFirestore.Timestamp;
  actualReturnAt: FirebaseFirestore.Timestamp | null;
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
  closedAt: FirebaseFirestore.Timestamp | null;
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
  verifiedAt: FirebaseFirestore.Timestamp | null;
  tripStatus: TripStatus;
}

export interface FishBatchDocument extends TimestampFields {
  batchCode: string;
  landingId: string;
  tripId: string;
  harborId: string;
  speciesCode: string;
  netWeightKg: number;
  verificationStatus: VerificationStatus;
  generatedByUid: string;
  generatedByRole: AppRole;
}

export interface NoticeDocument extends TimestampFields {
  title: string;
  body: string;
  harborId: string | null;
  status: NoticeStatus;
  priority: 'normal' | 'important' | 'urgent';
  targetRoles: AppRole[];
  publishedAt: FirebaseFirestore.Timestamp | null;
  expiresAt: FirebaseFirestore.Timestamp | null;
  createdByUid: string;
}

export interface AuditLogDocument {
  createdAt: FirebaseFirestore.Timestamp;
  actorUid: string;
  actorRole: AppRole;
  action: string;
  actionStatus: AuditActionStatus;
  entityCollection: CollectionName;
  entityId: string;
  ownerUid: string | null;
  harborId: string | null;
  details: Record<string, unknown>;
}

export const DASHBOARD_FILTER_FIELDS = {
  tripStatus: 'status',
  verificationStatus: 'verificationStatus',
  alertStatus: 'status',
} as const;

export const docPath = {
  user: (uid: string) => `${COLLECTIONS.users}/${uid}`,
  vessel: (vesselId: string) => `${COLLECTIONS.vessels}/${vesselId}`,
  harbor: (harborId: string) => `${COLLECTIONS.harbors}/${harborId}`,
  trip: (tripId: string) => `${COLLECTIONS.trips}/${tripId}`,
  emergencyAlert: (alertId: string) => `${COLLECTIONS.emergencyAlerts}/${alertId}`,
  catchLanding: (landingId: string) => `${COLLECTIONS.catchLandings}/${landingId}`,
  fishBatch: (batchId: string) => `${COLLECTIONS.fishBatches}/${batchId}`,
  notice: (noticeId: string) => `${COLLECTIONS.notices}/${noticeId}`,
  auditLog: (logId: string) => `${COLLECTIONS.auditLogs}/${logId}`,
};
