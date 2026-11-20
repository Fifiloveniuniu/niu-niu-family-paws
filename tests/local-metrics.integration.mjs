import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { initializeApp, deleteApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { businessMetricsStore } from '../apps/api/src/business-metrics.ts';
import { shiftDay } from '../packages/time/wall-time.ts';
if (
  process.env.GCLOUD_PROJECT !== 'demo-niu-niu' ||
  process.env.FIRESTORE_EMULATOR_HOST !== '127.0.0.1:8085' ||
  process.env.FIREBASE_AUTH_EMULATOR_HOST !== '127.0.0.1:9099'
)
  throw Error('Isolated demo emulators required');

test('persisted demo metrics use real aggregates, retain edited records and seed without duplicates', async (t) => {
  const app = initializeApp({ projectId: 'demo-niu-niu' }, 'metrics-fixtures-' + randomUUID());
  const database = 'integration-metrics-fixtures-' + randomUUID(),
    db = getFirestore(app, database);
  t.after(async () => {
    await db.terminate();
    await deleteApp(app);
  });
  await db
    .doc('customers/owner-record')
    .set({ name: 'Preserve this record', createdAt: '2020-01-01T00:00:00.000Z' });
  function seed() {
    const result = spawnSync(process.execPath, ['scripts/seed-local-metrics.mjs'], {
      cwd: new URL('..', import.meta.url),
      env: { ...process.env, FAMILY_PAWS_FIXTURE_DATABASE: database },
      encoding: 'utf8',
      timeout: 120000,
    });
    assert.equal(result.status, 0, result.stderr);
    return JSON.parse(result.stdout.trim());
  }
  const first = seed();
  assert.equal(first.customers, 60);
  assert.equal(first.pets, 60);
  assert.ok(first.bookings > 100);
  assert.ok(first.adjustments > 30);
  const customer = (
    await db.collection('customers').where('testFixture', '==', true).limit(1).get()
  ).docs[0];
  await customer.ref.update({ name: 'Owner edited demo name' });
  assert.deepEqual(seed(), {
    customers: 0,
    pets: 0,
    bookings: 0,
    adjustments: 0,
    preservedExisting: true,
  });
  assert.equal((await customer.ref.get()).data().name, 'Owner edited demo name');
  assert.equal((await db.doc('customers/owner-record').get()).data().name, 'Preserve this record');
  const today = new Date().toISOString().slice(0, 10);
  const metrics = await businessMetricsStore(db).read({
    from: shiftDay(today, -29) + 'T00:00:00.000Z',
    through: shiftDay(today, 1) + 'T00:00:00.000Z',
    timeZone: 'UTC',
  });
  assert.equal(metrics.customers, 61);
  assert.equal(metrics.pets, 60);
  assert.ok(metrics.scheduledArrivals > 30);
  assert.ok(metrics.actualArrivals > 30);
  assert.equal(
    metrics.series.reduce((n, row) => n + row.bookings, 0),
    metrics.scheduledArrivals,
  );
  assert.equal(
    metrics.serviceUsage.reduce((n, row) => n + row.stays, 0),
    metrics.actualArrivals,
  );
  assert.equal(metrics.revenueAvailable, false);
  assert.ok(metrics.series.every((row) => row.revenueCents === null));
  const future = await businessMetricsStore(db).read({
    from: shiftDay(today, 3) + 'T00:00:00.000Z',
    through: shiftDay(today, 31) + 'T00:00:00.000Z',
    timeZone: 'UTC',
  });
  assert.ok(future.scheduledArrivals > 0);
  assert.equal(future.actualArrivals, 0);
  assert.equal(future.actualPickups, 0);
});
