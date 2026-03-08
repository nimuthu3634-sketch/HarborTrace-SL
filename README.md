# HarborTrace SL

Secure fisheries operations platform for Sri Lanka, built with React + Firebase.

## Stack
- React + Vite (`web/`)
- Firebase Authentication
- Cloud Firestore
- Cloud Functions for Firebase (`functions/`)
- Firestore Security Rules (`firestore.rules`)
- Firebase Local Emulator Suite

## Features delivered
- Authentication flow scaffold with role-aware session context
- Role-based dashboard and route protection
- Fisherman workflows: trip registration, trip history listing, SOS alerts
- Landing intake and officer/admin verification flow (trusted callable function)
- Batch generation for traceability (trusted callable function)
- Public batch verification page
- Notices, vessel management, harbor management views
- Audit log and admin analytics views
- Server-side audit log creation in Cloud Functions
- Emulator-backed Firestore security rules tests

## Local development

### 1. Install
```bash
npm install
npm run install:all
```

### 2. Configure environment for frontend
Create `web/.env.local`:
```bash
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=harbortrace-sl-dev
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
VITE_USE_EMULATORS=true
```

### 3. Run frontend
```bash
npm run dev:web
```

### 4. Run emulator suite
```bash
npx firebase emulators:start
```

## Security model summary
- Role resolved from `users/{uid}` documents
- Least-privilege rules for fisherman, harbor_officer, buyer, admin
- Client cannot write `batches`, `auditLogs`, or `analytics`
- Trusted operations handled in functions (`verifyLanding`, `generateFishBatch`, `publishNotice`)

## Architecture and data model
See `docs/architecture.md` for:
- folder structure
- Firestore collections
- role permissions
- routes/pages
- function responsibilities
- phased implementation plan

## Validation commands
- Rules tests (direct): `npm run test:rules`
- Rules tests (inside emulator): `npm run emulator:test`
- Frontend lint: `npm run lint:web`
- Frontend build: `npm run build:web`
