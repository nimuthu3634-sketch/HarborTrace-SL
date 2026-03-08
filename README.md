# HarborTrace SL

HarborTrace SL is a secure fisheries operations platform for Sri Lanka, covering departure registration, active voyage monitoring, incident alerts, landing intake verification, and end-to-end batch traceability.

## Monorepo structure

- `frontend/` React + Vite application using feature-based modules.
- `functions/` Cloud Functions for privileged workflows.
- `firebase/` Firestore rules, indexes, and emulator tests.
- `docs/firebase-architecture.md` detailed Firebase architecture and schema.

## Local development

### 1) Frontend

```bash
cd frontend
npm install
npm run dev
```

### 2) Functions

```bash
cd functions
npm install
npm run build
```

### 3) Firebase Emulator Suite

From repository root:

```bash
firebase emulators:start
```

Configured emulators:
- Auth: `localhost:9099`
- Firestore: `localhost:8080`
- Functions: `localhost:5001`
- Emulator UI: `localhost:4000`

## Security and architecture notes

- Authentication is managed with Firebase Authentication.
- User roles are stored in `users/{uid}` documents.
- Sensitive write actions are intended for Cloud Functions.
- Firestore rules follow deny-by-default and least-privilege patterns.
- `auditLogs` are backend-only write targets.
