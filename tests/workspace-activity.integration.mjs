import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { initializeApp, deleteApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { workspaceStore } from '../apps/api/src/workspace.ts';
import { bookingStore } from '../apps/api/src/bookings.ts';
if (
  process.env.GCLOUD_PROJECT !== 'demo-niu-niu' ||
  process.env.FIRESTORE_EMULATOR_HOST !== '127.0.0.1:8085'
)
  throw Error('Demo emulators required');
test('unified activity preserves booking retries, nullable balances, descending cross-source cursors and private room-only occupancy', async (t) => {
  const app = initializeApp({ projectId: 'demo-niu-niu' }, 'activity-' + randomUUID());
  t.after(() => deleteApp(app));
  const db = getFirestore(app, 'integration-activity-' + randomUUID()),
    workspace = workspaceStore(db),
    bookings = bookingStore(db);
  const cid = randomUUID(),
    other = randomUUID(),
    pid = randomUUID(),
    otherPet = randomUUID(),
    uid = randomUUID(),
    stranger = randomUUID(),
    hid = randomUUID(),
    rid = randomUUID();
  const at = '2030-01-01T00:00:00.000Z';
  const batch = db.batch();
  for (const [customerId, petId, ownerUid] of [
    [cid, pid, uid],
    [other, otherPet, stranger],
  ]) {
    batch.set(db.doc('customers/' + customerId), {
      id: customerId,
      name: 'Private customer ' + customerId,
      ownerUid,
      version: 1,
      createdAt: at,
      updatedAt: at,
    });
    batch.set(db.doc('people/' + ownerUid), { customerId });
    batch.set(db.doc(`customers/${customerId}/pets/${petId}`), {
      id: petId,
      customerId,
      name: 'Private pet ' + petId,
      species: 'dog',
      weightKg: 2,
      photo: null,
      version: 1,
      createdAt: at,
      updatedAt: at,
    });
  }
  batch.set(db.doc('houses/' + hid), {
    id: hid,
    name: 'Test house',
    address: 'TEST ONLY',
    timezone: 'America/Los_Angeles',
    version: 1,
    createdAt: at,
    updatedAt: at,
  });
  batch.set(db.doc(`houses/${hid}/rooms/${rid}`), {
    id: rid,
    houseId: hid,
    name: 'Test room',
    capacity: 3,
    costs: { dog: 1 },
    version: 1,
    createdAt: at,
    updatedAt: at,
  });
  await batch.commit();
  const admin = { uid: randomUUID(), admin: true },
    owner = { uid, google: true };
  const bid = randomUUID(),
    input = {
      operationId: randomUUID(),
      version: 0,
      customerId: cid,
      petId: pid,
      houseId: hid,
      roomId: rid,
      arrival: '2030-01-02T10:00:00.000Z',
      pickup: '2030-01-03T10:00:00.000Z',
    };
  const created = await bookings.save(admin, bid, input);
  assert.deepEqual(await bookings.save(admin, bid, input), created);
  const cancel = {
    operationId: randomUUID(),
    version: created.version,
    action: 'cancel',
    at: new Date().toISOString(),
  };
  const cancelled = await bookings.action(admin, bid, cancel);
  assert.deepEqual(await bookings.action(admin, bid, cancel), cancelled);
  const otherBooking = await bookings.save(admin, randomUUID(), {
    ...input,
    operationId: randomUUID(),
    customerId: other,
    petId: otherPet,
  });
  const result = await workspace.events(owner, { customerId: cid, pageSize: '25' });
  assert.equal(result.items.length, 2);
  assert.equal(result.items[0].event.kind, 'cancelled');
  assert.equal(result.items.filter((row) => row.event.bookingId === bid).length, 2);
  assert.ok(
    result.items.every(
      (row) => row.event.daysAfter === null && row.event.delta === 0 && !row.event.actor,
    ),
  );
  assert.equal((await db.collection('balanceOperations').get()).size, 0);
  assert.equal((await workspace.events(owner, { kind: 'booking' })).items.length, 1);
  assert.equal((await workspace.events(owner, { kind: 'cancelled' })).items.length, 1);
  const window = {
    customerId: cid,
    from: '2030-01-01T00:00:00.000Z',
    through: '2030-01-05T00:00:00.000Z',
  };
  const busy = await workspace.busy(owner, window);
  assert.equal(busy.items.length, 1);
  assert.deepEqual(Object.keys(busy.items[0]).sort(), ['from', 'houseId', 'roomId', 'through']);
  for (const secret of [other, otherPet, otherBooking.id, 'Private customer', 'Private pet'])
    assert.equal(JSON.stringify(busy).includes(secret), false);
  await assert.rejects(workspace.busy(owner, { ...window, customerId: other }));
  await assert.rejects(workspace.events(owner, { customerId: other }));
  // Identical operation IDs and timestamps across the two independent stores remain distinct.
  const tieId = randomUUID(),
    tieAt = '2035-01-01T00:00:00.000Z';
  await db
    .doc('balanceOperations/' + tieId)
    .set({ customerId: cid, petId: pid, at: tieAt, kind: 'added' });
  await db.doc(`customers/${cid}/pets/${pid}/balances/boarding/events/${tieId}`).set({
    id: tieId,
    customerId: cid,
    petId: pid,
    at: tieAt,
    version: 1,
    delta: 1,
    daysAfter: 1,
    validFrom: '2030-01-01',
    validThrough: '2039-01-01',
    reason: '',
  });
  await db.doc('bookingOperations/' + tieId).set({ at: tieAt, actor: admin.uid, result: created });
  for (let i = 0; i < 24; i++)
    await db.doc('bookingOperations/' + randomUUID()).set({
      at: new Date(Date.parse(tieAt) + i * 1000 + 1).toISOString(),
      actor: admin.uid,
      result: created,
    });
  const first = await workspace.events(owner, { pageSize: '25' });
  assert.equal(first.items.length, 25);
  assert.equal(first.items.at(-1).event.kind, 'booking');
  const second = await workspace.events(owner, { pageSize: '25', cursor: first.nextCursor });
  assert.equal(second.items[0].event.id, tieId);
  assert.equal(second.items[0].event.daysAfter, 1);
  assert.equal(
    new Set(
      [...first.items, ...second.items].map(
        (row) => row.event.id + ':' + (row.event.kind || 'balance'),
      ),
    ).size,
    28,
  );
  await assert.rejects(
    workspace.events(owner, { pageSize: '25', kind: 'added', cursor: first.nextCursor }),
  );
  const petBookings = await bookings.list(owner, cid, undefined, undefined, {
    petId: pid,
    pageSize: '25',
  });
  assert.equal(petBookings.items.length, 1);
  assert.equal(petBookings.items[0].id, bid);
  await assert.rejects(bookings.list(owner, other, undefined, undefined, { petId: otherPet }));
});
