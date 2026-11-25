import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { initializeApp, deleteApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { firestoreStore } from '../apps/api/src/store.ts';
import { petStore, PetAccess } from '../apps/api/src/pets.ts';
if (
  process.env.GCLOUD_PROJECT !== 'demo-niu-niu' ||
  process.env.FIRESTORE_EMULATOR_HOST !== '127.0.0.1:8085'
)
  throw Error('Isolated demo emulators required');
const id = (n) => '00000000-0000-4000-8000-' + n.toString(16).padStart(12, '0');

test('substring filters find legacy records beyond scan boundaries and join owners without duplicate customers', async (t) => {
  const app = initializeApp({ projectId: 'demo-niu-niu' }, 'search-' + randomUUID());
  t.after(() => deleteApp(app));
  const db = getFirestore(app, 'search-' + randomUUID());
  const writes = [];
  const now = '2026-11-24T00:00:00Z';
  for (let i = 0; i < 280; i++)
    writes.push([
      `customers/${id(i)}`,
      {
        id: id(i),
        name: i === 270 ? '小雨 Li Mei' : 'Fixture family ' + i,
        email: i === 270 ? 'parent.alice@example.test' : '',
        loginEmail: i === 270 ? 'signin.parent@example.test' : null,
        ownerUid: i === 0 ? 'owner' : null,
        language: 'en',
        version: 1,
        createdAt: now,
        updatedAt: now,
      },
    ]);
  const pet = (cid, pid, name) =>
    writes.push([
      `customers/${cid}/pets/${pid}`,
      {
        id: pid,
        customerId: cid,
        name,
        photo: null,
        species: 'dog',
        weightKg: 5,
        version: 1,
        createdAt: now,
        updatedAt: now,
      },
    ]);
  for (let i = 0; i < 275; i++) pet(id(0), id(i), i < 250 ? 'Ordinary pet' : 'SnowBall ' + i);
  for (let i = 10; i < 40; i++) {
    pet(id(i), id(1), 'Ball group');
    pet(id(i), id(2), 'Second Ball group');
  }
  pet(id(270), id(1), 'My Snowball');
  pet(id(270), id(2), 'Snowball junior');
  pet(id(271), id(1), 'Mittens');
  for (let start = 0; start < writes.length; start += 400) {
    const batch = db.batch();
    for (const [path, data] of writes.slice(start, start + 400)) batch.set(db.doc(path), data);
    await batch.commit();
  }
  const customers = firestoreStore(db);
  const collect = async (search, petSearch, customerId) => {
    const result = [];
    let cursor;
    for (let i = 0; i < 20; i++) {
      const page = await customers.list(cursor, search, '25', petSearch, customerId);
      result.push(...page.items);
      if (!page.nextCursor) return result;
      assert.notEqual(page.nextCursor, cursor);
      cursor = page.nextCursor;
    }
    throw Error('Cursor did not finish');
  };
  const first = await customers.list(undefined, undefined, '25', 'bALL');
  assert.equal(first.items.length, 0);
  assert.ok(first.nextCursor);
  const found = await collect(undefined, 'BaLL');
  assert.equal(found.length, 32);
  assert.equal(new Set(found.map((x) => x.id)).size, 32);
  assert.deepEqual(
    (await collect('雨 li')).map((x) => x.id),
    [id(270)],
  );
  assert.deepEqual(
    (await collect('ALICE@')).map((x) => x.id),
    [id(270)],
  );
  assert.deepEqual(
    (await collect('PARENT@EXAMPLE')).map((x) => x.id),
    [id(270)],
  );
  assert.deepEqual(
    (await collect('MEI', 'ball')).map((x) => x.id),
    [id(270)],
  );
  assert.deepEqual(await collect(undefined, 'does-not-exist'), []);
  assert.deepEqual(
    (await collect(undefined, 'ball', id(0))).map((x) => x.id),
    [id(0)],
  );
  await assert.rejects(
    customers.list(first.nextCursor, 'changed', '25', 'ball'),
    (e) => e.validation === true,
  );
  await assert.rejects(
    customers.list('bad-token', undefined, '25', 'ball'),
    (e) => e.validation === true,
  );
  const pets = petStore(db, { put: async () => {}, get: async () => Buffer.from('') });
  const owner = { uid: 'owner', google: true };
  const p1 = await pets.list(owner, id(0), undefined, '25', 'BALL');
  assert.equal(p1.items.length, 0);
  assert.ok(p1.nextCursor);
  const p2 = await pets.list(owner, id(0), p1.nextCursor, '25', 'ball');
  assert.equal(p2.items.length, 25);
  assert.equal(p2.nextCursor, null);
  assert.ok(p2.items.every((x) => x.name.toLowerCase().includes('ball')));
  await assert.rejects(pets.list(owner, id(270), undefined, '25', 'ball'), PetAccess);
});
