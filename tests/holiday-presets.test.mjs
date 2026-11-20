import { test } from 'node:test';
import assert from 'node:assert/strict';
import { holidayPresets } from '../apps/web/src/holiday-presets.ts';
test('US holiday presets use calendar dates including floating holidays and leap years', () => {
  const dates = (year) =>
    Object.fromEntries(holidayPresets(year).map(({ key, date }) => [key, date]));
  assert.equal(dates(2026).thanksgiving, '2026-11-26');
  assert.equal(dates(2026).memorial, '2026-05-25');
  assert.equal(dates(2026).independence, '2026-07-04');
  assert.equal(dates(2027).christmas, '2027-12-25');
  assert.equal(dates(2028).labor, '2028-09-04');
  assert.equal(dates(2028).mlk, '2028-01-17');
  assert.equal(new Set(holidayPresets(2028).map((item) => item.date)).size, 11);
});
