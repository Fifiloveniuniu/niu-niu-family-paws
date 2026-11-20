import test from 'node:test';
import assert from 'node:assert/strict';
import { estimateBoarding } from '../packages/pricing/estimate.ts';
import { initialPricing } from '../apps/api/src/pricing.ts';
test('display estimates itemize inclusive calendar dates and charge holiday uplift only on configured dates', () => {
  const config = initialPricing();
  config.holidays = ['2030-01-02'];
  const quote = estimateBoarding(config, 'dog', 2, '2030-01-01', '2030-01-03');
  assert.equal(quote.days, 3);
  assert.equal(quote.normalDays, 2);
  assert.equal(quote.holidayDays, 1);
  assert.equal(quote.normalCents, 10000);
  assert.equal(quote.holidayCents, 5000);
  assert.equal(quote.surchargeCents, 1000);
  assert.equal(quote.totalCents, 16000);
  assert.equal(estimateBoarding(config, 'dog', 2, '2030-01-02', '2030-01-02').totalCents, 6000);
  assert.equal(estimateBoarding(config, 'dog', 2, '2030-01-01', '2030-01-02').days, 2);
  assert.equal(estimateBoarding(config, 'cat', 2, '2030-01-01', '2030-01-02').totalCents, null);
  assert.equal(estimateBoarding(config, 'dog', null, '2030-01-01', '2030-01-02').totalCents, null);
  for (const dates of [
    ['invalid', '2030-01-01'],
    ['2030-02-30', '2030-03-01'],
    ['2030-01-02', '2030-01-01'],
    ['2030-01-01', '2032-01-01'],
  ])
    assert.equal(estimateBoarding(config, 'dog', 2, ...dates), null);
});
