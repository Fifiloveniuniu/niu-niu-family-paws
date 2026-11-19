import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { initializeApp, deleteApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import photos from '../docs/test-assets/pet-photos.json' with { type: 'json' };
if (
  process.env.GCLOUD_PROJECT !== 'demo-niu-niu' ||
  process.env.FIRESTORE_EMULATOR_HOST !== '127.0.0.1:8085' ||
  process.env.FIREBASE_AUTH_EMULATOR_HOST !== '127.0.0.1:9099'
)
  throw Error('Isolated demo emulators required');
const id = (label) => {
  const h = createHash('sha256').update(label).digest('hex');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`;
};
test('local workflow preparation is repeatable and preserves existing edits and non-fixture pets', async (t) => {
  const app = initializeApp({ projectId: 'demo-niu-niu' }, 'tooling-' + randomUUID());
  const database = 'integration-tools-' + randomUUID(),
    db = getFirestore(app, database),
    auth = getAuth(app);
  const createdUsers = [];
  for (const uid of ['local-demo-admin', 'local-demo-customer']) {
    try {
      await auth.getUser(uid);
    } catch (error) {
      if (error.code !== 'auth/user-not-found') throw error;
      createdUsers.push(uid);
    }
  }
  t.after(async () => {
    await Promise.all(createdUsers.map((uid) => auth.deleteUser(uid)));
    await deleteApp(app);
  });
  const batch = db.batch(),
    now = new Date().toISOString();
  for (let i = 0; i < 6; i++) {
    const cid = id('local-photo-customer-' + i);
    batch.set(db.doc('customers/' + cid), {
      id: cid,
      name: '[TEST] Tool family ' + i,
      testFixture: i !== 5,
      version: 1,
      createdAt: now,
      updatedAt: now,
    });
    for (const species of ['dog', 'cat', 'rabbit']) {
      const pid = id(`local-photo-${species}-${i}`),
        photo = photos.entries.find((item) => item.species === species);
      batch.set(db.doc(`customers/${cid}/pets/${pid}`), {
        id: pid,
        customerId: cid,
        name: '[TEST] Tool pet',
        testFixture: !(i === 0 && species === 'dog'),
        ...(i === 0 && species === 'dog' ? { species, weightKg: 42 } : {}),
        testSpecies: species,
        photo: photo.sha256,
        photoCredit: {
          creator: photo.creator,
          sourcePage: photo.sourcePage,
          license: photo.license,
          licenseUrl: photo.licenseUrl,
        },
        version: 1,
        createdAt: now,
        updatedAt: now,
      });
    }
  }
  await batch.commit();
  const protectedPath = `customers/${id('local-photo-customer-0')}/pets/${id('local-photo-dog-0')}`;
  const protectedBefore = (await db.doc(protectedPath).get()).data();
  const unmarkedCustomerPet = `customers/${id('local-photo-customer-5')}/pets/${id('local-photo-cat-5')}`;
  const unmarkedBefore = (await db.doc(unmarkedCustomerPet).get()).data();
  const seed = () => {
    const result = spawnSync(process.execPath, ['scripts/seed-local-workflows.mjs'], {
      cwd: new URL('..', import.meta.url),
      env: { ...process.env, FAMILY_PAWS_FIXTURE_DATABASE: database },
      encoding: 'utf8',
      timeout: 90000,
    });
    assert.equal(result.status, 0, result.stderr);
    return JSON.parse(result.stdout.trim().split('\n').at(-1));
  };
  const first = seed();
  assert.equal(first.createdBookings, 14);
  assert.equal(first.createdBalances, 14);
  assert.deepEqual((await db.doc(protectedPath).get()).data(), protectedBefore);
  assert.equal((await db.doc(protectedPath + '/balances/boarding').get()).exists, false);
  assert.equal(
    (await db.collection('bookings').where('petId', '==', protectedBefore.id).get()).empty,
    true,
  );
  assert.deepEqual((await db.doc(unmarkedCustomerPet).get()).data(), unmarkedBefore);
  assert.equal((await db.doc(unmarkedCustomerPet + '/balances/boarding').get()).exists, false);
  const editedPath = `customers/${id('local-photo-customer-1')}/pets/${id('local-photo-dog-1')}`;
  await db.doc(editedPath).update({ name: '[TEST] Retained edit', weightKg: 42, version: 99 });
  await db.doc(editedPath + '/balances/boarding').update({ days: 17, version: 99 });
  const petBefore = (await db.doc(editedPath).get()).data(),
    balanceBefore = (await db.doc(editedPath + '/balances/boarding').get()).data();
  const bookingBefore = (await db.collection('bookings').get()).docs.map((doc) => doc.data());
  const second = seed();
  for (const [key, value] of Object.entries(second))
    if (key.startsWith('created')) assert.equal(value, 0, key);
  assert.deepEqual((await db.doc(editedPath).get()).data(), petBefore);
  assert.deepEqual((await db.doc(editedPath + '/balances/boarding').get()).data(), balanceBefore);
  assert.deepEqual(
    (await db.collection('bookings').get()).docs.map((doc) => doc.data()),
    bookingBefore,
  );
  assert.deepEqual((await db.doc(protectedPath).get()).data(), protectedBefore);
  assert.deepEqual((await db.doc(unmarkedCustomerPet).get()).data(), unmarkedBefore);
});
