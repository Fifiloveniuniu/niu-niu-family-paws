import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { initializeApp, deleteApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { operationsStore } from '../apps/api/src/operations.ts';
import { bookingStore } from '../apps/api/src/bookings.ts';
import { petStore } from '../apps/api/src/pets.ts';
if (
  process.env.GCLOUD_PROJECT !== 'demo-niu-niu' ||
  process.env.FIRESTORE_EMULATOR_HOST !== '127.0.0.1:8085'
)
  throw Error('Isolated demo Firestore required');
test('employee house scope protects handoffs, corrections, weights and photos through revocation', async (t) => {
  const app = initializeApp({ projectId: 'demo-niu-niu' }, 'operations-' + randomUUID());
  t.after(() => deleteApp(app));
  const db = getFirestore(app, 'integration-operations-' + randomUUID());
  const cid = randomUUID(),
    pid = randomUUID(),
    hid = randomUUID(),
    rid = randomUUID(),
    bid = randomUUID(),
    otherHouse = randomUUID(),
    otherBooking = randomUUID(),
    otherPet = randomUUID();
  const now = Date.now(),
    at = new Date(now).toISOString(),
    admin = { uid: 'admin', admin: true },
    employee = { uid: 'employee', employee: true, google: true };
  await db.doc('customers/' + cid).set({
    id: cid,
    name: '[TEST] Family',
    email: '',
    phone: '',
    language: 'en',
    version: 1,
    createdAt: at,
    updatedAt: at,
  });
  await db.doc(`customers/${cid}/pets/${pid}`).set({
    id: pid,
    customerId: cid,
    name: '[TEST] Dog',
    species: 'dog',
    weightKg: 10,
    version: 1,
    photo: 'photo',
    createdAt: at,
    updatedAt: at,
  });
  await db.doc('houses/' + hid).set({
    id: hid,
    name: '[TEST] Assigned',
    address: '[TEST] Address',
    timezone: 'America/Los_Angeles',
    version: 1,
  });
  await db.doc('houses/' + otherHouse).set({
    id: otherHouse,
    name: '[TEST] Private',
    address: '[TEST] Address',
    timezone: 'America/Los_Angeles',
    version: 1,
  });
  await db.doc(`houses/${hid}/rooms/${rid}`).set({
    id: rid,
    houseId: hid,
    name: '[TEST] Room',
    capacity: 2,
    costs: { dog: 1 },
    version: 1,
  });
  await db.doc('employeeAssignments/employee').set({ houseIds: [hid], version: 1 });
  const bookings = bookingStore(db),
    ops = operationsStore(db),
    pets = petStore(db, { get: async () => Buffer.from('photo'), put: async () => {} });
  const planned = await bookings.save(admin, bid, {
    operationId: randomUUID(),
    version: 0,
    customerId: cid,
    petId: pid,
    houseId: hid,
    roomId: rid,
    arrival: new Date(now - 7200000).toISOString(),
    pickup: new Date(now + 7200000).toISOString(),
  });
  await db
    .doc('bookings/' + otherBooking)
    .set({ ...planned, id: otherBooking, petId: otherPet, houseId: otherHouse });
  assert.deepEqual(
    (await ops.houses(employee)).items.map((item) => item.id),
    [hid],
  );
  assert.equal(
    (
      await ops.list(employee, {
        houseId: hid,
        from: new Date(now - 86400000).toISOString(),
        through: new Date(now + 86400000).toISOString(),
      })
    ).items.length,
    1,
  );
  await assert.rejects(() =>
    ops.list(employee, {
      houseId: otherHouse,
      from: new Date(now - 86400000).toISOString(),
      through: new Date(now + 86400000).toISOString(),
    }),
  );
  await assert.rejects(() => bookings.get(employee, otherBooking));
  await assert.rejects(() =>
    bookings.action(employee, bid, { operationId: randomUUID(), version: 1, action: 'cancel', at }),
  );
  const arrivalInput = {
    operationId: randomUUID(),
    version: 1,
    action: 'check_in',
    at: new Date(now - 3600000).toISOString(),
  };
  const arrived = await bookings.action(employee, bid, arrivalInput);
  assert.deepEqual(await bookings.action(employee, bid, arrivalInput), arrived);
  assert.equal((await pets.photo(employee, cid, pid)).toString(), 'photo');
  const weightInput = { version: 1, operationId: randomUUID(), weightKg: 12.25 };
  const verified = await ops.verifyWeight(employee, bid, weightInput);
  assert.equal(verified.weightKg, 12.25);
  assert.deepEqual(await ops.verifyWeight(employee, bid, weightInput), verified);
  const weightHistory = (await db.doc(`customers/${cid}/pets/${pid}/history/2`).get()).data();
  assert.equal(weightHistory.actor, 'employee');
  assert.equal(weightHistory.before.weightKg, 10);
  assert.equal(weightHistory.after.weightKg, 12.25);
  const correction = {
    version: arrived.version,
    operationId: randomUUID(),
    actualArrival: new Date(now - 5400000).toISOString(),
    actualPickup: null,
  };
  const corrected = await ops.correct(employee, bid, correction);
  assert.equal(corrected.arrival, planned.arrival);
  assert.equal(corrected.actualArrival, correction.actualArrival);
  assert.deepEqual(await ops.correct(employee, bid, correction), corrected);
  const handoffHistory = (
    await db.doc(`bookings/${bid}/history/${corrected.version}`).get()
  ).data();
  assert.equal(handoffHistory.actor, 'employee');
  assert.equal(handoffHistory.before.actualArrival, arrived.actualArrival);
  await assert.rejects(() =>
    ops.correct(employee, otherBooking, { ...correction, operationId: randomUUID() }),
  );
  await db.doc('employeeAssignments/employee').set({ houseIds: [], version: 2 });
  await assert.rejects(() => bookings.action(employee, bid, arrivalInput));
  await assert.rejects(() => ops.correct(employee, bid, correction));
  await assert.rejects(() => ops.verifyWeight(employee, bid, weightInput));
  await assert.rejects(() => pets.photo(employee, cid, pid));
  assert.equal((await ops.houses(employee)).items.length, 0);
});
