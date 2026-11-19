import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { initialPricing, validatePricing } from '../apps/api/src/pricing.ts';
import { boardingRate, packageSavings, moneyCents } from '../packages/pricing/calculations.ts';
import { buildApp } from '../apps/api/src/app.ts';
const write = () => {
  const { updatedAt, ...fields } = initialPricing();
  return { ...fields, operationId: randomUUID() };
};
test('supplied rates honor the higher shared band, exact interpolation, gaps and the discarded row', () => {
  const config = initialPricing();
  assert.equal(boardingRate(config.rates, 'dog', 8).cents, 5200);
  assert.equal(boardingRate(config.rates, 'dog', 11.5).cents, 5500);
  assert.equal(boardingRate(config.rates, 'dog', 15.5), null);
  assert.equal(boardingRate(config.rates, 'dog', 86), null);
  assert.equal(boardingRate(config.rates, 'cat', 8), null);
  assert.equal(
    config.rates.some((rate) => rate.name.includes('Long Hair') && rate.minCents === 9500),
    false,
  );
  assert.equal(
    config.rates.some((rate) => rate.name.includes('Long Hair/') && rate.minCents === 11500),
    true,
  );
  assert.equal(moneyCents('19.99'), 1999);
  assert.equal(moneyCents('1.999'), null);
});
test('fixed package savings retain an explicit species, band and comparison weight', () => {
  const config = initialPricing(),
    band = boardingRate(config.rates, 'dog', 11.5).rate;
  const rate = {
    ...band,
    id: randomUUID(),
    kind: 'package',
    days: 30,
    minWeightLb: null,
    maxWeightLb: null,
    minCents: 150000,
    maxCents: 150000,
    comparisonRateId: band.id,
    comparisonWeightLb: 11.5,
  };
  assert.deepEqual(packageSavings(rate, config.rates), {
    regularCents: 165000,
    savingsCents: 15000,
    percent: 9.09,
  });
  assert.equal(packageSavings({ ...rate, comparisonWeightLb: null }, config.rates), null);
  assert.equal(packageSavings({ ...rate, species: 'cat' }, config.rates), null);
});
test('pricing rejects overlapping bands, invalid dates, duplicate IDs and malformed comparisons', () => {
  const input = write();
  validatePricing(input);
  for (const mutate of [
    (value) => value.holidays.push('2026-02-30'),
    (value) => value.rates.push({ ...value.rates[0] }),
    (value) => {
      value.rates[1].minWeightLb = 7;
    },
    (value) => {
      value.rates[0].nameZh = ' ';
    },
  ]) {
    const value = write();
    mutate(value);
    assert.throws(() => validatePricing(value));
  }
});
test('pricing APIs require current administrator role and ignore client role injection', async (t) => {
  let actor;
  const config = initialPricing();
  const app = buildApp({
    verify: async (token) => ({
      uid: token,
      admin: token === 'admin',
      employee: true,
      email_verified: true,
      google: true,
    }),
    store: {},
    pricing: {
      get: async () => config,
      save: async (input, uid) => {
        actor = uid;
        return { ...input, version: 1 };
      },
    },
  });
  t.after(() => app.close());
  for (const role of ['customer', 'employee'])
    for (const method of ['GET', 'PUT'])
      assert.equal(
        (
          await app.inject({
            method,
            url: '/api/pricing',
            headers: { authorization: 'Bearer ' + role },
            ...(method === 'PUT' ? { payload: write() } : {}),
          })
        ).statusCode,
        403,
      );
  const response = await app.inject({
    method: 'PUT',
    url: '/api/pricing',
    headers: { authorization: 'Bearer admin' },
    payload: write(),
  });
  assert.equal(response.statusCode, 200);
  assert.equal(actor, 'admin');
  assert.equal(
    (
      await app.inject({
        method: 'PUT',
        url: '/api/pricing',
        headers: { authorization: 'Bearer admin' },
        payload: { ...write(), admin: true },
      })
    ).statusCode,
    400,
  );
});

test('archived packages retain their comparison metadata without blocking band archival', () => {
  const input = write(),
    band = input.rates.find((rate) => rate.kind === 'boarding');
  const comparisonWeightLb = (band.minWeightLb + band.maxWeightLb) / 2;
  const archived = {
    ...band,
    id: randomUUID(),
    kind: 'package',
    days: 30,
    minWeightLb: null,
    maxWeightLb: null,
    minCents: 10000,
    maxCents: 10000,
    comparisonRateId: band.id,
    comparisonWeightLb,
    active: false,
  };
  input.rates.push(archived);
  band.active = false;
  assert.doesNotThrow(() => validatePricing(input));
  archived.active = true;
  assert.throws(() => validatePricing(input));
});
