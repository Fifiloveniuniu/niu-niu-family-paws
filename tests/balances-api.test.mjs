import test from 'node:test';
import assert from 'node:assert/strict';
import { buildApp } from '../apps/api/src/app.ts';
import { validDay } from '../apps/api/src/balances.ts';
const cid = '10000000-0000-4000-8000-000000000001',
  pid = '10000000-0000-4000-8000-000000000002';
test('balance adjustment requires a verified current admin and validates bounded operation input', async (t) => {
  let calls = 0;
  let received;
  const app = buildApp({
    verify: async (token) => ({
      uid: token,
      admin: token === 'admin' || token === 'unverified',
      email_verified: token !== 'unverified',
    }),
    store: {},
    balances: {
      read: async () => ({ account: null, events: [], nextCursor: null }),
      adjust: async (...args) => {
        calls++;
        received = args;
        return {};
      },
    },
  });
  t.after(() => app.close());
  const path = `/api/customers/${cid}/pets/${pid}/balance`;
  const input = {
    operationId: '10000000-0000-4000-8000-000000000003',
    version: 0,
    delta: 30,
    validFrom: '2028-02-29',
    validThrough: '2028-05-28',
    reason: ' Reviewed ',
  };
  const put = (body, token = 'admin') =>
    app.inject({
      method: 'PUT',
      url: path,
      headers: { authorization: 'Bearer ' + token },
      payload: body,
    });
  for (const token of ['customer', 'employee', 'unverified'])
    assert.equal((await put(input, token)).statusCode, 403);
  for (const body of [
    { ...input, delta: 0.5 },
    { ...input, delta: 1000001 },
    { ...input, version: -1 },
    { ...input, operationId: 'no' },
    { ...input, actor: 'forged' },
    { ...input, service: 'daycare' },
    { ...input, reason: 'x'.repeat(1001) },
  ])
    assert.equal((await put(body)).statusCode, 400);
  assert.equal(calls, 0);
  assert.equal((await put(input)).statusCode, 200);
  assert.equal(received[0].uid, 'admin');
  assert.equal(received[1], cid);
  assert.equal(received[2], pid);
  assert.equal(received[3].reason, 'Reviewed');
  assert.equal(
    (
      await app.inject({
        url: path + '?cursor=invalid',
        headers: { authorization: 'Bearer admin' },
      })
    ).statusCode,
    400,
  );
});
test('reviewed balance date ranges reject normalized and zero-year dates', () => {
  for (const value of ['2028-02-29', '2026-11-18', '0001-01-01'])
    assert.equal(validDay(value), true);
  for (const value of ['2027-02-29', '0000-01-01', '2026-13-01', '2026-2-03'])
    assert.equal(validDay(value), false);
});
