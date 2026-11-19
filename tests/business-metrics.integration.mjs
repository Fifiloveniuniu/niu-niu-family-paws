import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { initializeApp, deleteApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { businessMetricsStore } from '../apps/api/src/business-metrics.ts';
if (
  process.env.GCLOUD_PROJECT !== 'demo-niu-niu' ||
  process.env.FIRESTORE_EMULATOR_HOST !== '127.0.0.1:8085'
)
  throw Error('Isolated demo emulator required');
test('aggregate metrics include every record and respect event dates, cancellation and range boundaries', async (t) => {
  const app = initializeApp({ projectId: 'demo-niu-niu' }, 'metrics-' + randomUUID()),
    db = getFirestore(app, 'metrics-' + randomUUID());
  t.after(async () => {
    await db.terminate();
    await deleteApp(app);
  });
  const batch = db.batch();
  for (let i = 0; i < 110; i++) {
    batch.set(db.doc('customers/c' + i), { name: '[TEST] Customer' });
    batch.set(db.doc('customers/c' + i + '/pets/p'), { name: '[TEST] Pet' });
  }
  for (const [i, service, days] of [
    [0, 'boarding', 5],
    [1, 'boarding', 7],
    [2, 'grooming', 999],
  ])
    batch.set(db.doc(`customers/c${i}/pets/p/balances/${service}`), {
      service,
      days,
      validThrough: '2020-01-01',
    });
  const at = (day) => day + 'T00:00:00.000Z';
  const rows = [
    ['planned', '2030-11-02', '2030-11-03', null, null],
    ['in_care', '2030-10-31', '2030-11-10', '2030-11-01', null],
    ['completed', '2030-11-05', '2030-11-08', '2030-11-05', '2030-11-08'],
    ['cancelled', '2030-11-05', '2030-11-08', null, null],
    ['planned', '2030-12-01', '2030-12-02', null, null],
    ['completed', '2030-11-01', '2030-12-01', '2030-11-01', '2030-12-01'],
  ];
  rows.forEach(([status, arrival, pickup, actualArrival, actualPickup], i) =>
    batch.set(db.doc('bookings/b' + i), {
      status,
      arrival: at(arrival),
      pickup: at(pickup),
      actualArrival: actualArrival && at(actualArrival),
      actualPickup: actualPickup && at(actualPickup),
    }),
  );
  await batch.commit();
  const store = businessMetricsStore(db, () => Date.parse(at('2030-11-15')));
  assert.deepEqual(await store.read({ from: at('2030-11-01'), through: at('2030-12-01') }), {
    from: at('2030-11-01'),
    through: at('2030-12-01'),
    generatedAt: at('2030-11-15'),
    customers: 110,
    pets: 110,
    recordedDays: 12,
    inCare: 1,
    overdue: 1,
    scheduledArrivals: 3,
    scheduledPickups: 3,
    actualArrivals: 3,
    actualPickups: 1,
  });
  const empty = await businessMetricsStore(getFirestore(app, 'metrics-empty-' + randomUUID())).read(
    { from: at('2030-11-01'), through: at('2030-12-01') },
  );
  assert.equal(empty.customers, 0);
  assert.equal(empty.recordedDays, 0);
});
