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
    batch.set(db.doc('customers/c' + i), {
      name: '[TEST] Customer',
      createdAt: '2030-11-01T00:00:00.000Z',
    });
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
      species: ['dog', 'cat', 'rabbit'][i % 3],
      arrival: at(arrival),
      pickup: at(pickup),
      actualArrival: actualArrival && at(actualArrival),
      actualPickup: actualPickup && at(actualPickup),
    }),
  );
  batch.set(db.doc('balanceOperations/initial'), {
    at: at('2030-11-02'),
    before: null,
    after: { days: 5 },
  });
  batch.set(db.doc('balanceOperations/correction'), {
    at: at('2030-11-08'),
    before: { days: 5 },
    after: { days: 2 },
  });
  batch.set(db.doc('balanceOperations/terms'), {
    at: at('2030-11-09'),
    before: { days: 2 },
    after: { days: 2 },
  });
  batch.set(db.doc('balanceOperations/outside'), {
    at: at('2030-12-01'),
    before: { days: 2 },
    after: { days: 100 },
  });
  await batch.commit();
  const store = businessMetricsStore(db, () => Date.parse(at('2030-11-15')));
  const { series, serviceUsage, revenueAvailable, ...summary } = await store.read({
    from: at('2030-11-01'),
    through: at('2030-12-01'),
  });
  assert.equal(revenueAvailable, false);
  assert(series.length <= 12);
  assert.equal(
    series.reduce((n, p) => n + p.bookings, 0),
    3,
  );
  assert.equal(
    series.reduce((n, p) => n + p.newCustomers, 0),
    110,
  );
  assert.equal(
    series.reduce((n, p) => n + p.balanceChange, 0),
    2,
  );
  assert(series.every((p) => p.revenueCents === null));
  assert.deepEqual(serviceUsage, [
    { species: 'dog', stays: 0 },
    { species: 'cat', stays: 1 },
    { species: 'rabbit', stays: 2 },
  ]);
  assert.deepEqual(summary, {
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
