# HarborTrace SL

HarborTrace SL is a **Firebase-powered fisheries operations and traceability platform** designed for Sri Lanka. It supports the full operational lifecycle from trip departure registration, active-voyage monitoring, and emergency alerting to landing verification and buyer-facing batch traceability.

This repository is structured as a final-year university project monorepo, with a production-style architecture suitable for technical demonstrations.

## Project overview

### Problem statement
Fishing operations involve multiple actors (fishermen, harbor officers, buyers, and regulators), but records are often fragmented across paper forms, calls, and disconnected systems. This creates delays in:
- safety response,
- landing verification,
- traceability for buyers,
- and audit/compliance reviews.

### Project goal
HarborTrace SL centralizes these workflows into a role-based digital platform with:
- authenticated access,
- secure Firestore data controls,
- trusted backend workflows via Cloud Functions,
- and auditable operations for governance.

## User roles

HarborTrace SL currently supports 4 application roles:

- **fisherman**
  - register trips,
  - submit emergency alerts,
  - submit landing intake data,
  - view own operational records.
- **harbor_officer**
  - monitor trips and alerts,
  - verify landing intakes,
  - manage notices,
  - support vessel/harbor operations.
- **buyer**
  - access buyer-safe, verified batch traceability information.
- **admin**
  - full governance visibility,
  - role-sensitive administration,
  - audit and analytics access.

## Main modules

### Frontend modules (`web/`)

Feature and page modules include:
- Authentication and session profile handling
- Trips (registration, active/overdue monitoring, details)
- Emergency alerts
- Landings (submission and verification views)
- Batch traceability and verification
- Notices
- Vessels
- Harbors
- Audit (admin)
- Analytics (admin)

### Backend modules (`functions/`)

Cloud Functions are organized by domain:
- `users`
- `trips`
- `landing`
- `traceability`
- `alerts`
- `notices`
- `auth`
- `vessels`
- `harbors`

Each domain encapsulates callable endpoints and shared validation/audit utilities.

## Project structure

```text
HarborTrace-SL/
├─ web/                 # React frontend (role-based UI + i18n)
├─ functions/           # Firebase Cloud Functions (TypeScript)
├─ firebase/            # Emulator seeding and support scripts
├─ tests/               # Security rules + emulator integration tests
├─ docs/                # Architecture and data-model documentation
├─ firestore.rules      # Firestore security policy
└─ firebase.json        # Emulator and Firebase project config
```

## Firebase architecture

HarborTrace SL uses a layered Firebase architecture:

1. **Frontend (React + Firebase Client SDK)**
   - Firebase Auth for user sign-in,
   - Firestore reads/writes for role-scoped data,
   - callable Functions invocation for trusted operations.

2. **Cloud Functions for Firebase (TypeScript)**
   - business-critical workflows (verification, status transitions, batch generation),
   - server-side authorization checks,
   - centralized audit logging.

3. **Cloud Firestore**
   - operational data store for users, trips, alerts, landings, batches, notices, and audit logs.

4. **Firestore Security Rules**
   - enforce least privilege and ownership constraints,
   - prevent role escalation from clients,
   - reserve sensitive writes for trusted server paths.

5. **Firebase Emulator Suite**
   - local Auth + Firestore + Functions integration,
   - rules testing and callable workflow testing.

## Firestore collections

Primary collections used by the current implementation:

- `users` – identity profile + role mapping
- `vessels` – vessel registration/ownership data
- `harbors` – harbor metadata
- `trips` – departure and trip lifecycle data
- `emergencyAlerts` – SOS/incident alerts
- `landings` – catch landing submissions + verification state
- `fishBatches` – traceability records generated after landing verification
- `batchPublicVerifications` – public read-only verification payloads
- `notices` – operational bulletins
- `auditLogs` – immutable audit trail
- `analytics` – admin analytics documents



## Route protection matrix

All routes are authenticated by default except `/login` and `/verify/:batchCode?`.

- **fisherman**: `/trips`, `/trips/register`, `/trips/:tripId`, `/alerts`, `/landings`, `/landings/new`, `/landings/:landingId`, `/notices`, `/notices/:noticeId`
- **harbor_officer**: fisherman operational reads plus `/batches`, `/batches/verify/:batchCode`, `/vessels`, `/vessels/:vesselId`, `/harbors`, `/harbors/:harborId`, `/officer/*`
- **buyer**: `/batches`, `/batches/verify/:batchCode`, `/notices`, `/notices/:noticeId`
- **admin**: all officer routes plus `/audit` and `/analytics`

If a signed-in user has no resolved role profile, the app routes them to `/unauthorized` instead of rendering protected screens.

## End-to-end workflow status

Implemented and integrated workflows:
- Trip registration and officer/admin status transitions.
- Fisherman SOS alert submission and officer/admin resolution.
- Landing intake submission, officer/admin verification, and fish batch generation.
- Buyer-safe batch verification lookup (public and authenticated flows).
- Notice publication, vessel/harbor management, and admin audit review.
- Auth attempt auditing and role-scoped session profile retrieval.

## Cloud Functions overview

Exported functions include callable APIs and one scheduled task:

- **Auth/session**
  - `getSessionProfile`
  - `logAuthAttempt`
- **Users**
  - `listFishermen`
  - `getFishermanDetail`
  - `createFisherman`
  - `updateFisherman`
- **Trips**
  - `createTrip`
  - `transitionTripStatus`
  - `updateOverdueTripStatuses` *(scheduled)*
- **Landings**
  - `submitLandingIntake`
  - `verifyLandingIntake`
- **Traceability**
  - `generateBatchCode`
- **Alerts**
  - `submitEmergencyAlert`
  - `updateEmergencyAlertStatus`
- **Notices**
  - `createNotice`
  - `updateNotice`
- **Vessels**
  - `createVessel`
  - `updateVessel`
- **Harbors**
  - `createHarbor`
  - `updateHarbor`

## Firestore Security Rules overview

Security rules are role-aware and default-deny. Key design points:

- **Central role lookup** from `users/{uid}` via helper functions.
- **Role escalation prevention**
  - client user creation is limited to non-elevated roles,
  - self-updates cannot change immutable identity/role fields.
- **Ownership checks**
  - fishermen can only read/write their own trips/alerts/landings (where allowed).
- **Operational controls**
  - officers/admins can perform operational updates,
  - sensitive collections (e.g., `auditLogs`, `analytics`) are restricted.
- **Server-only paths for critical writes**
  - vessel/harbor/notice writes are blocked in client rules to enforce trusted backend + audit flow.
- **Explicit public read exception**
  - `batchPublicVerifications` is intentionally world-readable for verification use-cases.

## Local setup steps

### 1) Prerequisites
- Node.js 20+ recommended
- npm 10+
- Firebase CLI (`firebase-tools`)

### 2) Install dependencies
From repo root:

```bash
npm install
npm run install:all
```

### 3) Configure frontend environment

```bash
cp web/.env.example web/.env.local
```

Fill values in `web/.env.local` from Firebase Console.

### 4) Firebase CLI project selection

```bash
firebase login
firebase use harbortrace-sl-dev
```

## Emulator setup steps

### 1) Build functions
```bash
npm run build:functions
```

### 2) Start local emulator suite
```bash
npm run dev:emulators
```

This starts:
- Auth emulator on `localhost:9099`
- Firestore emulator on `localhost:8080`
- Functions emulator on `localhost:5001`
- Emulator UI on `localhost:4000`

### 3) Seed demo data (optional, recommended for demo)
```bash
npm run seed:demo
```

## Environment variables

`web/.env.example` contains required variables:

### Firebase Web SDK config
- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`
- `VITE_FIREBASE_FUNCTIONS_REGION`

### Emulator config
- `VITE_USE_EMULATORS`
- `VITE_FIREBASE_EMULATOR_HOST`
- `VITE_FIREBASE_AUTH_EMULATOR_PORT`
- `VITE_FIRESTORE_EMULATOR_PORT`
- `VITE_FIREBASE_FUNCTIONS_EMULATOR_PORT`

## How to run locally

### Option A: Full local (recommended)
Terminal 1:
```bash
npm run dev:emulators
```

Terminal 2:
```bash
npm run dev:web
```

### Option B: Frontend-only build check
```bash
npm run build:web
```

## How to run tests

### Frontend route guard test
```bash
npm run test:web
```

### Frontend lint check
```bash
npm run lint:web
```

### Firestore rules tests
```bash
npm run test:rules
```

### Callable Cloud Functions emulator tests
```bash
npm run test:functions:emulator
```

### Full local test pipeline
```bash
npm run test:local
```

## Demo credentials

After running `npm run seed:demo`, use the following accounts:

- `admin.demo@harbortrace.lk` / `DemoPass#2026`
- `officer.colombo@harbortrace.lk` / `DemoPass#2026`
- `officer.galle@harbortrace.lk` / `DemoPass#2026`
- `fisher.kalpitiya@harbortrace.lk` / `DemoPass#2026`
- `fisher.negombo@harbortrace.lk` / `DemoPass#2026`
- `fisher.trinco@harbortrace.lk` / `DemoPass#2026`
- `buyer.demo@harbortrace.lk` / `DemoPass#2026`

> Use demo credentials only in local emulator/testing environments.

## Security features

- Firebase Authentication (email/password)
- Role-based access control through Firestore profile mapping
- Firestore Security Rules with ownership and immutable-field constraints
- Default-deny fallback rules for unknown paths
- Trusted operations delegated to Cloud Functions (not client writes)
- Audit logging for high-value actions (including auth events and operational updates)
- Public verification data isolated to dedicated read-only collection

## Known limitations

- Some collection naming is still being consolidated (`landings` vs `catchLandings`, `batches` vs `fishBatches`).
- Current automated tests focus on representative flows (route guards, rules checks, key callable flows) rather than exhaustive end-to-end UI coverage.
- Observability is basic (console/emulator-centric) and does not yet include production monitoring dashboards.
- Fine-grained performance optimization (query tuning at scale, pagination strategy) is still in progress.
- Frontend production bundle is currently a single large chunk and would benefit from route-level code splitting.

## Future improvements

- Consolidate and migrate all collection naming into one final schema contract.
- Add stronger CI/CD quality gates (lint + tests + rules validation + deploy checks).
- Expand end-to-end test automation (multi-role UI and cross-module workflows).
- Integrate production-grade monitoring/alerting and error tracking.
- Add multilingual UX support and accessibility refinements for broader field adoption.
- Introduce richer analytics and predictive safety insights (e.g., risk forecasting).
- Harden secure public traceability pages with anti-abuse controls and rate limiting.

---

For architecture references, see:
- `docs/architecture.md`
- `docs/firebase-architecture.md`
- `docs/firestore-data-model.md`


## Localization (en / si / ta)

The `web/` application uses a React context-based i18n provider (`I18nProvider`) with resource files under `web/src/locales/`.

- **Supported locales**: `en`, `si`, `ta`
- **Fallback locale**: `en`
- **Language detection order**: localStorage (`harbortrace.locale`) then browser language
- **Switcher UI**: login screen and app header
- **Persisted preference**:
  - localStorage key: `harbortrace.locale`
  - Firestore user profile field: `users/{uid}.preferredLanguage` (`en|si|ta`)

### Add a new translation key
1. Add the key to `web/src/locales/en.json`.
2. Add corresponding entries in `web/src/locales/si.json` and `web/src/locales/ta.json`.
3. Use `useI18n()` and `t('your.key')` in UI components.

### Add a new language
1. Create `web/src/locales/<lang>.json`.
2. Register it in `web/src/i18n/translations.js` resources + `SUPPORTED_LANGUAGES`.
3. Add the option in `LanguageSwitcher`.
4. If profile persistence is required, include the new code in Firestore rules validation.

### Multilingual notices/content
Notices now support multilingual fields in Firestore:
- `titleEn`, `titleSi`, `titleTa`
- `bodyEn`, `bodySi`, `bodyTa`

English values are mandatory and act as fallback. UI renderers select locale-specific fields first and fallback to English.
