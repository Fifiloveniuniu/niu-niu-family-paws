import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { initializeApp, deleteApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { workspaceStore } from '../apps/api/src/workspace.ts';
import { firestoreStore } from '../apps/api/src/store.ts';
if (
  process.env.GCLOUD_PROJECT !== 'demo-niu-niu' ||
  process.env.FIRESTORE_EMULATOR_HOST !== '127.0.0.1:8085'
)
  throw Error('Isolated demo Firestore emulator required');
test('scoped pages preserve ordering, survive deleted anchors and reject reused statement filters', async (t) => {
  const app = initializeApp({ projectId: 'demo-niu-niu' }, 'pagination-' + randomUUID());
  const db = getFirestore(app, 'pagination-' + randomUUID());
  t.after(() => deleteApp(app));
  const cid = randomUUID(),
    pid = randomUUID(),
    uid = randomUUID(),
    other = randomUUID();
  const now = '2026-11-18T12:00:00.000Z';
  const batch = db.batch();
  batch.set(db.doc('customers/' + cid), {
    id: cid,
    name: 'Owner',
    ownerUid: uid,
    version: 1,
    createdAt: now,
    updatedAt: now,
  });
  batch.set(db.doc('people/' + uid), { customerId: cid });
  batch.set(db.doc(`customers/${cid}/pets/${pid}`), {
    id: pid,
    customerId: cid,
    name: 'Pet',
    version: 1,
    createdAt: now,
    updatedAt: now,
  });
  for (let i = 0; i < 56; i++) {
    const id = randomUUID(),
      at = new Date(Date.parse(now) + i * 1000).toISOString();
    batch.set(db.doc('balanceOperations/' + id), {
      customerId: cid,
      petId: pid,
      at,
      kind: i % 2 ? 'added' : 'terms',
    });
    batch.set(db.doc(`customers/${cid}/pets/${pid}/balances/boarding/events/${id}`), {
      id,
      customerId: cid,
      petId: pid,
      at,
      version: i + 1,
      delta: 1,
      daysAfter: i + 1,
      validFrom: '2026-01-01',
      validThrough: '2027-12-31',
      reason: 'Test',
      actor: other,
    });
  }
  await batch.commit();
  const store = workspaceStore(db),
    identity = { uid, google: true, email_verified: true },
    query = { pageSize: '25', customerId: cid };
  const first = await store.events(identity, query);
  assert.equal(first.items.length, 25);
  assert.ok(first.nextCursor);
  assert.equal(JSON.stringify(first.items).includes(other), false);
  const anchor = first.items.at(-1).event.id;
  await db.doc('balanceOperations/' + anchor).delete();
  const second = await store.events(identity, { ...query, cursor: first.nextCursor });
  assert.equal(second.items.length, 25);
  assert.equal(
    second.items.some((row) => first.items.some((previous) => previous.event.id === row.event.id)),
    false,
  );
  const last = await store.events(identity, { ...query, cursor: second.nextCursor });
  assert.equal(last.items.length, 6);
  assert.equal(last.nextCursor, null);
  for (const changed of [{ kind: 'added' }, { petId: pid }, { from: now }])
    await assert.rejects(
      store.events(identity, { ...query, ...changed, cursor: first.nextCursor }),
    );
  await assert.rejects(
    store.events({ uid: other, admin: true }, { ...query, cursor: first.nextCursor }),
  );
  await assert.rejects(store.events(identity, { ...query, cursor: 'invalid' }));
  const filtered = await store.events(identity, { ...query, kind: 'added', pageSize: '50' });
  assert.equal(filtered.items.length, 27);
  assert.equal(filtered.nextCursor, null);
  const customers = firestoreStore(db);
  const bulk = db.batch();
  for (let i = 0; i < 55; i++) {
    const id = randomUUID();
    bulk.set(db.doc('customers/' + id), {
      id,
      name: 'Search ' + i,
      searchKeys: ['search'],
      version: 1,
      createdAt: now,
      updatedAt: now,
    });
  }
  await bulk.commit();
  const page = await customers.list(undefined, 'search', '25');
  assert.equal(page.items.length, 25);
  const next = await customers.list(page.nextCursor, 'search', '50');
  assert.equal(next.items.length, 30);
  assert.equal(next.nextCursor, null);
});
