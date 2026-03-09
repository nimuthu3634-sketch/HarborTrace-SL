# HarborTrace SL

**HarborTrace SL** is a secure fisheries operations and traceability platform developed for the Sri Lankan fisheries context. It digitizes the operational lifecycle from trip registration and SOS reporting to landing verification and buyer-facing batch traceability.


This repository is a **final-year university project monorepo** that follows a production-style architecture for technical demonstrations, supervision reviews, and portfolio presentation.

This repository is structured as a **final-year university project monorepo** with production-style Firebase architecture, role-based access control, multilingual UI, and emulator-driven testing.




## Project Overview

### Problem Statement
In many fisheries workflows, critical data is still fragmented across paper forms, phone calls, and disconnected records. This creates operational gaps in:

- crew and vessel monitoring,
- incident escalation,
- landing verification,
- traceability assurance for buyers,
- and audit/compliance reviews.


### Project goal
HarborTrace SL centralizes these workflows into a role-based digital platform with:
- authenticated access,
- secure Firebase/Firestore data controls,
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

### Proposed Solution
HarborTrace SL provides a unified, role-aware platform that combines:


- secure sign-in and user identity management,
- operational modules for trips, alerts, and landing intake,
- trusted backend workflows through Firebase Cloud Functions,
- and immutable audit logging for accountability and governance.

### Main Objectives

- Digitize end-to-end fisheries harbor operations.
- Improve incident visibility and response workflows.
- Enforce role-based permissions for sensitive tasks.
- Support fish batch traceability through verifiable records.
- Provide a practical, demonstrable software + cybersecurity capstone system.

---

## Target Users

HarborTrace SL supports four primary user roles:

- **Fisherman**
- **Harbor Officer**
- **Buyer**
- **Administrator**

Each role sees a tailored dashboard and only the workflows they are authorized to access.

---

## Core Features

- Authentication and session profile loading
- Role-based dashboard and route protection
- Trip departure registration and trip status transitions
- SOS / emergency incident reporting and resolution workflow
- Landing intake submission and officer verification
- Fish batch traceability generation and verification lookup
- Multilingual notices and announcements
- Vessel and harbor management via trusted backend calls
- Audit logging for high-value operations
- Admin-only audit and analytics views



## System Modules

### Frontend modules (`web/src/features`)

- `auth` – session context and role resolution
- `trips` – trip views/status helpers
- `alerts` – emergency alert workflow
- `landings` – landing intake and review surfaces
- `batches` – traceability/batch operations
- `notices` – role-targeted harbor notices
- `vessels` – vessel registry workflows
- `harbors` – harbor directory workflows
- `audit` – admin audit log interface
- `analytics` – admin analytics interface

### Backend modules (`functions/src/features`)

- `auth` – session profile retrieval and auth attempt logging
- `users` – fisherman management operations
- `trips` – trip creation, transition, overdue scheduler
- `alerts` – emergency alert submission/status update
- `landing` – landing intake + verification (with batch creation)
- `traceability` – batch code generation utilities
- `notices` – multilingual notice create/update
- `vessels` – trusted vessel create/update
- `harbors` – trusted harbor create/update


### Why Firebase was chosen

Firebase was selected because it provides an integrated stack for authentication, serverless backend workflows, document storage, and local emulation. For a final-year project, this reduces infrastructure overhead while still allowing production-style security controls, role-based access patterns, and auditable workflows.

## Firestore collections

## Multilingual Support


The frontend supports:

- **English (`en`)**
- **Sinhala (`si`)**
- **Tamil (`ta`)**

### How language switching works

- UI translations are stored in:
  - `web/src/locales/en.json`
  - `web/src/locales/si.json`
  - `web/src/locales/ta.json`
- Resource registration and language normalization are in `web/src/i18n/translations.js`.
- The language selector component is `web/src/components/LanguageSwitcher.jsx`.
- Selected language is persisted locally in `localStorage` (`harbortrace.locale`).
- On signed-in sessions, preferred language is also synchronized to `users/{uid}.preferredLanguage`.

### Multilingual notices

Notices support localized fields (`titleEn/titleSi/titleTa`, `bodyEn/bodySi/bodyTa`) with English fallback.

---

## Technology Stack

- **Frontend:** React 18, Vite, React Router
- **Backend:** Firebase Cloud Functions (TypeScript, Node 20)
- **Data Layer:** Cloud Firestore
- **Authentication:** Firebase Authentication (Email/Password)
- **Security:** Firestore Security Rules + backend authorization guards
- **Testing:** Vitest, Firebase Rules Unit Testing, Emulator integration tests
- **Tooling:** Firebase CLI, npm workspaces



## Firebase Architecture

HarborTrace SL uses a layered Firebase model:

1. **Client application (`web/`)**
   - Firebase Auth for sign-in
   - Firestore for role-scoped reads and limited writes
   - Callable Functions for privileged actions

2. **Trusted backend (`functions/`)**
   - Authorization checks via user profile role + account status
   - Validation and workflow enforcement
   - Audit log writes for sensitive operations

3. **Cloud Firestore**
   - Stores users, trips, alerts, landings, batches, notices, and logs

4. **Firestore Security Rules (`firestore.rules`)**
   - Default deny model
   - Ownership and role constraints
   - Server-only restrictions for critical collections

5. **Firebase Emulator Suite**
   - Local Auth, Firestore, Functions, and Emulator UI
   - Reproducible demo/testing environment



## Firestore Collections Overview

Primary collections used in this repository:

- `users`
- `vessels`
- `harbors`
- `trips`
- `emergencyAlerts`
- `landings`
- `fishBatches`
- `batchPublicVerifications` (public verification read model)
- `notices`
- `auditLogs`
- `analytics`

> Note: `firestore.rules` currently includes both `batches` and `fishBatches` read/write rules for compatibility, while core backend flows generate records in `fishBatches`.



## Cloud Functions Overview

Exported functions (from `functions/src/index.ts`):

- **Auth**
  - `getSessionProfile`
  - `logAuthAttempt`
- **Users**
  - `listFishermen`, `getFishermanDetail`, `createFisherman`, `updateFisherman`
- **Trips**
  - `createTrip`
  - `transitionTripStatus`
  - `updateOverdueTripStatuses` *(scheduled every 10 minutes)*
- **Landings / Traceability**
  - `submitLandingIntake`
  - `verifyLandingIntake`
  - `generateBatchCode`
- **Alerts**
  - `submitEmergencyAlert`
  - `updateEmergencyAlertStatus`
- **Notices**
  - `createNotice`
  - `updateNotice`
- **Assets**
  - `createVessel`, `updateVessel`
  - `createHarbor`, `updateHarbor`

---

## Security Features

HarborTrace SL includes multiple security controls:

- **Role-based access control (RBAC)** across frontend routes, callable functions, and Firestore rules.
- **Protected workflows** for sensitive operations (e.g., verification, vessel/harbor writes, notices) through trusted backend functions.
- **Audit logging** (`auditLogs`) for high-value operations including auth events, trip status changes, alerts, notices, and batch generation.
- **Validation and input constraints** in Cloud Functions (required fields, lengths, allowed values, status transitions).
- **Firestore Security Rules** enforcing default deny, ownership checks, immutable fields, and anti-role-escalation controls.
- **Sensitive metadata sanitization** in audit logging to redact keys such as password/token/secret-like fields.



## User Roles and Permissions

### Fisherman


If `harbortrace-sl-dev` is not available in your Firebase account, set your own project alias:

```bash
firebase use --add
```

## Emulator setup steps

- Register own trips
- Submit SOS alerts against active trips
- Submit own landing intake records
- View own operations and general notices


### Harbor Officer

- Monitor and update operational statuses
- Review pending alerts and landings
- Verify/reject landing intake (harbor-scoped)
- Create and update notices
- Manage vessel/harbor records via callable backend

### Buyer

- Access buyer-facing batch traceability views
- Use verification workflow for batch lookup
- View role-relevant notices

### Administrator

- Full cross-harbor governance access
- Access audit and analytics modules
- Manage users and operational entities through trusted paths



## Project Structure

```text
HarborTrace-SL/
├─ web/                      # React + Vite frontend
│  ├─ src/app/               # routing, route guards
│  ├─ src/features/          # domain modules
│  ├─ src/i18n/              # i18n provider/translation wiring
│  ├─ src/locales/           # en/si/ta resources
│  └─ src/lib/firebase.js    # firebase client initialization
├─ functions/                # Cloud Functions (TypeScript)
│  └─ src/features/          # callable modules by domain
├─ firebase/                 # demo seeding and firebase support assets
├─ tests/                    # rules + emulator integration tests
├─ docs/                     # supplementary architecture/model notes
├─ firestore.rules           # Firestore security rules
├─ firebase.json             # Firebase + Emulator configuration
└─ package.json              # workspace scripts
```



## Setup Prerequisites

- Node.js **20+**
- npm **10+**
- Firebase CLI (`firebase-tools`)

Install from repository root:

```bash
npm install
npm run install:all
```



## Environment Variables

### Frontend (`web/.env.local`)

Create from template:

```bash
cp web/.env.example web/.env.local
```


> Run this while the emulator suite is running, so seed data is written to the local emulators (not to a live Firebase project).

## Environment variables

Required Firebase Web SDK keys:

- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_APP_ID`

Optional / recommended keys:

- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_FUNCTIONS_REGION` (default: `us-central1`)

Emulator keys:

- `VITE_USE_EMULATORS=true`
- `VITE_FIREBASE_EMULATOR_HOST`
- `VITE_FIREBASE_AUTH_EMULATOR_PORT`
- `VITE_FIRESTORE_EMULATOR_PORT`
- `VITE_FIREBASE_FUNCTIONS_EMULATOR_PORT`

### Functions (`functions/.env.local`)

An optional template exists at `functions/.env.example` for future external API or secret configuration.



## Firebase Configuration

Default Firebase project alias is defined in `.firebaserc`:

- `harbortrace-sl-dev`

Firebase emulator ports are configured in `firebase.json`:

- Auth: `9099`
- Firestore: `8080`
- Functions: `5001`
- Emulator UI: `4000`

If needed:

```bash
firebase login
firebase use harbortrace-sl-dev
```


## Running the App Locally

### Terminal 1 – Start emulators

```bash
npm run dev:emulators
```

### Terminal 2 – Start web app

```bash
npm run dev:web
```

Optional build check:

```bash
npm run build:web
```



## Running Firebase Emulator Suite

Main command:

```bash
npm run dev:emulators
```

This executes a functions build and starts:

- Authentication emulator
- Firestore emulator
- Functions emulator
- Emulator UI (`http://localhost:4000`)

---

## Seeding / Demo Data Setup

Seed script:

```bash
npm run seed:demo
```

What it does:

- clears key collections in the emulator project,
- creates demo auth users,
- seeds user profiles, harbors, vessels, trips, alerts, landings,
- seeds notices, fish batches, and audit logs.

> Safety guard: the script refuses to run unless `FIRESTORE_EMULATOR_HOST` is present.

---

## Test Instructions

Run targeted checks:

```bash
npm run test:web
npm run lint:web
npm run test:rules
npm run test:functions:emulator
```

Run emulator-backed test pipeline:

```bash
npm run emulator:test
```


> This command builds Functions, starts emulators in an isolated run, and executes rules + callable tests.

## Demo credentials


## Demo Credentials


After seeding demo data, use these local emulator credentials:

- `admin.demo@harbortrace.lk` / `DemoPass#2026`
- `officer.colombo@harbortrace.lk` / `DemoPass#2026`
- `officer.galle@harbortrace.lk` / `DemoPass#2026`
- `fisher.kalpitiya@harbortrace.lk` / `DemoPass#2026`
- `fisher.negombo@harbortrace.lk` / `DemoPass#2026`
- `fisher.trinco@harbortrace.lk` / `DemoPass#2026`
- `buyer.demo@harbortrace.lk` / `DemoPass#2026`

Use these accounts only in local development/emulator environments.

---

## Key User Flows

1. **Trip Registration (Fisherman)**
   - Fisherman registers a departure linked to own vessel and harbor constraints.
2. **Incident Reporting (Fisherman → Officer/Admin)**
   - SOS alert submitted for active trip and tracked via pending/acknowledged/resolved status.
3. **Landing Intake + Verification (Fisherman → Officer/Admin)**
   - Fisherman submits landing; officer/admin verifies or rejects.
4. **Batch Traceability (Officer/Admin → Buyer/Public)**
   - Verified landing generates `fishBatches` record and public verification payload by batch code.
5. **Governance and Oversight (Admin)**
   - Admin monitors audit logs and analytics views.



## Screens / UI Summary

The web app includes role-aware pages for:


- Consolidate and migrate all collection naming into one final schema contract.
- Add stronger CI/CD quality gates (lint + tests + rules validation + deploy checks).
- Expand end-to-end test automation (multi-role UI and cross-module workflows).
- Integrate production-grade monitoring/alerting and error tracking.
- Expand multilingual UX and accessibility refinements for broader field adoption.
- Introduce richer analytics and predictive safety insights (e.g., risk forecasting).
- Harden secure public traceability pages with anti-abuse controls and rate limiting.



## Localization (en / si / ta)

HarborTrace SL supports a multilingual user experience for Sri Lankan field operations, with interfaces and notices available in English, Sinhala, and Tamil.

The `web/` application uses a React context-based i18n provider (`I18nProvider`) with resource files under `web/src/locales/`.

- Login and unauthorized handling
- Operations dashboard
- Trips, trip registration, and trip detail
- SOS alerts and pending alerts queue
- Landing intake, landing detail, pending verification queue
- Batch list, batch verification, buyer detail page
- Notices and notice details
- Vessel and harbor detail screens
- Admin audit and analytics panels



## Known Limitations

- Some schema naming is transitional (`batches` and `fishBatches` both appear in rules/supporting logic).
- `docs/` architecture/data-model files include planning-era content that does not fully match the implemented source tree.
- Automated tests cover core security and callable flows but not full end-to-end browser automation.
- Observability is currently emulator/developer-focused (no production monitoring stack committed in this repo).



## Future Improvements

- Unify and finalize collection naming across all modules and documentation.
- Expand full E2E multi-role UI test coverage.
- Add CI quality gates for lint/test/rules checks.
- Add production-grade monitoring and incident alerting.
- Improve accessibility and multilingual UX depth for field operations.
- Introduce richer analytics and predictive safety insights.



## Final-Year Project Summary / Academic Relevance

HarborTrace SL is academically relevant as a final-year project because it combines:

- **software engineering practice** (modular frontend/backend architecture, reproducible local environment, testing),
- **secure systems design** (RBAC, defense-in-depth with rules + backend checks, audit trails),
- **real-world domain impact** (safer maritime workflows and traceability support for Sri Lankan fisheries),
- **applied cloud architecture** (Firebase Auth/Firestore/Functions/Emulators in a cohesive system).

The project demonstrates both implementation depth and security-conscious design suitable for technical panel evaluation.



## Contributors

This repository does not currently include a formal contributor roster. Add team member names/roles here for final submission.



## License

A license file is not currently present in this repository. Add a project license before external distribution.

---

## Additional Reference Documents

- `docs/architecture.md`
- `docs/firebase-architecture.md`
- `docs/firestore-data-model.md`


English values are mandatory and act as fallback. UI renderers select locale-specific fields first and fallback to English.



For architecture references, see:
- `docs/architecture.md`
- `docs/firebase-architecture.md`
- `docs/firestore-data-model.md`

> These documents are useful as supplementary notes, but the source of truth for current behavior is the implemented code under `web/`, `functions/`, `tests/`, and root Firebase configuration files.

