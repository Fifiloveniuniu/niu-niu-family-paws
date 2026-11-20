import test from 'node:test';
import assert from 'node:assert/strict';
import { metricIntervals } from '../packages/metrics/intervals.ts';
test('metric intervals cover the complete range with no gaps, double counting or more than 12 buckets', () => {
  for (const [from, through, zone] of [
    ['2026-03-07T08:00:00.000Z', '2026-03-11T07:00:00.000Z', 'America/Los_Angeles'],
    ['2028-01-01T00:00:00.000Z', '2029-01-01T00:00:00.000Z', 'UTC'],
  ]) {
    const buckets = metricIntervals(from, through, zone);
    assert(buckets.length <= 12);
    assert.equal(buckets[0].from, from);
    assert.equal(buckets.at(-1).through, through);
    buckets.forEach((b, i) => {
      assert(b.through > b.from);
      if (i) assert.equal(buckets[i - 1].through, b.from);
    });
  }
  const dst = metricIntervals(
    '2026-03-07T08:00:00.000Z',
    '2026-03-11T07:00:00.000Z',
    'America/Los_Angeles',
  );
  assert.equal(Date.parse(dst[1].through) - Date.parse(dst[1].from), 23 * 3600000);
});
