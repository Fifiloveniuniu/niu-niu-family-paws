import test from 'node:test';
import assert from 'node:assert/strict';
import { buildApp } from '../apps/api/src/app.ts';
test('workspace reads require verified authentication and accept only explicit bounded scope/cursors', async (t) => {
  let received;
  const app = buildApp({
    verify: async (token) => ({ uid: token, email_verified: token !== 'unverified', google: true }),
    store: {},
    workspace: {
      events: async () => ({ items: [], nextCursor: null }),
      pets: async (...args) => {
        received = args;
        return { admin: false, customer: null, items: [], nextCursor: null };
      },
      locations: async () => ({ items: [] }),
    },
  });
  t.after(() => app.close());
  assert.equal((await app.inject({ url: '/api/workspace/pets' })).statusCode, 401);
  assert.equal(
    (
      await app.inject({
        url: '/api/workspace/locations',
        headers: { authorization: 'Bearer unverified' },
      })
    ).statusCode,
    403,
  );
  for (const query of [
    'customerId=no',
    'cursor=../../other',
    'role=admin',
    'cursor=10000000-0000-4000-8000-000000000001/forged',
  ])
    assert.equal(
      (
        await app.inject({
          url: '/api/workspace/pets?' + query,
          headers: { authorization: 'Bearer owner' },
        })
      ).statusCode,
      400,
    );
  assert.equal(received, undefined);
  const id = '10000000-0000-4000-8000-000000000001';
  const result = await app.inject({
    url: '/api/workspace/pets?customerId=' + id + '&cursor=' + encodeURIComponent(id + '/' + id),
    headers: { authorization: 'Bearer owner' },
  });
  assert.equal(result.statusCode, 200);
  assert.equal(received[0].uid, 'owner');
  assert.equal(received[1], id);
  assert.equal(received[2], id + '/' + id);
});

test('statement filter schema rejects forged actor, unsupported activity and malformed dates', async (t) => {
  let calls = 0;
  const app = buildApp({
    verify: async () => ({ uid: 'owner', email_verified: true, google: true }),
    store: {},
    workspace: {
      events: async () => {
        calls++;
        return { items: [], nextCursor: null };
      },
    },
  });
  t.after(() => app.close());
  for (const query of [
    'actor=other',
    'kind=payment',
    'from=invalid',
    'petId=not-a-pet',
    'cursor=invalid',
  ])
    assert.equal(
      (
        await app.inject({
          url: '/api/workspace/events?' + query,
          headers: { authorization: 'Bearer owner' },
        })
      ).statusCode,
      400,
    );
  assert.equal(calls, 0);
});
