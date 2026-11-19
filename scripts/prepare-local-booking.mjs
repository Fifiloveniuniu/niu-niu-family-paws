// Prepare only explicitly synthetic demo records; never production or owner pet values.
import { createHash } from 'node:crypto';
import { initializeApp, deleteApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { houseStore } from '../apps/api/src/houses.ts';
import { roomStore } from '../apps/api/src/rooms.ts';
if (
  process.env.GCLOUD_PROJECT !== 'demo-niu-niu' ||
  process.env.FIRESTORE_EMULATOR_HOST !== '127.0.0.1:8085' ||
  process.env.FIREBASE_AUTH_EMULATOR_HOST !== '127.0.0.1:9099'
)
  throw Error('Only isolated demo emulators allowed');
const app = initializeApp({ projectId: 'demo-niu-niu' }),
  db = getFirestore(app, process.env.FAMILY_PAWS_FIXTURE_DATABASE ?? '(default)');
const id = (label) => {
  const hash = createHash('sha256').update(label).digest('hex');
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-4${hash.slice(13, 16)}-a${hash.slice(17, 20)}-${hash.slice(20, 32)}`;
};
let migrated = 0;
try {
  const auth = getAuth(app);
  for (const user of [
    { uid: 'local-demo-admin', email: 'local-admin@example.test', customClaims: { admin: true } },
    { uid: 'local-demo-customer', email: 'local-customer@example.test' },
  ]) {
    try {
      await auth.getUser(user.uid);
    } catch (error) {
      if (error.code !== 'auth/user-not-found') throw error;
      const result = await auth.importUsers([
        {
          ...user,
          emailVerified: true,
          providerData: [{ providerId: 'google.com', uid: user.email, email: user.email }],
        },
      ]);
      if (result.failureCount) throw Error('Cannot create isolated demo identity');
    }
  }
  const pets = await db.collectionGroup('pets').where('testFixture', '==', true).get();
  for (const pet of pets.docs)
    await db.runTransaction(async (tx) => {
      const current = await tx.get(pet.ref),
        before = current.data();
      if (
        !before ||
        before.testFixture !== true ||
        before.species !== undefined ||
        !['dog', 'cat', 'rabbit'].includes(before.testSpecies)
      )
        return;
      const next = {
        ...before,
        species: before.testSpecies,
        version: before.version + 1,
        updatedAt: new Date().toISOString(),
      };
      tx.update(pet.ref, {
        species: next.species,
        version: next.version,
        updatedAt: next.updatedAt,
      });
      tx.create(pet.ref.collection('history').doc(String(next.version)), {
        actor: 'local-fixture-preparation',
        at: next.updatedAt,
        source: 'test-fixture',
        before,
        after: next,
      });
      migrated++;
    });
  const hid = id('local-empty-practice-house-v1'),
    rid = id('local-empty-practice-room-v1');
  if (!(await db.doc('houses/' + hid).get()).exists)
    await houseStore(db).save(
      hid,
      {
        name: '[TEST / 测试] Practice house',
        address: '[TEST ONLY] Local practice location — not a business address',
        timezone: 'America/Los_Angeles',
        version: 0,
      },
      'local-fixture-preparation',
    );
  if (!(await db.doc(`houses/${hid}/rooms/${rid}`).get()).exists)
    await roomStore(db).save(
      hid,
      rid,
      {
        name: '[TEST / 测试] Practice room',
        capacity: 2,
        costs: { dog: 1, cat: 1, rabbit: 1 },
        version: 0,
      },
      'local-fixture-preparation',
    );
  console.log(
    JSON.stringify({
      migratedSyntheticPets: migrated,
      practiceHouse: hid,
      practiceRoom: rid,
      existingBookingsAndBalancesPreserved: true,
    }),
  );
} finally {
  await deleteApp(app);
}
