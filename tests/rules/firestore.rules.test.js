import fs from 'node:fs';
import path from 'node:path';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment
} from '@firebase/rules-unit-testing';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';

const projectId = 'harbortrace-sl-dev';
let testEnv;

async function seedRole(uid, role) {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), 'users', uid), { uid, role, displayName: uid });
  });
}

async function seedDoc(collection, id, data) {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), collection, id), data);
  });
}

describe('Firestore security rules', () => {
  beforeAll(async () => {
    testEnv = await initializeTestEnvironment({
      projectId,
      firestore: {
        rules: fs.readFileSync(path.resolve('firestore.rules'), 'utf8')
      }
    });

    await seedRole('fish1', 'fisherman');
    await seedRole('fish2', 'fisherman');
    await seedRole('off1', 'harbor_officer');
    await seedRole('admin1', 'admin');
    await seedRole('buyer1', 'buyer');
  });

  afterEach(async () => {
    await testEnv.clearFirestore();
    await seedRole('fish1', 'fisherman');
    await seedRole('fish2', 'fisherman');
    await seedRole('off1', 'harbor_officer');
    await seedRole('admin1', 'admin');
    await seedRole('buyer1', 'buyer');
  });

  afterAll(async () => {
    if (testEnv) {
      await testEnv.cleanup();
    }
  });

  it('never allows anonymous read or write to protected data', async () => {
    await seedDoc('trips', 'trip1', { fishermanUid: 'fish1', status: 'active' });
    const anonDb = testEnv.unauthenticatedContext().firestore();

    await assertFails(getDoc(doc(anonDb, 'trips', 'trip1')));
    await assertFails(setDoc(doc(anonDb, 'trips', 'trip2'), { fishermanUid: 'fish1', status: 'active' }));
  });

  it('allows fisherman to read and update only own trips', async () => {
    await seedDoc('trips', 'ownTrip', {
      fishermanUid: 'fish1',
      status: 'active',
      createdByUid: 'fish1',
      createdByRole: 'fisherman',
      vesselId: 'v1',
      departureHarborId: 'h1',
      destinationZone: 'Z1',
      crewCount: 4,
      departureTime: new Date(),
      expectedReturnTime: new Date(Date.now() + 60_000),
      emergencyContact: '0771234567',
      notes: ''
    });
    await seedDoc('trips', 'otherTrip', {
      fishermanUid: 'fish2',
      status: 'active',
      createdByUid: 'fish1',
      createdByRole: 'fisherman',
      vesselId: 'v1',
      departureHarborId: 'h1',
      destinationZone: 'Z1',
      crewCount: 4,
      departureTime: new Date(),
      expectedReturnTime: new Date(Date.now() + 60_000),
      emergencyContact: '0771234567',
      notes: ''
    });

    const fisherDb = testEnv.authenticatedContext('fish1').firestore();

    await assertSucceeds(getDoc(doc(fisherDb, 'trips', 'ownTrip')));
    await assertFails(getDoc(doc(fisherDb, 'trips', 'otherTrip')));

    await assertSucceeds(updateDoc(doc(fisherDb, 'trips', 'ownTrip'), { status: 'completed' }));
    await assertFails(updateDoc(doc(fisherDb, 'trips', 'otherTrip'), { status: 'completed' }));
  });


  it('allows fisherman to create trips only for themselves with approved fields', async () => {
    const fisherDb = testEnv.authenticatedContext('fish1').firestore();

    const ownTripPayload = {
      vesselId: 'vessel-1',
      departureHarborId: 'harbor-1',
      destinationZone: 'Zone A',
      crewCount: 4,
      departureTime: new Date(),
      expectedReturnTime: new Date(Date.now() + 60_000),
      emergencyContact: '0770000000',
      notes: 'night fishing',
      fishermanUid: 'fish1',
      status: 'planned',
      createdByUid: 'fish1',
      createdByRole: 'fisherman',
      createdAt: new Date(),
      updatedAt: new Date(),
      lastStatusChangedAt: new Date()
    };

    await assertSucceeds(setDoc(doc(fisherDb, 'trips', 'newOwnTrip'), ownTripPayload));
    await assertFails(setDoc(doc(fisherDb, 'trips', 'newOtherTrip'), { ...ownTripPayload, fishermanUid: 'fish2' }));
  });

  it('prevents fisherman from changing protected trip registration fields', async () => {
    await seedDoc('trips', 'tripProtected', {
      fishermanUid: 'fish1',
      status: 'active',
      createdByUid: 'fish1',
      createdByRole: 'fisherman',
      vesselId: 'v1',
      departureHarborId: 'h1',
      destinationZone: 'Z1',
      crewCount: 4,
      departureTime: new Date(),
      expectedReturnTime: new Date(Date.now() + 60_000),
      emergencyContact: '0771234567',
      notes: ''
    });

    const fisherDb = testEnv.authenticatedContext('fish1').firestore();
    await assertFails(updateDoc(doc(fisherDb, 'trips', 'tripProtected'), { vesselId: 'v9' }));
  });

  it('allows fisherman to create landing only for themselves with pending verification defaults', async () => {
    const fisherDb = testEnv.authenticatedContext('fish1').firestore();
    const payload = {
      tripId: 'trip1',
      fishType: 'Tuna',
      quantity: 40,
      totalWeightKg: 200,
      storageMethod: 'iced',
      conditionStatus: 'fresh',
      landingHarborId: 'harbor-1',
      landingTime: new Date(),
      verificationStatus: 'pending',
      fishermanUid: 'fish1',
      submittedByUid: 'fish1',
      verifiedByOfficerUid: null,
      verifiedAt: null,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await assertSucceeds(setDoc(doc(fisherDb, 'landings', 'landingOwn'), payload));
    await assertFails(setDoc(doc(fisherDb, 'landings', 'landingOtherOwner'), { ...payload, fishermanUid: 'fish2' }));
    await assertFails(setDoc(doc(fisherDb, 'landings', 'landingWrongStatus'), { ...payload, verificationStatus: 'verified' }));
  });


  it('blocks fisherman from writing protected verification fields', async () => {
    await seedDoc('landings', 'landing1', {
      fishermanUid: 'fish1',
      submissionStatus: 'submitted',
      verificationStatus: 'pending',
      verifiedByOfficerUid: null,
      verifiedAt: null
    });

    const fisherDb = testEnv.authenticatedContext('fish1').firestore();
    await assertFails(updateDoc(doc(fisherDb, 'landings', 'landing1'), { verificationStatus: 'approved' }));
  });


  it('allows fisherman to create emergency alerts only for their own active trip', async () => {
    await seedDoc('trips', 'ownActiveTrip', { fishermanUid: 'fish1', status: 'active' });
    await seedDoc('trips', 'ownCompletedTrip', { fishermanUid: 'fish1', status: 'completed' });
    await seedDoc('trips', 'otherActiveTrip', { fishermanUid: 'fish2', status: 'active' });

    const fisherDb = testEnv.authenticatedContext('fish1').firestore();
    const payload = {
      fishermanUid: 'fish1',
      activeTripId: 'ownActiveTrip',
      alertType: 'medical',
      incidentMessage: 'Crew member injured',
      lastKnownLocation: '6.93,79.85',
      status: 'pending',
      statusUpdatedByUid: null,
      statusUpdatedAt: null,
      acknowledgedAt: null,
      resolvedAt: null,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await assertSucceeds(setDoc(doc(fisherDb, 'emergencyAlerts', 'okAlert'), payload));
    await assertFails(setDoc(doc(fisherDb, 'emergencyAlerts', 'badTripStatus'), { ...payload, activeTripId: 'ownCompletedTrip' }));
    await assertFails(setDoc(doc(fisherDb, 'emergencyAlerts', 'badOwnership'), { ...payload, activeTripId: 'otherActiveTrip' }));
  });

  it('prevents fisherman from updating emergency alert status fields', async () => {
    await seedDoc('emergencyAlerts', 'a2', {
      fishermanUid: 'fish1',
      activeTripId: 'trip1',
      alertType: 'collision',
      incidentMessage: 'Near-collision reported',
      lastKnownLocation: '7.00,80.00',
      status: 'pending',
      statusUpdatedByUid: null,
      statusUpdatedAt: null,
      acknowledgedAt: null,
      resolvedAt: null
    });

    const fisherDb = testEnv.authenticatedContext('fish1').firestore();
    await assertFails(updateDoc(doc(fisherDb, 'emergencyAlerts', 'a2'), { status: 'resolved' }));
  });


  it('prevents officers from directly updating landing verification fields from clients', async () => {
    await seedDoc('landings', 'landingOfficerCheck', {
      fishermanUid: 'fish1',
      submittedByUid: 'fish1',
      tripId: 'trip1',
      fishType: 'Tuna',
      quantity: 20,
      totalWeightKg: 100,
      storageMethod: 'iced',
      conditionStatus: 'fresh',
      landingHarborId: 'harbor-1',
      landingTime: new Date(),
      verificationStatus: 'pending',
      verifiedByOfficerUid: null,
      verifiedAt: null,
      verificationComments: null,
      batchId: null,
      batchCode: null,
      batchVerificationUrl: null,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    const officerDb = testEnv.authenticatedContext('off1').firestore();

    await assertFails(updateDoc(doc(officerDb, 'landings', 'landingOfficerCheck'), {
      verificationStatus: 'verified',
      verifiedByOfficerUid: 'off1',
      verifiedAt: new Date()
    }));

    await assertSucceeds(updateDoc(doc(officerDb, 'landings', 'landingOfficerCheck'), {
      conditionStatus: 'excellent',
      updatedAt: new Date()
    }));
  });

  it('allows harbor officer workflow updates on operational collections', async () => {
    await seedDoc('trips', 'activeTrip', { fishermanUid: 'fish1', status: 'active' });
    await seedDoc('emergencyAlerts', 'a1', {
      fishermanUid: 'fish1',
      activeTripId: 'activeTrip',
      alertType: 'medical',
      incidentMessage: 'engine issue',
      lastKnownLocation: '6.93,79.85',
      status: 'pending',
      statusUpdatedByUid: null,
      statusUpdatedAt: null,
      acknowledgedAt: null,
      resolvedAt: null
    });

    const officerDb = testEnv.authenticatedContext('off1').firestore();
    await assertSucceeds(updateDoc(doc(officerDb, 'emergencyAlerts', 'a1'), {
      status: 'acknowledged',
      statusUpdatedByUid: 'off1',
      statusUpdatedAt: new Date(),
      acknowledgedAt: new Date()
    }));
  });

  it('enforces role-targeted notice reads and blocks client-side writes', async () => {
    await seedDoc('notices', 'noticeFish', {
      title: 'Storm warning',
      body: 'Avoid western deep sea routes this evening.',
      severity: 'warning',
      targetRole: 'fisherman',
      createdBy: 'off1',
      createdAt: new Date()
    });
    await seedDoc('notices', 'noticeAll', {
      title: 'Harbor closed',
      body: 'Harbor operations pause for maintenance.',
      severity: 'info',
      targetRole: 'all',
      createdBy: 'admin1',
      createdAt: new Date()
    });

    const fisherDb = testEnv.authenticatedContext('fish1').firestore();
    const buyerDb = testEnv.authenticatedContext('buyer1').firestore();
    const officerDb = testEnv.authenticatedContext('off1').firestore();

    await assertSucceeds(getDoc(doc(fisherDb, 'notices', 'noticeFish')));
    await assertFails(getDoc(doc(buyerDb, 'notices', 'noticeFish')));
    await assertSucceeds(getDoc(doc(buyerDb, 'notices', 'noticeAll')));
    await assertSucceeds(getDoc(doc(officerDb, 'notices', 'noticeFish')));

    await assertFails(setDoc(doc(officerDb, 'notices', 'newNotice'), {
      title: 'Client write',
      body: 'Should fail',
      severity: 'info',
      targetRole: 'all',
      createdBy: 'off1',
      createdAt: new Date()
    }));

    await assertFails(updateDoc(doc(officerDb, 'notices', 'noticeFish'), {
      title: 'Edited from client'
    }));
  });



  it('blocks all client-side vessel writes while allowing authenticated reads', async () => {
    await seedDoc('vessels', 'vessel1', {
      vesselName: 'Sea Wind',
      registrationNumber: 'REG-001',
      ownerUserId: 'fish1',
      vesselType: 'trawler',
      capacity: 12,
      status: 'active'
    });

    const fisherDb = testEnv.authenticatedContext('fish1').firestore();
    const officerDb = testEnv.authenticatedContext('off1').firestore();

    await assertSucceeds(getDoc(doc(fisherDb, 'vessels', 'vessel1')));
    await assertSucceeds(getDoc(doc(officerDb, 'vessels', 'vessel1')));

    await assertFails(setDoc(doc(officerDb, 'vessels', 'newVessel'), {
      vesselName: 'Client Write',
      registrationNumber: 'REG-002',
      ownerUserId: 'fish1',
      vesselType: 'trawler',
      capacity: 10,
      status: 'active'
    }));
    await assertFails(updateDoc(doc(officerDb, 'vessels', 'vessel1'), { status: 'inactive' }));
  });


  it('blocks client-side harbor writes for all roles while allowing authenticated reads', async () => {
    await seedDoc('harbors', 'harbor1', {
      name: 'Colombo Harbor',
      district: 'Colombo',
      locationDescription: 'Main west coast harbor.'
    });

    const buyerDb = testEnv.authenticatedContext('buyer1').firestore();
    const adminDb = testEnv.authenticatedContext('admin1').firestore();

    await assertSucceeds(getDoc(doc(buyerDb, 'harbors', 'harbor1')));
    await assertSucceeds(getDoc(doc(adminDb, 'harbors', 'harbor1')));

    await assertFails(setDoc(doc(adminDb, 'harbors', 'harbor2'), {
      name: 'Client Created Harbor',
      district: 'Galle',
      locationDescription: 'Should be blocked from client.'
    }));

    await assertFails(updateDoc(doc(adminDb, 'harbors', 'harbor1'), {
      locationDescription: 'Edited on client'
    }));
  });

  it('allows buyer to read only buyerSafe batches', async () => {
    await seedDoc('batches', 'safeBatch', { buyerSafe: true, lotCode: 'LOT-1' });
    await seedDoc('batches', 'unsafeBatch', { buyerSafe: false, lotCode: 'LOT-2' });

    const buyerDb = testEnv.authenticatedContext('buyer1').firestore();

    await assertSucceeds(getDoc(doc(buyerDb, 'batches', 'safeBatch')));
    await assertFails(getDoc(doc(buyerDb, 'batches', 'unsafeBatch')));
    await assertFails(updateDoc(doc(buyerDb, 'batches', 'safeBatch'), { lotCode: 'NEW' }));
  });

  it('allows public reads of batch verification docs and blocks writes', async () => {
    await seedDoc('batchPublicVerifications', 'HTSL-ABC123', {
      batchCode: 'HTSL-ABC123',
      fishType: 'Tuna',
      verificationStatus: 'verified'
    });

    const anonDb = testEnv.unauthenticatedContext().firestore();

    await assertSucceeds(getDoc(doc(anonDb, 'batchPublicVerifications', 'HTSL-ABC123')));
    await assertFails(setDoc(doc(anonDb, 'batchPublicVerifications', 'HTSL-NEW'), {
      batchCode: 'HTSL-NEW'
    }));
  });

  it('prevents client-side role escalation via users updates', async () => {
    const fisherDb = testEnv.authenticatedContext('fish1').firestore();
    await assertFails(updateDoc(doc(fisherDb, 'users', 'fish1'), { role: 'admin' }));
  });

  it('allows admin broad access while keeping audit logs write-protected', async () => {
    await seedDoc('auditLogs', 'log1', { action: 'created-landing' });

    const adminDb = testEnv.authenticatedContext('admin1').firestore();

    const readResult = await getDoc(doc(adminDb, 'auditLogs', 'log1'));
    expect(readResult.exists()).toBe(true);
    await assertFails(setDoc(doc(adminDb, 'auditLogs', 'log2'), { action: 'tamper' }));
    await assertFails(setDoc(doc(adminDb, 'harbors', 'h1'), { name: 'Main Harbor' }));
  });
});
