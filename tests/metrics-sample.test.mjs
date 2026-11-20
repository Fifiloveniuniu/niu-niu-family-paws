import test from 'node:test';
import assert from 'node:assert/strict';
import { sampleMetrics } from '../apps/web/src/metrics-sample.ts';
test('sample dashboard uses coherent dated totals without changing values when the range changes', () => {
  const now = Date.parse('2026-11-19T20:00:00Z');
  const full = sampleMetrics('2026-10-21T00:00:00.000Z', '2026-11-20T00:00:00.000Z', 'UTC', now);
  const short = sampleMetrics('2026-11-13T00:00:00.000Z', '2026-11-20T00:00:00.000Z', 'UTC', now);
  assert(full.series.length <= 12);
  assert.equal(
    full.scheduledArrivals,
    full.series.reduce((n, p) => n + p.bookings, 0),
  );
  assert.equal(
    full.actualArrivals,
    full.serviceUsage.reduce((n, p) => n + p.stays, 0),
  );
  assert(full.serviceUsage.every((p) => p.stays > 0));
  assert(full.actualArrivals <= full.scheduledArrivals);
  assert(full.actualPickups <= full.scheduledPickups);
  assert(full.series.every((p) => p.revenueCents >= 0 && Number.isSafeInteger(p.revenueCents)));
  assert(full.series.reduce((n, p) => n + p.newCustomers, 0) <= full.customers);
  assert.equal(full.customers, short.customers);
  assert.equal(full.recordedDays, short.recordedDays);
  const otherZone = sampleMetrics(full.from, full.through, 'Pacific/Kiritimati', now);
  for (const key of ['customers', 'pets', 'recordedDays', 'inCare', 'overdue'])
    assert.equal(
      full[key],
      otherZone[key],
      'Current snapshots must not change with reporting timezone',
    );
  assert.equal(full.scheduledArrivals, otherZone.scheduledArrivals);
  assert.equal(full.actualArrivals, otherZone.actualArrivals);
  assert.deepEqual(full.serviceUsage, otherZone.serviceUsage);
  for (const field of ['revenueCents', 'newCustomers', 'balanceChange'])
    assert.equal(
      full.series.reduce((n, p) => n + p[field], 0),
      otherZone.series.reduce((n, p) => n + p[field], 0),
      'Timezone buckets must not add or lose example events',
    );
  const single = sampleMetrics('2026-11-19T00:00:00.000Z', '2026-11-20T00:00:00.000Z', 'UTC', now);
  assert.deepEqual(single.series[0], short.series.at(-1));
});
test('sample future periods do not manufacture recorded receipts or handoffs', () => {
  const future = sampleMetrics(
    '2026-12-01T00:00:00.000Z',
    '2026-12-08T00:00:00.000Z',
    'UTC',
    Date.parse('2026-11-19T20:00:00Z'),
  );
  assert(future.scheduledArrivals > 0);
  assert.equal(future.actualArrivals, 0);
  assert.equal(future.actualPickups, 0);
  assert(
    future.series.every(
      (p) => p.revenueCents === 0 && p.balanceChange === 0 && p.newCustomers === 0,
    ),
  );
});
