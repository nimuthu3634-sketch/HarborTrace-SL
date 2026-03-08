# HarborTrace SL

HarborTrace SL is a secure fisheries operations platform for Sri Lanka, covering departure registration, active voyage monitoring, incident alerts, landing intake verification, and end-to-end batch traceability.

## Monorepo structure

- `web/` React + Vite application.
- `functions/` TypeScript Cloud Functions for Firebase.
- `firestore.rules` Firestore security rules.
- `firestore.indexes.json` Firestore composite indexes.
- `firebase.json` Firebase project + emulator configuration.
- `tests/rules/` Firestore security rules tests.
- `tests/emulator/` end-to-end callable tests against the local Emulator Suite.

## Firebase setup

### 1) Install dependencies

From repository root:

```bash
npm install
npm run install:all
```

### 2) Configure frontend Firebase SDK env vars

Copy `web/.env.example` to `web/.env.local` and fill values from **Firebase Console → Project settings → Your apps → SDK setup and configuration**.

```bash
cp web/.env.example web/.env.local
```

Required variables:

- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_APP_ID`

For local emulator development, set these in `web/.env.local` too:

```bash
VITE_USE_EMULATORS=true
VITE_FIREBASE_EMULATOR_HOST=127.0.0.1
VITE_FIREBASE_AUTH_EMULATOR_PORT=9099
VITE_FIRESTORE_EMULATOR_PORT=8080
VITE_FIREBASE_FUNCTIONS_EMULATOR_PORT=5001
```

> Do not commit `.env.local` or any real secrets.

### 3) Configure Firebase CLI project

```bash
firebase login
firebase use harbortrace-sl-dev
```

The default project alias is already set in `.firebaserc`.

## Local Emulator Suite workflow (Auth + Firestore + Functions)

### 1) Build Cloud Functions

```bash
npm run build:functions
```

### 2) Start emulators for local development

```bash
npm run dev:emulators
```

This starts:

- Auth Emulator: `localhost:9099`
- Firestore Emulator: `localhost:8080`
- Functions Emulator: `localhost:5001`
- Emulator UI: `localhost:4000`

### 3) Run frontend against emulators (separate terminal)

```bash
npm run dev:web
```

### 4) Run all local tests against Emulator Suite

```bash
npm run test:local
```

This command runs:

- `npm run test:web` (auth-protected route/page logic)
- `npm run emulator:test`, which runs:
  - `npm run test:rules` (Firestore security rules unit tests)
  - `npm run test:functions:emulator` (callable emulator tests)

## Test coverage added for local Firebase testing

- Auth-protected route/page decisions (`web/src/app/protectedRouteAccess.test.js`).
- Firestore rules access control by role and allowed/denied operations (`tests/rules/firestore.rules.test.js`).
- Callable flow tests against emulators (`tests/emulator/callable.emulator.test.js`) covering:
  - trip creation,
  - SOS submission,
  - landing submission,
  - landing verification via Cloud Function,
  - batch generation.

## Authentication flow (Firebase Auth + Firestore profile)

HarborTrace SL uses Firebase Authentication for identity and Firestore for role/profile data.

- Identity: users sign in with **email/password** via Firebase Auth.
- Profile source of truth: role and profile metadata are stored in `users/{uid}` Firestore documents.
- Trusted role resolution: the frontend requests session profile data through the `getSessionProfile` callable Cloud Function, which reads Firestore using Admin SDK (server-side).
- Route protection: frontend routes are guarded by role-aware `ProtectedRoute` checks, and Firestore security rules still enforce backend authorization.
- Auditability: login attempts are written to `auditLogs` through `logAuthAttempt` callable:
  - `auth.login.success` when sign-in succeeds.
  - `auth.login.failed` when sign-in fails.

### Seed comprehensive demo data (Auth + Firestore)

To load presentation-ready Sri Lankan demo data (users by role, harbors, vessels, trips, alerts, landings, fish batches, notices, and audit logs) into the emulators:

```bash
npm run seed:demo
```

This script:

- starts Auth + Firestore emulators for the run,
- upserts Firebase Auth demo accounts,
- resets and reseeds core Firestore collections with realistic linked records.

Default demo password for all seeded users: `DemoPass#2026`.

### Demo / seed users (presentation mode)

For local emulator demos, create users in Firebase Auth emulator and add matching role profiles in Firestore (`users/{uid}`).

Suggested demo accounts:

- `fisherman.demo@harbortrace.lk` → role `fisherman`
- `officer.demo@harbortrace.lk` → role `harbor_officer`
- `buyer.demo@harbortrace.lk` → role `buyer`
- `admin.demo@harbortrace.lk` → role `admin`

Each profile document should include at minimum:

```json
{
  "uid": "<firebase-auth-uid>",
  "role": "fisherman | harbor_officer | buyer | admin",
  "displayName": "Demo User"
}
```

> Note: role claims from the client UI must never be treated as authoritative. Always enforce role access in Firestore rules and callable/server functions.

## Firestore rules and indexes

- Rules source: `firestore.rules`
- Indexes source: `firestore.indexes.json`

Deploy only rules/indexes:

```bash
firebase deploy --only firestore:rules,firestore:indexes
```

## Validation commands

- `npm run build:functions`
- `npm run dev:emulators`
- `npm run dev:web`
- `npm run test:web`
- `npm run test:rules`
- `npm run test:functions:emulator`
- `npm run test:local`
- `npm run lint:web`
- `npm run build:web`
