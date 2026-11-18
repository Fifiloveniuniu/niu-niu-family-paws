import test from 'node:test';
import assert from 'node:assert/strict';
import {
  parseWallInput,
  resolveWallTime,
  zonedValue,
  startOfZonedDay,
  shiftDay,
} from '../apps/web/src/wall-time.ts';
test('wall dates reject impossible dates and keep date-only values independent of browser daylight saving', () => {
  assert.equal(parseWallInput('2028-02-29', false).value, '2028-02-29');
  assert.equal(parseWallInput('2027-02-29', false), null);
  assert.equal(parseWallInput('0000-01-01', false), null);
  assert.equal(parseWallInput('0001-01-01', false).value, '0001-01-01');
  assert.equal(parseWallInput('2026-03-08T02:30', true).value, '2026-03-08T02:30');
  assert.equal(shiftDay('2028-02-28', 1), '2028-02-29');
});
test('explicit timezone conversion rejects gaps and returns both fold instants without guessing', () => {
  assert.deepEqual(resolveWallTime('2026-03-08T02:30', 'America/Los_Angeles'), {
    choices: [],
    error: 'gap',
  });
  assert.deepEqual(resolveWallTime('2026-11-01T01:30', 'America/Los_Angeles').choices, [
    '2026-11-01T08:30:00.000Z',
    '2026-11-01T09:30:00.000Z',
  ]);
  assert.deepEqual(resolveWallTime('2026-11-18T10:00', 'Asia/Shanghai').choices, [
    '2026-11-18T02:00:00.000Z',
  ]);
});
test('half-hour transitions, invalid zones and UTC round trips remain explicit', () => {
  const half = resolveWallTime('2026-04-05T01:45', 'Australia/Lord_Howe').choices;
  assert.equal(half.length, 2);
  assert.equal(Date.parse(half[1]) - Date.parse(half[0]), 1800000);
  assert.equal(resolveWallTime('2026-11-18T10:00', 'Invalid/Zone').error, 'zone');
  for (const instant of resolveWallTime('2026-11-01T01:30', 'America/Los_Angeles').choices)
    assert.equal(zonedValue(instant, 'America/Los_Angeles'), '2026-11-01T01:30');
});
test('zoned calendar days handle midnight gaps, folds and skipped dates', () => {
  assert.equal(startOfZonedDay('2026-03-08', 'America/Los_Angeles'), '2026-03-08T08:00:00.000Z');
  assert.equal(
    Date.parse(startOfZonedDay('2026-03-09', 'America/Los_Angeles')) -
      Date.parse(startOfZonedDay('2026-03-08', 'America/Los_Angeles')),
    23 * 3600000,
  );
  assert.equal(
    Date.parse(startOfZonedDay('2026-11-02', 'America/Los_Angeles')) -
      Date.parse(startOfZonedDay('2026-11-01', 'America/Los_Angeles')),
    25 * 3600000,
  );
  assert.equal(startOfZonedDay('2011-12-30', 'Pacific/Apia'), null);
});
