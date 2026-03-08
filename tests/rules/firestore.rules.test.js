import fs from 'node:fs';
import path from 'node:path';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment
} from '@firebase/rules-unit-testing';
import { beforeAll, afterAll, afterEach, describe, expect, it } from 'vitest';
import { doc, getDoc, setDoc } from 'firebase/firestore';

const projectId = 'harbortrace-sl-dev';
let testEnv;

async function seedUser(uid, role) {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), 'users', uid), { uid, role, displayName: uid });
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

    await seedUser('fish1', 'fisherman');
    await seedUser('off1', 'harbor_officer');
    await seedUser('admin1', 'admin');
    await seedUser('buyer1', 'buyer');
  });

  afterEach(async () => {
    await testEnv.clearFirestore();
    await seedUser('fish1', 'fisherman');
    await seedUser('off1', 'harbor_officer');
    await seedUser('admin1', 'admin');
    await seedUser('buyer1', 'buyer');
  });

  afterAll(async () => {
    await testEnv.cleanup();
  });

  it('allows fisherman to create own trip but not someone else', async () => {
    const fishermanDb = testEnv.authenticatedContext('fish1').firestore();
    await assertSucceeds(setDoc(doc(fishermanDb, 'trips', 'trip1'), { fishermanUid: 'fish1', status: 'active' }));
    await assertFails(setDoc(doc(fishermanDb, 'trips', 'trip2'), { fishermanUid: 'fish2', status: 'active' }));
  });

  it('prevents client write into batches', async () => {
    const officerDb = testEnv.authenticatedContext('off1').firestore();
    await assertFails(setDoc(doc(officerDb, 'batches', 'b1'), { batchCode: 'X' }));
  });

  it('allows public read for notices but blocks anonymous trip read', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'notices', 'n1'), { title: 'Weather Advisory' });
      await setDoc(doc(ctx.firestore(), 'trips', 'tripx'), { fishermanUid: 'fish1', status: 'active' });
    });

    const anonDb = testEnv.unauthenticatedContext().firestore();
    await assertSucceeds(getDoc(doc(anonDb, 'notices', 'n1')));
    await assertFails(getDoc(doc(anonDb, 'trips', 'tripx')));
  });

  it('restricts audit log reads to admin', async () => {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'auditLogs', 'a1'), { action: 'x' });
    });

    const adminDb = testEnv.authenticatedContext('admin1').firestore();
    const fisherDb = testEnv.authenticatedContext('fish1').firestore();

    const readAdmin = await getDoc(doc(adminDb, 'auditLogs', 'a1'));
    expect(readAdmin.exists()).toBe(true);
    await assertFails(getDoc(doc(fisherDb, 'auditLogs', 'a1')));
  });
});
