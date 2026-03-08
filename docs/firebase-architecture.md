# HarborTrace SL Firebase Architecture

## 1) Frontend folder structure (feature-based)

```txt
frontend/
  src/
    app/
      providers/
      router/
      layouts/
    shared/
      components/
      hooks/
      lib/
      constants/
      types/
    firebase/
      config/
      services/
      mappers/
    features/
      auth/
      trips/
      landing/
      alerts/
      notices/
      traceability/
      admin/
```

### Frontend design principles
- Keep feature modules isolated (pages, components, hooks, services, types).
- Restrict direct Firebase SDK usage to `src/firebase/services` and feature service layers.
- Keep UI components stateless where possible; side effects live in hooks/services.

## 2) Firebase integration structure

```txt
firebase/
  firebase.json
  .firebaserc
  firestore.rules
  firestore.indexes.json
  tests/
    rules.test.ts

functions/
  src/
    config/
      firebaseAdmin.ts
    middleware/
      auth.ts
    shared/
      types/
      utils/
    features/
      users/
      trips/
      landing/
      alerts/
      notices/
      traceability/
      audit/
    index.ts
```

### Integration approach
- **Client SDK**: auth, read/query role-scoped data, limited safe writes.
- **Cloud Functions (trusted backend)**: verification, status transitions, traceability batch generation, immutable audit logging.
- **Security Rules**: enforce role-based access and ownership checks.

## 3) Firestore collections and document schema

## Root collections

### `users/{uid}`
- `uid: string`
- `role: 'fisherman' | 'harbor_officer' | 'buyer' | 'admin'`
- `displayName: string`
- `phone?: string`
- `harborId?: string`
- `isActive: boolean`
- `createdAt: timestamp`
- `updatedAt: timestamp`

### `harbors/{harborId}`
- `name: string`
- `district: string`
- `geo: geopoint`
- `createdAt: timestamp`

### `trips/{tripId}`
- `tripNo: string`
- `fishermanId: string`
- `vesselId: string`
- `harborId: string`
- `status: 'registered' | 'active' | 'overdue' | 'returned' | 'cancelled'`
- `departureAt: timestamp`
- `expectedReturnAt: timestamp`
- `actualReturnAt?: timestamp`
- `crewCount: number`
- `riskFlags: string[]`
- `createdBy: uid`
- `createdAt: timestamp`
- `updatedAt: timestamp`

Subcollection: `trips/{tripId}/statusHistory/{entryId}`
- `from: string`
- `to: string`
- `changedBy: uid`
- `changedAt: timestamp`
- `reason?: string`

### `incidentAlerts/{alertId}`
- `tripId: string`
- `fishermanId: string`
- `harborId: string`
- `severity: 'low' | 'medium' | 'high' | 'critical'`
- `message: string`
- `status: 'open' | 'acknowledged' | 'resolved'`
- `acknowledgedBy?: uid`
- `resolvedBy?: uid`
- `createdAt: timestamp`
- `updatedAt: timestamp`

### `landingIntakes/{intakeId}`
- `tripId: string`
- `fishermanId: string`
- `harborId: string`
- `species: string`
- `weightKg: number`
- `qualityGrade?: string`
- `verificationStatus: 'pending' | 'verified' | 'rejected'`
- `verifiedBy?: uid`
- `verifiedAt?: timestamp`
- `createdAt: timestamp`
- `updatedAt: timestamp`

### `batches/{batchId}`
- `batchCode: string`
- `intakeId: string`
- `tripId: string`
- `harborId: string`
- `species: string`
- `weightKg: number`
- `createdBy: uid`
- `createdAt: timestamp`

### `harborNotices/{noticeId}`
- `harborId: string`
- `title: string`
- `content: string`
- `priority: 'normal' | 'important' | 'urgent'`
- `publishedBy: uid`
- `publishedAt: timestamp`
- `expiresAt?: timestamp`

### `auditLogs/{logId}` (write-only from trusted backend)
- `actorUid: string`
- `actorRole: string`
- `action: string`
- `targetType: string`
- `targetId: string`
- `metadata: map`
- `createdAt: timestamp`

## 4) Cloud Functions structure

- `features/users`: profile bootstrap and admin role management.
- `features/trips`: trip status transitions, overdue scheduler hooks.
- `features/landing`: landing verification orchestration.
- `features/traceability`: batch code generation + linking.
- `features/alerts`: alert escalation and acknowledgement flows.
- `features/notices`: notice publish/unpublish automation.
- `features/audit`: centralized immutable audit writer utility.

Function patterns:
- Callable functions for authenticated role-gated actions.
- Firestore triggers for append-only histories and audit records.
- Scheduled functions for overdue-trip checks.

## 5) Firestore Security Rules strategy

- Deny-by-default baseline.
- Role resolved from `users/{request.auth.uid}.role`.
- Ownership checks for fisherman-owned trip and intake records.
- Harbor-scoped checks for harbor officers.
- Admin-only writes for role changes and global config.
- Buyer read-only access to verified landing + batches.
- `auditLogs`: no client writes, admin read only.

## 6) Role permissions matrix

| Resource | fisherman | harbor_officer | buyer | admin |
|---|---|---|---|---|
| users profile | R/W own basic fields | R own | R own | R/W all |
| trips | Create own, R own, limited updates | R harbor, update status | R verified/public fields only | R/W all |
| incidentAlerts | Create own, R own alerts | R/W harbor alerts | none | R/W all |
| landingIntakes | Create own, R own | R/W verification fields | R verified records | R/W all |
| batches | R related verified batches | R/W create on verified intake | R all | R/W all |
| harborNotices | R relevant harbor | Create/update for harbor | R all | R/W all |
| auditLogs | none | none | none | R only |

## 7) Page/component map

### Auth
- `/login`: LoginPage
- `/register`: RegisterPage

### Fisherman
- `/dashboard`: FishermanDashboard
- `/trips/new`: RegisterDeparturePage
- `/trips/active`: ActiveVoyagePage
- `/landing/new`: LandingIntakeFormPage
- `/alerts/new`: IncidentAlertFormPage

### Harbor Officer
- `/officer/dashboard`: OfficerDashboard
- `/officer/trips`: TripMonitoringPage
- `/officer/landing`: VerificationQueuePage
- `/officer/notices`: HarborNoticeManagerPage

### Buyer
- `/buyer/market`: VerifiedLandingPage
- `/buyer/batches/:batchId`: BatchTraceabilityPage

### Admin
- `/admin/users`: UserManagementPage
- `/admin/audit`: AuditLogPage
- `/admin/settings`: SystemSettingsPage

## 8) Emulator strategy for local testing

- Use Firebase Emulator Suite for Auth, Firestore, Functions.
- Seed users and test data via script before local runs.
- Run rules unit tests (`@firebase/rules-unit-testing`) in CI.
- Keep test matrix by role + resource + operation.
- Validate callable functions with emulated auth context.
- Block deployments if security rules tests fail.
