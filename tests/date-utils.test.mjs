import test from 'node:test';
import assert from 'node:assert/strict';
import { isValidDateOnly, localDateKey } from '../apps/web/src/date-utils.ts';

test('calendar-date validation rejects normalized and incomplete dates', () => {
  for (const date of [
    '2026-02-29',
    '2026-02-30',
    '2026-13-01',
    '2026-2-01',
    '',
    '2026-01-01T00:00:00Z',
  ]) {
    assert.equal(isValidDateOnly(date), false, date);
  }
  for (const date of ['2024-02-29', '2026-01-01', '2026-12-31'])
    assert.equal(isValidDateOnly(date), true, date);
});

test('statement date keys use the displayed local calendar day', () => {
  const localMidnight = new Date(2026, 10, 1, 0, 0);
  const localLateNight = new Date(2026, 10, 1, 23, 59);
  assert.equal(localDateKey(localMidnight), '2026-11-01');
  assert.equal(localDateKey(localLateNight), '2026-11-01');
});
