import test from 'node:test';
import assert from 'node:assert/strict';
import { buildApp } from '../apps/api/src/app.ts';
import { metricsRange } from '../apps/api/src/business-metrics.ts';
test('business metrics require current administrator access and a bounded explicit range', async (t) => {
  let role = 'admin',
    calls = 0;
  const summary = {
    from: '2030-11-01T00:00:00.000Z',
    through: '2030-12-01T00:00:00.000Z',
    generatedAt: '2030-11-15T00:00:00.000Z',
    customers: 110,
    pets: 330,
    recordedDays: 12,
    inCare: 1,
    overdue: 1,
    scheduledArrivals: 3,
    scheduledPickups: 3,
    actualArrivals: 3,
    actualPickups: 1,
  };
  const app = buildApp({
    store: {},
    verify: async () => ({
      uid: 'actor',
      email_verified: true,
      google: true,
      admin: role === 'admin',
      employee: role === 'employee',
    }),
    businessMetrics: {
      async read(input) {
        calls++;
        assert.deepEqual(input, { from: summary.from, through: summary.through });
        return { ...summary, privateCustomer: 'must not be returned' };
      },
    },
  });
  t.after(() => app.close());
  const path = '/api/business-metrics?from=2030-11-01T00:00:00Z&through=2030-12-01T00:00:00Z',
    headers = { authorization: 'Bearer test' };
  assert.equal((await app.inject({ url: path })).statusCode, 401);
  for (const value of ['customer', 'employee']) {
    role = value;
    assert.equal((await app.inject({ url: path, headers })).statusCode, 403);
  }
  assert.equal(calls, 0);
  role = 'admin';
  const response = await app.inject({ url: path, headers });
  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.json(), summary);
  assert.equal(response.headers['cache-control'], 'private, no-store');
  for (const query of [
    '',
    '?from=invalid&through=2030-12-01T00:00:00Z',
    '?from=2030-12-01T00:00:00Z&through=2030-11-01T00:00:00Z',
    '?from=2030-01-01T00:00:00Z&through=2032-01-01T00:00:00Z',
    path.slice(path.indexOf('?')) + '&asCustomer=other',
  ])
    assert.equal(
      (await app.inject({ url: '/api/business-metrics' + query, headers })).statusCode,
      400,
    );
  assert.equal(calls, 1);
  role = 'customer';
  assert.equal((await app.inject({ url: path, headers })).statusCode, 403);
  assert.throws(() =>
    metricsRange({ from: '2030-02-30T00:00:00Z', through: '2030-03-01T00:00:00Z' }),
  );
});

test('business metrics range accepts a leap year and rejects a longer query', () => {
  assert.doesNotThrow(() =>
    metricsRange({ from: '2028-01-01T00:00:00Z', through: '2029-01-01T00:00:00Z' }),
  );
  assert.throws(() =>
    metricsRange({ from: '2028-01-01T00:00:00Z', through: '2029-01-02T00:00:00Z' }),
  );
});
