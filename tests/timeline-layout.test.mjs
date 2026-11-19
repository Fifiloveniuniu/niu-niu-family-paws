import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  timelineSpan,
  dailyTimelineTicks,
  timelinePosition,
} from '../apps/web/src/timeline-layout.ts';
const from = '2030-01-01T00:00:00Z',
  through = '2030-01-05T00:00:00Z';
const at = (value) => Date.parse(value);
test('timeline clips occupancy that crosses either displayed boundary', () => {
  assert.deepEqual(timelineSpan(at('2029-12-20'), at('2030-01-02'), from, through), {
    left: '0%',
    width: '25%',
  });
  assert.deepEqual(timelineSpan(at('2030-01-04'), at('2030-02-01'), from, through), {
    left: '75%',
    width: '25%',
  });
  assert.deepEqual(timelineSpan(at('2029-12-20'), at('2030-02-01'), from, through), {
    left: '0%',
    width: '100%',
  });
});
test('timeline omits non-overlapping, zero-length and invalid intervals', () => {
  assert.equal(timelineSpan(at('2029-12-20'), at(from), from, through), null);
  assert.equal(timelineSpan(at(through), at('2030-02-01'), from, through), null);
  assert.equal(timelineSpan(at(from), at(from), from, through), null);
  assert.equal(timelineSpan(NaN, at(through), from, through), null);
  assert.equal(timelineSpan(at(from), at(through), through, from), null);
});
test('fall-back week uses actual local midnights including its 25-hour day', () => {
  const first = '2026-10-30T07:00:00Z',
    last = '2026-11-06T08:00:00Z';
  const ticks = dailyTimelineTicks(first, last, 'America/Los_Angeles');
  assert.equal(ticks.length, 7);
  assert.equal(at(ticks[2].at), at('2026-11-01T07:00:00Z'));
  assert.equal(at(ticks[3].at), at('2026-11-02T08:00:00Z'));
  assert.equal(at(ticks[3].at) - at(ticks[2].at), 25 * 3600000);
  assert.notEqual(timelinePosition(at(ticks[3].at), first, last), (3 / 7) * 100);
});
test('spring-forward week includes its 23-hour day and no duplicate dates', () => {
  const ticks = dailyTimelineTicks(
    '2026-03-06T08:00:00Z',
    '2026-03-13T07:00:00Z',
    'America/Los_Angeles',
  );
  assert.equal(ticks.length, 7);
  assert.equal(at(ticks[3].at) - at(ticks[2].at), 23 * 3600000);
  assert.equal(new Set(ticks.map((tick) => tick.key)).size, 7);
  assert.deepEqual(dailyTimelineTicks('invalid', 'invalid', 'America/Los_Angeles'), []);
});
