# HarborTrace SL Architecture Plan

## 1) Repository inspection
Current repository had only a baseline README with product and security requirements. No app code existed yet.

## 2) Proposed folder structure

```txt
.
├── web/                        # React + Vite frontend
│   ├── src/
│   │   ├── app/                # app shell + route guards
│   │   ├── components/         # reusable UI components
│   │   ├── features/           # feature modules grouped by domain
│   │   ├── lib/                # firebase client + helpers
│   │   ├── pages/              # route pages
│   │   └── styles/             # global styles
├── functions/                  # Cloud Functions for Firebase
│   └── src/
├── tests/
│   └── rules/                  # emulator-backed Firestore rules tests
├── firestore.rules
├── firestore.indexes.json
└── firebase.json
```

## 3) Firestore collections and document shapes

- `users/{uid}`
  - `uid`, `displayName`, `email`, `role`, `defaultHarborId`, `createdAt`
- `trips/{tripId}`
  - `fishermanUid`, `vesselId`, `harborId`, `departureAt`, `expectedReturnAt`, `status`, `notes`, `createdAt`, `updatedAt`
- `alerts/{alertId}`
  - `fishermanUid`, `tripId`, `location`, `message`, `severity`, `status`, `createdAt`, `resolvedAt`
- `landings/{landingId}`
  - `tripId`, `fishermanUid`, `harborId`, `speciesItems[]`, `totalWeightKg`, `status`, `verifiedBy`, `verifiedAt`, `createdAt`
- `batches/{batchId}`
  - `batchCode`, `landingId`, `species`, `weightKg`, `qualityGrade`, `verified`, `verifiedByOfficerUid`, `createdAt`
- `notices/{noticeId}`
  - `title`, `body`, `scope`, `harborId`, `priority`, `createdBy`, `createdAt`, `expiresAt`
- `vessels/{vesselId}`
  - `name`, `registrationNo`, `ownerUid`, `capacityKg`, `active`, `createdAt`
- `harbors/{harborId}`
  - `name`, `district`, `geo`, `active`, `createdAt`
- `auditLogs/{logId}`
  - `actorUid`, `actorRole`, `action`, `targetType`, `targetId`, `meta`, `createdAt`
- `analytics/{docId}`
  - pre-aggregated dashboards for admins (write-only from trusted backend)

## 4) Role permissions

- `fisherman`
  - manage own trips, create SOS alerts, submit landings, manage own vessels
- `harbor_officer`
  - read operational records, verify landings, publish notices, assist vessel/landing workflows
- `buyer`
  - read verified landing/batch data and public verification pages
- `admin`
  - full governance, harbor management, user role oversight, analytics and audit views

## 5) Route/page map

- `/login`
- `/` dashboard (role-aware)
- `/trips`
- `/alerts`
- `/landings`
- `/batches`
- `/verify/:batchCode` (limited public traceability)
- `/notices`
- `/vessels`
- `/harbors`
- `/audit`
- `/analytics`

## 6) Cloud Functions planned

- `verifyLanding` callable: trusted officer/admin verification, writes audit log
- `generateFishBatch` callable: creates immutable batch record and trace code, writes audit log
- `publishNotice` callable: protected notice publishing for officer/admin, writes audit log
- `onLandingCreated` trigger: server-side audit trail record

## 7) Security Rules strategy

- derive role from `users/{uid}`
- prevent role escalation by blocking user self-role updates
- keep `batches`, `auditLogs`, and analytics writes server-only
- open read-only public view only where appropriate (`batches`, `harbors`, `notices`)
- enforce least privilege per role and document ownership checks

## 8) Implementation phases

1. foundation setup (frontend + firebase + docs)
2. auth + role-aware routing + core modules
3. trusted backend functions + audit logging
4. security rules + emulator tests + polish
