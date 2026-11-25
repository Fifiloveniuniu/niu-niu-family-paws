import test from 'node:test';
import assert from 'node:assert/strict';
import data from '../packages/pricing/reference-holidays.json' with { type: 'json' };
import { buildApp } from '../apps/api/src/app.ts';
test('reference catalogs group verified festival dates by country without substituting weekdays', () => {
  for (const catalog of data.catalogs) {
    assert.deepEqual(
      catalog.groups.map((g) => g.country),
      ['US', 'CN', 'IN'],
    );
    for (const group of catalog.groups) {
      assert.ok(group.sources.every((url) => url.startsWith('https://')));
      for (const entry of group.entries)
        assert.match(entry.date, new RegExp('^' + catalog.year + '-\\d{2}-\\d{2}$'));
    }
  }
  const dates = (year, country) =>
    Object.fromEntries(
      data.catalogs
        .find((c) => c.year === year)
        .groups.find((g) => g.country === country)
        .entries.map((e) => [e.key, e.date]),
    );
  assert.equal(dates(2026, 'CN').springFestival, '2026-02-17');
  assert.equal(dates(2026, 'CN').dragonBoat, '2026-06-19');
  assert.equal(dates(2026, 'CN').midAutumn, '2026-09-25');
  assert.equal(dates(2027, 'IN').holi, '2027-03-23');
  assert.equal(dates(2027, 'IN').dussehra, '2027-10-09');
  assert.equal(dates(2027, 'IN').diwali, '2027-10-29');
  assert.equal(dates(2026, 'US').independence, '2026-07-04');
  assert.equal(
    data.catalogs.find((c) => c.year === 2028).groups.find((g) => g.country === 'IN').complete,
    false,
  );
});
test('public holiday reference reads require a bounded explicit year and never write pricing settings', async (t) => {
  let calls = 0;
  const app = buildApp({
    verify: async () => ({ uid: 'unused' }),
    store: {},
    holidayCatalog: {
      read: async (year) => {
        calls++;
        return { year, groups: [], years: [], available: false };
      },
    },
  });
  t.after(() => app.close());
  assert.equal(
    (await app.inject({ url: '/api/public/holiday-presets?year=2026' })).json().year,
    2026,
  );
  for (const query of ['', '?year=26', '?year=2026&apply=true'])
    assert.equal(
      (await app.inject({ url: '/api/public/holiday-presets' + query })).statusCode,
      400,
    );
  assert.equal(calls, 1);
});
