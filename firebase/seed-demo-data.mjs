import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';

const PROJECT_ID = process.env.GCLOUD_PROJECT || process.env.FIREBASE_PROJECT_ID || 'harbortrace-sl-dev';

if (!process.env.FIRESTORE_EMULATOR_HOST) {
  throw new Error('Refusing to seed without FIRESTORE_EMULATOR_HOST. Run against Firebase Emulator Suite.');
}

initializeApp({ projectId: PROJECT_ID });

const db = getFirestore();
const auth = getAuth();

const now = new Date();
const hoursAgo = (hours) => new Date(now.getTime() - hours * 60 * 60 * 1000);
const hoursFromNow = (hours) => new Date(now.getTime() + hours * 60 * 60 * 1000);
const ts = (date) => Timestamp.fromDate(date);

const demoUsers = [
  {
    uid: 'admin-senaratne',
    email: 'admin.demo@harbortrace.lk',
    password: 'DemoPass#2026',
    displayName: 'Nadeesha Senaratne',
    role: 'admin',
    homeHarborId: null,
    phoneNumber: '+94 77 410 2288'
  },
  {
    uid: 'officer-colombo',
    email: 'officer.colombo@harbortrace.lk',
    password: 'DemoPass#2026',
    displayName: 'Ruwan Perera',
    role: 'harbor_officer',
    homeHarborId: 'harbor-colombo',
    phoneNumber: '+94 71 880 1904'
  },
  {
    uid: 'officer-galle',
    email: 'officer.galle@harbortrace.lk',
    password: 'DemoPass#2026',
    displayName: 'Tharindu Jayasinghe',
    role: 'harbor_officer',
    homeHarborId: 'harbor-galle',
    phoneNumber: '+94 76 233 4477'
  },
  {
    uid: 'fisher-kalpitiya',
    email: 'fisher.kalpitiya@harbortrace.lk',
    password: 'DemoPass#2026',
    displayName: 'Chathura Fernando',
    role: 'fisherman',
    homeHarborId: 'harbor-kalpitiya',
    phoneNumber: '+94 70 912 5501'
  },
  {
    uid: 'fisher-negombo',
    email: 'fisher.negombo@harbortrace.lk',
    password: 'DemoPass#2026',
    displayName: 'Sajith Cooray',
    role: 'fisherman',
    homeHarborId: 'harbor-negombo',
    phoneNumber: '+94 75 881 2240'
  },
  {
    uid: 'fisher-trinco',
    email: 'fisher.trinco@harbortrace.lk',
    password: 'DemoPass#2026',
    displayName: 'Imran Niyas',
    role: 'fisherman',
    homeHarborId: 'harbor-trincomalee',
    phoneNumber: '+94 78 606 9332'
  },
  {
    uid: 'buyer-colombo',
    email: 'buyer.demo@harbortrace.lk',
    password: 'DemoPass#2026',
    displayName: 'Lakmini Foods Procurement',
    role: 'buyer',
    homeHarborId: 'harbor-colombo',
    phoneNumber: '+94 11 287 6300'
  }
];

const harbors = [
  { id: 'harbor-colombo', harborCode: 'LKCMB', harborName: 'Colombo Fisheries Harbor', district: 'Colombo', province: 'Western', latitude: 6.9438, longitude: 79.8441, contactPhone: '+94 11 244 6530', managedByUid: 'officer-colombo' },
  { id: 'harbor-galle', harborCode: 'LKGAL', harborName: 'Galle Fisheries Harbor', district: 'Galle', province: 'Southern', latitude: 6.0335, longitude: 80.217, contactPhone: '+94 91 223 4570', managedByUid: 'officer-galle' },
  { id: 'harbor-negombo', harborCode: 'LKNEG', harborName: 'Negombo Fisheries Harbor', district: 'Gampaha', province: 'Western', latitude: 7.2012, longitude: 79.8396, contactPhone: '+94 31 222 5160', managedByUid: null },
  { id: 'harbor-kalpitiya', harborCode: 'LKKAL', harborName: 'Kalpitiya Anchorage Point', district: 'Puttalam', province: 'North Western', latitude: 8.2336, longitude: 79.7567, contactPhone: '+94 32 226 1300', managedByUid: null },
  { id: 'harbor-trincomalee', harborCode: 'LKTRI', harborName: 'Trincomalee Fisheries Harbor', district: 'Trincomalee', province: 'Eastern', latitude: 8.5678, longitude: 81.2335, contactPhone: '+94 26 222 6205', managedByUid: null }
];

const vessels = [
  { id: 'vsl-lk-4471', registrationNumber: 'IMUL-A-4471', vesselName: 'MFV Ruhunu Queen', ownerUid: 'fisher-negombo', fishermanUid: 'fisher-negombo', ownerRole: 'fisherman', homeHarborId: 'harbor-negombo', vesselType: 'multi_day', capacityTons: 14.5, radioCallSign: '4RFM5' },
  { id: 'vsl-lk-3382', registrationNumber: 'CPBD-B-3382', vesselName: 'MFV Lagoon Star', ownerUid: 'fisher-kalpitiya', fishermanUid: 'fisher-kalpitiya', ownerRole: 'fisherman', homeHarborId: 'harbor-kalpitiya', vesselType: 'motorized', capacityTons: 6.8, radioCallSign: '4RKM2' },
  { id: 'vsl-lk-5920', registrationNumber: 'TNEA-C-5920', vesselName: 'MFV Eastern Pearl', ownerUid: 'fisher-trinco', fishermanUid: 'fisher-trinco', ownerRole: 'fisherman', homeHarborId: 'harbor-trincomalee', vesselType: 'multi_day', capacityTons: 11.2, radioCallSign: '4RTP9' },
  { id: 'vsl-lk-6025', registrationNumber: 'SPLA-D-6025', vesselName: 'MFV Sagara Kumari', ownerUid: 'fisher-negombo', fishermanUid: 'fisher-negombo', ownerRole: 'fisherman', homeHarborId: 'harbor-colombo', vesselType: 'motorized', capacityTons: 5.1, radioCallSign: '4RCM8' }
];

const trips = [
  {
    id: 'trip-rq-1203', tripNumber: 'HTSL-TRIP-1203', vesselId: 'vsl-lk-4471', fishermanUid: 'fisher-negombo', departureHarborId: 'harbor-negombo',
    arrivalHarborId: null, destinationZone: 'W-07 deep sea tuna grounds', status: 'active',
    departureTime: ts(hoursAgo(19)), expectedReturnTime: ts(hoursFromNow(13)), actualReturnTime: null,
    crewCount: 7, emergencyContact: '+94 77 811 7733', notes: 'Nightline and longline tuna operation; weather stable.',
    createdByUid: 'fisher-negombo', createdByRole: 'fisherman'
  },
  {
    id: 'trip-lg-5509', tripNumber: 'HTSL-TRIP-5509', vesselId: 'vsl-lk-3382', fishermanUid: 'fisher-kalpitiya', departureHarborId: 'harbor-kalpitiya',
    arrivalHarborId: null, destinationZone: 'N-03 near Dutch Bay reef edge', status: 'overdue',
    departureTime: ts(hoursAgo(38)), expectedReturnTime: ts(hoursAgo(3)), actualReturnTime: null,
    crewCount: 5, emergencyContact: '+94 70 203 4411', notes: 'Fuel check completed; delayed by rough swells.',
    createdByUid: 'fisher-kalpitiya', createdByRole: 'fisherman'
  },
  {
    id: 'trip-ep-7710', tripNumber: 'HTSL-TRIP-7710', vesselId: 'vsl-lk-5920', fishermanUid: 'fisher-trinco', departureHarborId: 'harbor-trincomalee',
    arrivalHarborId: 'harbor-trincomalee', destinationZone: 'E-11 swordfish corridor', status: 'completed',
    departureTime: ts(hoursAgo(64)), expectedReturnTime: ts(hoursAgo(20)), actualReturnTime: ts(hoursAgo(18)),
    crewCount: 6, emergencyContact: '+94 78 120 0088', notes: 'Returned with mixed catch and minor net tear repairs.',
    createdByUid: 'fisher-trinco', createdByRole: 'fisherman'
  },
  {
    id: 'trip-sk-4412', tripNumber: 'HTSL-TRIP-4412', vesselId: 'vsl-lk-6025', fishermanUid: 'fisher-negombo', departureHarborId: 'harbor-colombo',
    arrivalHarborId: null, destinationZone: 'W-02 coastal seine zone', status: 'planned',
    departureTime: ts(hoursFromNow(7)), expectedReturnTime: ts(hoursFromNow(21)), actualReturnTime: null,
    crewCount: 4, emergencyContact: '+94 71 230 6601', notes: 'Awaiting final ice loading clearance.',
    createdByUid: 'officer-colombo', createdByRole: 'harbor_officer'
  },
  {
    id: 'trip-ep-9921', tripNumber: 'HTSL-TRIP-9921', vesselId: 'vsl-lk-5920', fishermanUid: 'fisher-trinco', departureHarborId: 'harbor-trincomalee',
    arrivalHarborId: null, destinationZone: 'E-14 offshore trawl lane', status: 'emergency',
    departureTime: ts(hoursAgo(11)), expectedReturnTime: ts(hoursFromNow(15)), actualReturnTime: null,
    crewCount: 6, emergencyContact: '+94 76 441 7272', notes: 'Engine cooling issue reported; escort requested.',
    createdByUid: 'fisher-trinco', createdByRole: 'fisherman'
  }
];

const alerts = [
  {
    id: 'alert-ep-9921', activeTripId: 'trip-ep-9921', tripId: 'trip-ep-9921', fishermanUid: 'fisher-trinco', harborId: 'harbor-trincomalee',
    status: 'pending', alertType: 'Engine Failure', severity: 'high', incidentMessage: 'Main engine temperature exceeded safe threshold; vessel drifting slowly east.',
    lastKnownLocation: '08°46N, 81°49E', acknowledgedByUid: null, resolvedByUid: null, closedAt: null
  },
  {
    id: 'alert-lg-5509', activeTripId: 'trip-lg-5509', tripId: 'trip-lg-5509', fishermanUid: 'fisher-kalpitiya', harborId: 'harbor-kalpitiya',
    status: 'acknowledged', alertType: 'Weather Risk', severity: 'medium', incidentMessage: 'Southwest swell intensified; requested delayed return window.',
    lastKnownLocation: '08°29N, 79°41E', acknowledgedByUid: 'officer-colombo', resolvedByUid: null, closedAt: null
  },
  {
    id: 'alert-rq-1203', activeTripId: 'trip-rq-1203', tripId: 'trip-rq-1203', fishermanUid: 'fisher-negombo', harborId: 'harbor-negombo',
    status: 'resolved', alertType: 'Medical Assistance', severity: 'critical', incidentMessage: 'Deckhand sustained hand injury; telemedicine guidance applied, condition stable.',
    lastKnownLocation: '07°44N, 79°58E', acknowledgedByUid: 'officer-colombo', resolvedByUid: 'officer-colombo', closedAt: ts(hoursAgo(4))
  }
];

const landings = [
  {
    id: 'landing-7710-a', landingNumber: 'HTSL-LND-7710-A', tripId: 'trip-ep-7710', fishermanUid: 'fisher-trinco', vesselId: 'vsl-lk-5920',
    harborId: 'harbor-trincomalee', landingHarborId: 'harbor-trincomalee', fishType: 'Yellowfin Tuna', quantity: 96, totalWeightKg: 1825,
    verificationStatus: 'verified', status: 'verified', verifiedByUid: 'officer-galle', verifiedAt: ts(hoursAgo(16)),
    speciesItems: [{ species: 'Yellowfin Tuna', grade: 'A', weightKg: 1320 }, { species: 'Skipjack Tuna', grade: 'B', weightKg: 505 }]
  },
  {
    id: 'landing-1203-a', landingNumber: 'HTSL-LND-1203-A', tripId: 'trip-rq-1203', fishermanUid: 'fisher-negombo', vesselId: 'vsl-lk-4471',
    harborId: 'harbor-colombo', landingHarborId: 'harbor-colombo', fishType: 'Bigeye Tuna', quantity: 44, totalWeightKg: 910,
    verificationStatus: 'pending', status: 'submitted', verifiedByUid: null, verifiedAt: null,
    speciesItems: [{ species: 'Bigeye Tuna', grade: 'A', weightKg: 530 }, { species: 'Swordfish', grade: 'B', weightKg: 380 }]
  },
  {
    id: 'landing-5509-a', landingNumber: 'HTSL-LND-5509-A', tripId: 'trip-lg-5509', fishermanUid: 'fisher-kalpitiya', vesselId: 'vsl-lk-3382',
    harborId: 'harbor-kalpitiya', landingHarborId: 'harbor-kalpitiya', fishType: 'Seer Fish', quantity: 58, totalWeightKg: 640,
    verificationStatus: 'pending', status: 'submitted', verifiedByUid: null, verifiedAt: null,
    speciesItems: [{ species: 'Seer Fish', grade: 'B', weightKg: 410 }, { species: 'Barracuda', grade: 'B', weightKg: 230 }]
  },
  {
    id: 'landing-9921-a', landingNumber: 'HTSL-LND-9921-A', tripId: 'trip-ep-9921', fishermanUid: 'fisher-trinco', vesselId: 'vsl-lk-5920',
    harborId: 'harbor-trincomalee', landingHarborId: 'harbor-trincomalee', fishType: 'Skipjack Tuna', quantity: 28, totalWeightKg: 470,
    verificationStatus: 'pending', status: 'submitted', verifiedByUid: null, verifiedAt: null,
    speciesItems: [{ species: 'Skipjack Tuna', grade: 'C', weightKg: 470 }]
  }
];

const fishBatches = [
  {
    id: 'batch-tri-101', batchCode: 'HTSL-TRI-101', lotCode: 'LOT-TRI-2026-031', landingId: 'landing-7710-a', tripId: 'trip-ep-7710',
    harborId: 'harbor-trincomalee', species: 'Yellowfin Tuna', speciesCode: 'YFT', netWeightKg: 600, weightKg: 600,
    qualityGrade: 'A', verificationStatus: 'verified', verified: true, generatedByUid: 'officer-galle', generatedByRole: 'harbor_officer', buyerSafe: true
  },
  {
    id: 'batch-tri-102', batchCode: 'HTSL-TRI-102', lotCode: 'LOT-TRI-2026-032', landingId: 'landing-7710-a', tripId: 'trip-ep-7710',
    harborId: 'harbor-trincomalee', species: 'Skipjack Tuna', speciesCode: 'SKJ', netWeightKg: 320, weightKg: 320,
    qualityGrade: 'B', verificationStatus: 'verified', verified: true, generatedByUid: 'officer-galle', generatedByRole: 'harbor_officer', buyerSafe: true
  },
  {
    id: 'batch-col-188', batchCode: 'HTSL-CMB-188', lotCode: 'LOT-CMB-2026-119', landingId: 'landing-1203-a', tripId: 'trip-rq-1203',
    harborId: 'harbor-colombo', species: 'Bigeye Tuna', speciesCode: 'BET', netWeightKg: 420, weightKg: 420,
    qualityGrade: 'A', verificationStatus: 'pending', verified: false, generatedByUid: 'officer-colombo', generatedByRole: 'harbor_officer', buyerSafe: false
  }
];

const notices = [
  {
    id: 'notice-weather-west', title: 'Southwest Monsoon Advisory: Western Waters',
    body: 'A high-wind band is expected off Colombo and Negombo from 1800 hrs. Multi-day vessels should confirm bilge and communication checks before departure.',
    scope: 'harbor', harborId: 'harbor-colombo', targetRole: 'all', targetRoles: ['fisherman', 'harbor_officer', 'buyer', 'admin'],
    priority: 'urgent', status: 'published', publishedAt: ts(hoursAgo(2)), expiresAt: ts(hoursFromNow(20)), createdBy: 'officer-colombo', createdByUid: 'officer-colombo'
  },
  {
    id: 'notice-verification-cutoff', title: 'Landing Verification Cutoff for Export Lots',
    body: 'Verified landings intended for Friday export consolidation must be submitted by 14:00 hrs on Thursday to complete residue documentation.',
    scope: 'national', harborId: null, targetRole: 'buyer', targetRoles: ['buyer', 'admin'],
    priority: 'important', status: 'published', publishedAt: ts(hoursAgo(7)), expiresAt: ts(hoursFromNow(72)), createdBy: 'admin-senaratne', createdByUid: 'admin-senaratne'
  },
  {
    id: 'notice-training', title: 'Harbor Officer Drill: Incident Escalation Workflow',
    body: 'Quarterly response drill will run this Saturday at 09:30 hrs. Officers should test radio handover, alert acknowledgement, and audit entry completion steps.',
    scope: 'national', harborId: null, targetRole: 'harbor_officer', targetRoles: ['harbor_officer', 'admin'],
    priority: 'normal', status: 'published', publishedAt: ts(hoursAgo(30)), expiresAt: ts(hoursFromNow(168)), createdBy: 'admin-senaratne', createdByUid: 'admin-senaratne'
  }
];

const auditLogs = [
  { id: 'audit-001', actorUid: 'officer-colombo', actorRole: 'harbor_officer', action: 'trip.status.updated', actionStatus: 'success', entityCollection: 'trips', entityId: 'trip-lg-5509', ownerUid: 'fisher-kalpitiya', harborId: 'harbor-kalpitiya', details: { from: 'active', to: 'overdue', reason: 'Expected return exceeded by 3h.' } },
  { id: 'audit-002', actorUid: 'fisher-trinco', actorRole: 'fisherman', action: 'alert.created', actionStatus: 'success', entityCollection: 'emergencyAlerts', entityId: 'alert-ep-9921', ownerUid: 'fisher-trinco', harborId: 'harbor-trincomalee', details: { alertType: 'Engine Failure', severity: 'high' } },
  { id: 'audit-003', actorUid: 'officer-galle', actorRole: 'harbor_officer', action: 'landing.verified', actionStatus: 'success', entityCollection: 'landings', entityId: 'landing-7710-a', ownerUid: 'fisher-trinco', harborId: 'harbor-trincomalee', details: { verificationStatus: 'verified', verifiedWeightKg: 1825 } },
  { id: 'audit-004', actorUid: 'officer-galle', actorRole: 'harbor_officer', action: 'batch.generated', actionStatus: 'success', entityCollection: 'fishBatches', entityId: 'batch-tri-101', ownerUid: 'fisher-trinco', harborId: 'harbor-trincomalee', details: { batchCode: 'HTSL-TRI-101', landingId: 'landing-7710-a' } },
  { id: 'audit-005', actorUid: 'admin-senaratne', actorRole: 'admin', action: 'notice.published', actionStatus: 'success', entityCollection: 'notices', entityId: 'notice-weather-west', ownerUid: null, harborId: 'harbor-colombo', details: { priority: 'urgent', targetRole: 'all' } },
  { id: 'audit-006', actorUid: 'admin-senaratne', actorRole: 'admin', action: 'user.created', actionStatus: 'success', entityCollection: 'users', entityId: 'fisher-trinco', ownerUid: 'fisher-trinco', harborId: 'harbor-trincomalee', details: { role: 'fisherman', invitedBy: 'admin-senaratne' } }
];

const seededCollections = ['auditLogs', 'fishBatches', 'landings', 'emergencyAlerts', 'trips', 'vessels', 'notices', 'harbors', 'users'];

async function clearCollection(collectionName) {
  const snap = await db.collection(collectionName).select().get();
  if (snap.empty) return;

  const batchSize = 400;
  for (let i = 0; i < snap.docs.length; i += batchSize) {
    const batch = db.batch();
    for (const doc of snap.docs.slice(i, i + batchSize)) {
      batch.delete(doc.ref);
    }
    await batch.commit();
  }
}

async function upsertAuthUsers() {
  for (const user of demoUsers) {
    const { uid, email, password, displayName } = user;
    try {
      await auth.getUser(uid);
      await auth.updateUser(uid, { email, password, displayName, emailVerified: true, disabled: false });
    } catch {
      await auth.createUser({ uid, email, password, displayName, emailVerified: true, disabled: false });
    }
  }
}

async function seed() {
  console.log(`Seeding HarborTrace SL demo data into project: ${PROJECT_ID}`);

  for (const name of seededCollections) {
    await clearCollection(name);
  }

  await upsertAuthUsers();

  for (const user of demoUsers) {
    const { uid, password, ...profile } = user;
    await db.collection('users').doc(uid).set({
      uid,
      ...profile,
      isActive: true,
      createdByUid: 'admin-senaratne',
      createdAt: ts(hoursAgo(240)),
      updatedAt: ts(hoursAgo(6))
    });
  }

  for (const harbor of harbors) {
    await db.collection('harbors').doc(harbor.id).set({
      ...harbor,
      createdAt: ts(hoursAgo(300)),
      updatedAt: ts(hoursAgo(12))
    });
  }

  for (const vessel of vessels) {
    await db.collection('vessels').doc(vessel.id).set({
      ...vessel,
      isActive: true,
      createdAt: ts(hoursAgo(180)),
      updatedAt: ts(hoursAgo(4))
    });
  }

  for (const trip of trips) {
    await db.collection('trips').doc(trip.id).set({
      ...trip,
      createdAt: trip.departureTime,
      updatedAt: ts(hoursAgo(1))
    });
  }

  for (const alert of alerts) {
    await db.collection('emergencyAlerts').doc(alert.id).set({
      ...alert,
      tripStatus: trips.find((trip) => trip.id === alert.tripId)?.status ?? 'active',
      createdAt: ts(hoursAgo(8)),
      updatedAt: ts(hoursAgo(2))
    });
  }

  for (const landing of landings) {
    await db.collection('landings').doc(landing.id).set({
      ...landing,
      createdAt: ts(hoursAgo(landing.verificationStatus === 'verified' ? 17 : 5)),
      updatedAt: ts(hoursAgo(landing.verificationStatus === 'verified' ? 16 : 3))
    });
  }

  for (const batch of fishBatches) {
    await db.collection('fishBatches').doc(batch.id).set({
      ...batch,
      createdAt: ts(hoursAgo(15)),
      updatedAt: ts(hoursAgo(5))
    });
  }

  for (const notice of notices) {
    await db.collection('notices').doc(notice.id).set({
      ...notice,
      createdAt: ts(hoursAgo(36)),
      updatedAt: ts(hoursAgo(2))
    });
  }

  for (let i = 0; i < auditLogs.length; i += 1) {
    const entry = auditLogs[i];
    await db.collection('auditLogs').doc(entry.id).set({
      ...entry,
      createdAt: ts(hoursAgo(12 - i * 1.5))
    });
  }

  console.log('Seed complete. Demo users (password: DemoPass#2026):');
  for (const user of demoUsers) {
    console.log(`- ${user.email} (${user.role})`);
  }
}

seed().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
