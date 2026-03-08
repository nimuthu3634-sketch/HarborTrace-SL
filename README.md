# AGENTS.md

## Project name
HarborTrace SL

## Project summary
HarborTrace SL is a secure fisheries operations platform for Sri Lanka.
It supports fishermen, harbor officers, buyers, and administrators.
The app manages trip registration, emergency alerts, catch/landing intake,
landing verification, batch traceability, notices, and audit logging.

## Stack
- React + Vite frontend
- Firebase Authentication
- Cloud Firestore
- Cloud Functions for Firebase
- Firestore Security Rules
- Firebase Local Emulator Suite

## Business goals
- Digitize fisheries workflows
- Improve visibility of active and overdue trips
- Improve fisher safety through incident alerts
- Improve landing verification and traceability
- Build a secure role-based system with auditability

## User roles
- fisherman
- harbor_officer
- buyer
- admin

## Domain wording
Use practical fisheries terms:
- Register Departure
- Active Voyage
- Landing Intake
- Verification Status
- Harbor Notice
- Incident Alert
- Batch Traceability

## Architecture rules
- Keep frontend and backend separated clearly
- Use feature-based folders
- Keep UI components small and reusable
- Put trusted write logic in Cloud Functions when needed
- Keep Firestore document shapes consistent
- Prefer readable code over clever code

## Firebase rules
- Use Firebase Authentication for identity
- Store app profile/role data in Firestore
- Enforce access with Firestore Security Rules
- Never use open Firestore rules in production
- Test rules in Emulator Suite before finalizing
- Use Cloud Functions for sensitive actions like verification and batch generation

## Security rules
- Never store plain-text passwords
- Use least privilege for all roles
- Prevent role escalation from the client
- Validate input both in frontend and trusted backend logic
- Log security-sensitive actions into audit records
- Do not expose internal errors directly to users

## UX rules
- Mobile-first for fisherman screens
- Tablet/desktop optimized dashboards for officer/admin
- Clear badges and statuses
- Friendly loading, empty, and error states
- Professional UI suitable for a final-year project demo

## Code quality
- Update README whenever setup changes
- Add emulator-based tests for Firestore Rules
- Add tests for core workflows
- Do not leave critical TODO placeholders
