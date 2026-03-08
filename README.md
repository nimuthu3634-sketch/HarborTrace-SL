# HarborTrace SL

HarborTrace SL is a secure fisheries operations platform for Sri Lanka, covering departure registration, active voyage monitoring, incident alerts, landing intake verification, and end-to-end batch traceability.

## Monorepo structure

- `web/` React + Vite application.
- `functions/` TypeScript Cloud Functions for Firebase.
- `firestore.rules` Firestore security rules.
- `firestore.indexes.json` Firestore composite indexes.
- `firebase.json` Firebase project + emulator configuration.
- `tests/rules/` Firestore security rules tests.

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

Optional values are included for Storage/Messaging, Functions region, and emulator ports/host.

> Do not commit `.env.local` or any real secrets.

### 3) Configure Firebase CLI project

```bash
firebase login
firebase use harbortrace-sl-dev
```

The default project alias is already set in `.firebaserc`.

### 4) Run the frontend

```bash
npm run dev:web
```

### 5) Run Cloud Functions build (optional, for local iteration)

```bash
npm --workspace functions run build
```

## Emulator Suite (Auth + Firestore + Functions)

Start emulators from repository root:

```bash
firebase emulators:start --only auth,firestore,functions
```

Configured ports:

- Auth: `localhost:9099`
- Firestore: `localhost:8080`
- Functions: `localhost:5001`
- Emulator UI: `localhost:4000`

When `VITE_USE_EMULATORS=true`, the frontend automatically connects to these local emulators.

## Firestore rules and indexes

- Rules source: `firestore.rules`
- Indexes source: `firestore.indexes.json`

Deploy only rules/indexes:

```bash
firebase deploy --only firestore:rules,firestore:indexes
```

## Validation commands

- Rules tests (direct): `npm run test:rules`
- Rules tests via emulator: `npm run emulator:test`
- Frontend lint: `npm run lint:web`
- Frontend build: `npm run build:web`
