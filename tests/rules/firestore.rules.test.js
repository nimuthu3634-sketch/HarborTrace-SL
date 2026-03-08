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
      verificationStatus: 'pending'
    });
    await seedDoc('trips', 'otherTrip', {
      fishermanUid: 'fish2',
      status: 'active',
      verificationStatus: 'pending'
    });

    const fisherDb = testEnv.authenticatedContext('fish1').firestore();

    await assertSucceeds(getDoc(doc(fisherDb, 'trips', 'ownTrip')));
    await assertFails(getDoc(doc(fisherDb, 'trips', 'otherTrip')));

    await assertSucceeds(updateDoc(doc(fisherDb, 'trips', 'ownTrip'), { status: 'returned' }));
    await assertFails(updateDoc(doc(fisherDb, 'trips', 'otherTrip'), { status: 'returned' }));
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

  it('allows harbor officer workflow updates on operational collections', async () => {
    await seedDoc('alerts', 'a1', {
      fishermanUid: 'fish1',
      message: 'engine issue',
      verificationStatus: 'pending'
    });

    const officerDb = testEnv.authenticatedContext('off1').firestore();
    await assertSucceeds(updateDoc(doc(officerDb, 'alerts', 'a1'), {
      verificationStatus: 'resolved',
      resolvedByOfficerUid: 'off1'
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
    await assertSucceeds(setDoc(doc(adminDb, 'harbors', 'h1'), { name: 'Main Harbor' }));
  });
});
