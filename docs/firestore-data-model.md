# HarborTrace SL Firestore Data Model

This data model uses flat, query-friendly documents for dashboard workloads and role-scoped access patterns.

## Collection naming

All collection names use `camelCase` and align with product language:

- `users`
- `vessels`
- `harbors`
- `trips`
- `emergencyAlerts`
- `catchLandings`
- `fishBatches`
- `notices`
- `auditLogs`

---

## Document shapes

### `users/{uid}`

```ts
{
  uid: string;
  email: string;
  displayName: string;
  role: 'fisherman' | 'harbor_officer' | 'buyer' | 'admin';
  isActive: boolean;
  homeHarborId: string | null;
  phoneNumber: string | null;
  createdByUid: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### `vessels/{vesselId}`

```ts
{
  registrationNumber: string;
  vesselName: string;
  ownerUid: string;
  ownerRole: 'fisherman' | 'admin';
  homeHarborId: string;
  vesselType: 'motorized' | 'non_motorized' | 'multi_day';
  capacityTons: number;
  isActive: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### `harbors/{harborId}`

```ts
{
  harborCode: string;
  harborName: string;
  district: string;
  province: string;
  latitude: number;
  longitude: number;
  contactPhone: string | null;
  managedByUid: string | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### `trips/{tripId}`

```ts
{
  tripNumber: string;
  vesselId: string;
  fishermanUid: string;
  departureHarborId: string;
  arrivalHarborId: string | null;
  status: 'registered' | 'active' | 'overdue' | 'returned' | 'cancelled';
  departureAt: Timestamp;
  expectedReturnAt: Timestamp;
  actualReturnAt: Timestamp | null;
  crewCount: number;
  riskScore: number;
  createdByUid: string;
  createdByRole: 'fisherman' | 'harbor_officer' | 'buyer' | 'admin';
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### `emergencyAlerts/{alertId}`

```ts
{
  tripId: string;
  fishermanUid: string;
  harborId: string;
  status: 'open' | 'acknowledged' | 'resolved' | 'dismissed';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  acknowledgedByUid: string | null;
  resolvedByUid: string | null;
  closedAt: Timestamp | null;
  tripStatus: 'registered' | 'active' | 'overdue' | 'returned' | 'cancelled';
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### `catchLandings/{landingId}`

```ts
{
  landingNumber: string;
  tripId: string;
  harborId: string;
  fishermanUid: string;
  vesselId: string;
  speciesCode: string;
  speciesName: string;
  weightKg: number;
  qualityGrade: 'A' | 'B' | 'C' | null;
  verificationStatus: 'pending' | 'verified' | 'rejected';
  verifiedByUid: string | null;
  verifiedAt: Timestamp | null;
  tripStatus: 'registered' | 'active' | 'overdue' | 'returned' | 'cancelled';
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### `fishBatches/{batchId}`

```ts
{
  batchCode: string;
  landingId: string;
  tripId: string;
  harborId: string;
  speciesCode: string;
  netWeightKg: number;
  verificationStatus: 'pending' | 'verified' | 'rejected';
  generatedByUid: string;
  generatedByRole: 'fisherman' | 'harbor_officer' | 'buyer' | 'admin';
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### `notices/{noticeId}`

```ts
{
  title: string;
  body: string;
  harborId: string | null;
  status: 'draft' | 'published' | 'archived';
  priority: 'normal' | 'important' | 'urgent';
  targetRoles: ('fisherman' | 'harbor_officer' | 'buyer' | 'admin')[];
  publishedAt: Timestamp | null;
  expiresAt: Timestamp | null;
  createdByUid: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### `auditLogs/{logId}`

```ts
{
  actorUid: string;
  actorRole: 'fisherman' | 'harbor_officer' | 'buyer' | 'admin';
  action: string;
  actionStatus: 'success' | 'failure';
  entityCollection:
    | 'users'
    | 'vessels'
    | 'harbors'
    | 'trips'
    | 'emergencyAlerts'
    | 'catchLandings'
    | 'fishBatches'
    | 'notices'
    | 'auditLogs';
  entityId: string;
  ownerUid: string | null;
  harborId: string | null;
  details: Record<string, unknown>;
  createdAt: Timestamp;
}
```

---

## Queryability guidelines

- Dashboard filters are first-class fields: `trips.status`, `catchLandings.verificationStatus`, and `emergencyAlerts.status`.
- Ownership and role references are flat (`ownerUid`, `fishermanUid`, `createdByUid`, `actorRole`) to avoid nested map filtering.
- `tripStatus` is denormalized into `catchLandings` and `emergencyAlerts` so dashboards can segment records without client-side joins.
- Every mutable domain document includes `createdAt` + `updatedAt`.
- `auditLogs` is append-only and keeps `createdAt` only.
