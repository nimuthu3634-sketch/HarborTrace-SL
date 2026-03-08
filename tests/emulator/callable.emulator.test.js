import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';

const projectId = 'harbortrace-sl-dev';
const functionsBaseUrl = `http://127.0.0.1:5001/${projectId}/us-central1`;

function getAdminDb() {
  if (!getApps().length) {
    initializeApp({ projectId });
  }
  return getFirestore();
}

async function signUpAndSignIn(email, password = 'Password123!') {
  const signupResponse = await fetch(
    'http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signUp?key=fake-api-key',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, returnSecureToken: true })
    }
  );

  const signupData = await signupResponse.json();
  if (!signupResponse.ok) {
    throw new Error(`Auth signup failed: ${JSON.stringify(signupData)}`);
  }

  return { uid: signupData.localId, idToken: signupData.idToken };
}

async function seedUserProfile(uid, role, overrides = {}) {
  await getAdminDb().collection('users').doc(uid).set({
    uid,
    role,
    displayName: `${role}-${uid}`,
    isActive: true,
    ...overrides
  });
}

async function callFunction(name, idToken, data) {
  const response = await fetch(`${functionsBaseUrl}/${name}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`
    },
    body: JSON.stringify({ data })
  });

  const payload = await response.json();
  if (!response.ok) {
    const message = payload?.error?.message || JSON.stringify(payload);
    throw new Error(message);
  }

  return payload.result;
}

async function createFishermanFixture() {
  const db = getAdminDb();
  const fisherman = await signUpAndSignIn(`fisher-${Date.now()}@harbortrace.local`);
  await seedUserProfile(fisherman.uid, 'fisherman', { homeHarborId: 'harbor-colombo' });

  await db.collection('harbors').doc('harbor-colombo').set({
    harborName: 'Colombo Harbor',
    district: 'Colombo'
  });

  await db.collection('vessels').doc('vessel-f1').set({
    vesselName: 'Sea Wind',
    registrationNumber: 'REG-001',
    ownerUserId: fisherman.uid,
    vesselType: 'trawler',
    capacity: 12,
    status: 'active'
  });

  return { db, fisherman };
}

async function clearCollections() {
  const db = getAdminDb();
  const targets = [
    'users',
    'harbors',
    'vessels',
    'trips',
    'landings',
    'fishBatches',
    'batchPublicVerifications',
    'emergencyAlerts',
    'auditLogs'
  ];

  await Promise.all(
    targets.map(async (name) => {
      const docs = await db.collection(name).listDocuments();
      await Promise.all(docs.map((docRef) => docRef.delete()));
    })
  );
}

describe('Firebase Emulator callable flow', () => {
  beforeAll(() => {
    process.env.GCLOUD_PROJECT = projectId;
  });

  afterEach(async () => {
    await clearCollections();
  });

  it('creates trips and blocks unauthorized role access', async () => {
    const { db, fisherman } = await createFishermanFixture();

    const departureTime = new Date(Date.now() + 60_000).toISOString();
    const expectedReturnTime = new Date(Date.now() + 3_600_000).toISOString();

    const created = await callFunction('createTrip', fisherman.idToken, {
      fishermanUid: fisherman.uid,
      vesselId: 'vessel-f1',
      departureHarborId: 'harbor-colombo',
      destinationZone: 'Zone A',
      crewCount: 4,
      departureTime,
      expectedReturnTime,
      emergencyContact: '0771234567',
      notes: 'routine trip'
    });

    expect(created.tripId).toBeTruthy();
    expect(['planned', 'active']).toContain(created.status);

    const buyer = await signUpAndSignIn(`buyer-${Date.now()}@harbortrace.local`);
    await seedUserProfile(buyer.uid, 'buyer');

    await expect(
      callFunction('createTrip', buyer.idToken, {
        fishermanUid: buyer.uid,
        vesselId: 'vessel-f1',
        departureHarborId: 'harbor-colombo',
        destinationZone: 'Zone A',
        crewCount: 2,
        departureTime,
        expectedReturnTime,
        emergencyContact: '0771234567',
        notes: ''
      })
    ).rejects.toThrow(/permission-denied/i);

    const tripSnap = await db.collection('trips').doc(created.tripId).get();
    expect(tripSnap.exists).toBe(true);
  });

  it('submits SOS and landing, then verifies landing and generates a batch', async () => {
    const { db, fisherman } = await createFishermanFixture();

    const departureTime = Timestamp.fromDate(new Date(Date.now() - 30 * 60_000));
    const expectedReturnTime = Timestamp.fromDate(new Date(Date.now() + 2 * 60 * 60_000));

    const tripRef = await db.collection('trips').add({
      fishermanUid: fisherman.uid,
      createdByUid: fisherman.uid,
      createdByRole: 'fisherman',
      vesselId: 'vessel-f1',
      departureHarborId: 'harbor-colombo',
      destinationZone: 'Zone B',
      crewCount: 3,
      departureTime,
      expectedReturnTime,
      emergencyContact: '0779999999',
      notes: '',
      status: 'active',
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      lastStatusChangedAt: Timestamp.now()
    });

    const sos = await callFunction('submitEmergencyAlert', fisherman.idToken, {
      fishermanUid: fisherman.uid,
      activeTripId: tripRef.id,
      alertType: 'engine_failure',
      incidentMessage: 'Engine failure near buoy 8',
      lastKnownLocation: '6.9271,79.8612'
    });
    expect(sos.status).toBe('pending');

    const landing = await callFunction('submitLandingIntake', fisherman.idToken, {
      tripId: tripRef.id,
      fishType: 'Tuna',
      quantity: 20,
      totalWeightKg: 180,
      storageMethod: 'iced',
      conditionStatus: 'fresh',
      landingHarborId: 'harbor-colombo',
      landingTime: new Date().toISOString()
    });
    expect(landing.verificationStatus).toBe('pending');

    const officer = await signUpAndSignIn(`officer-${Date.now()}@harbortrace.local`);
    await seedUserProfile(officer.uid, 'harbor_officer', { homeHarborId: 'harbor-colombo' });

    const verification = await callFunction('verifyLandingIntake', officer.idToken, {
      landingId: landing.landingId,
      verificationStatus: 'verified',
      comments: 'quality passed'
    });

    expect(verification.ok).toBe(true);
    expect(verification.verificationStatus).toBe('verified');
    expect(verification.batchCode).toMatch(/^HTSL-/);

    const publicDoc = await db.collection('batchPublicVerifications').doc(verification.batchCode).get();
    expect(publicDoc.exists).toBe(true);

    const generated = await callFunction('generateBatchCode', officer.idToken, {});
    expect(generated.batchCode).toMatch(/^HTSL-/);
  });
});
