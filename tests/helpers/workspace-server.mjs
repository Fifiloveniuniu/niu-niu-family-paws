import { accessManagementStore } from '../../apps/api/src/access-management.ts';
import { businessMetricsStore } from '../../apps/api/src/business-metrics.ts';
import { employeeAssignmentStore } from '../../apps/api/src/employee-assignments.ts';
import { operationsStore } from '../../apps/api/src/operations.ts';
import { pricingStore } from '../../apps/api/src/pricing.ts';
import { cancellationDraftStore } from '../../apps/api/src/cancellation-draft.ts';
import { validityTemplateStore } from '../../apps/api/src/validity-templates.ts';
import sharp from 'sharp';
import { randomUUID, createHash } from 'node:crypto';
import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { buildApp } from '../../apps/api/src/app.ts';
import { firebaseIdentity } from '../../apps/api/src/authentication.ts';
import { workspaceStore } from '../../apps/api/src/workspace.ts';
import { firestoreStore, customerSearchKeys } from '../../apps/api/src/store.ts';
import { petStore } from '../../apps/api/src/pets.ts';
import { houseStore } from '../../apps/api/src/houses.ts';
import { roomStore } from '../../apps/api/src/rooms.ts';
import { balanceStore } from '../../apps/api/src/balances.ts';
import { bookingStore } from '../../apps/api/src/bookings.ts';
if (
  process.env.FIRESTORE_EMULATOR_HOST !== '127.0.0.1:8085' ||
  process.env.FIREBASE_AUTH_EMULATOR_HOST !== '127.0.0.1:9099'
)
  throw Error('Only isolated demo emulators allowed');
const app = initializeApp({ projectId: 'demo-niu-niu' });
const db = getFirestore(app, 'integration-browser-' + randomUUID());
const auth = getAuth(app);
const createdIdentities = [];
async function identity(admin = false, employee = false) {
  const sub = randomUUID();
  const jwt =
    [
      { alg: 'none', typ: 'JWT' },
      {
        iss: 'https://accounts.google.com',
        aud: 'demo-test',
        sub,
        email: sub + '@example.test',
        email_verified: true,
        name: '[TEST] Browser identity',
      },
    ]
      .map((v) => Buffer.from(JSON.stringify(v)).toString('base64url'))
      .join('.') + '.';
  const response = await fetch(
    'http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithIdp?key=demo-key',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        postBody: new URLSearchParams({ id_token: jwt, providerId: 'google.com' }).toString(),
        requestUri: 'http://localhost',
        returnSecureToken: true,
      }),
    },
  );
  if (!response.ok) throw Error('Cannot initialize emulator identity');
  const user = await response.json();
  if (admin || employee) await auth.setCustomUserClaims(user.localId, { admin, employee });
  const result = { jwt, uid: user.localId, email: sub + '@example.test' };
  createdIdentities.push(result);
  return result;
}
const administrator = await identity(true, true),
  owner = await identity(),
  employee = await identity(false, true);
const photos = new Map();
const api = buildApp({
  businessMetrics: businessMetricsStore(db),
  verify: firebaseIdentity(auth, db),
  accessManagement: accessManagementStore(db, auth),
  store: firestoreStore(db),
  pets: petStore(db, {
    put: async (k, v) => {
      photos.set(k, v);
    },
    get: async (k) => photos.get(k),
  }),
  houses: houseStore(db),
  rooms: roomStore(db),
  balances: balanceStore(db),
  bookings: bookingStore(db),
  employeeAssignments: employeeAssignmentStore(db, auth),
  operations: operationsStore(db),
  pricing: pricingStore(db),
  cancellationDraft: cancellationDraftStore(db),
  validityTemplates: validityTemplateStore(db),
  workspace: workspaceStore(db),
});
const cid = randomUUID(),
  pid = randomUUID(),
  hid = randomUUID(),
  rid = randomUUID();
const now = new Date().toISOString();
const photoBytes = await sharp({
  create: { width: 64, height: 64, channels: 3, background: '#8da877' },
})
  .webp()
  .toBuffer();
const photo = createHash('sha256').update(photoBytes).digest('hex');
photos.set(`photos/${cid}/${pid}/${photo}.webp`, photoBytes);
let batch = db.batch();
for (let i = 0; i < 100; i++) {
  const customerId = i === 0 ? cid : randomUUID();
  batch.set(db.doc('customers/' + customerId), {
    id: customerId,
    name: i === 0 ? '[TEST] Alice' : '[TEST] Customer ' + String(i).padStart(3, '0'),
    searchKeys: customerSearchKeys(
      i === 0 ? '[TEST] Alice' : '[TEST] Customer ' + String(i).padStart(3, '0'),
      '',
    ),
    email: '',
    phone: '',
    language: 'en',
    version: 1,
    createdAt: now,
    updatedAt: now,
    ...(i === 0 ? { ownerUid: owner.uid, loginEmail: owner.email } : {}),
  });
  for (let j = 0; j < 3; j++) {
    const petId = i === 0 && j === 0 ? pid : randomUUID();
    batch.set(db.doc(`customers/${customerId}/pets/${petId}`), {
      id: petId,
      customerId,
      name: i === 0 ? '[TEST] Alice pet ' + j : '[TEST] Pet ' + i + '-' + j,
      species: ['dog', 'cat', 'rabbit'][j],
      weightKg: 12.5,
      photo: i === 0 && j === 0 ? photo : null,
      version: 1,
      createdAt: now,
      updatedAt: now,
    });
  }
}
await batch.commit();
// The mapping uses the same canonical UID ownership shape as real profiles.
await db.doc('people/' + owner.uid).set({ customerId: cid });
await db.doc('houses/' + hid).set({
  id: hid,
  name: '[TEST] Practice house',
  address: '[TEST] Isolated browser fixture address',
  timezone: 'America/Los_Angeles',
  version: 1,
  createdAt: now,
  updatedAt: now,
});
await db.doc(`houses/${hid}/rooms/${rid}`).set({
  id: rid,
  houseId: hid,
  name: '[TEST] Practice room',
  capacity: 2,
  costs: { dog: 1, cat: 1, rabbit: 1 },
  version: 1,
  createdAt: now,
  updatedAt: now,
});
await db.doc('employeeAssignments/' + employee.uid).set({ houseIds: [hid], version: 1 });
api.get('/__test-fixture', async () => ({
  customerCount: (await db.collection('customers').count().get()).data().count,
  administrator: await identity(true, true),
  owner,
  employee,
  cid,
  pid,
  hid,
  rid,
}));
await api.listen({ host: '127.0.0.1', port: 8092 });

for (const signal of ['SIGINT', 'SIGTERM'])
  process.once(signal, async () => {
    await api.close();
    await Promise.allSettled(createdIdentities.map((user) => auth.deleteUser(user.uid)));
    process.exit(0);
  });
