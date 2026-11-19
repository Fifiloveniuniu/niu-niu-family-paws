import test from 'node:test';
import assert from 'node:assert/strict';
import { buildApp } from '../apps/api/src/app.ts';

test('identity roles use current verified authorization and cannot be selected by callers', async (t) => {
  let employee = true;
  const app = buildApp({
    verify: async () => ({
      uid: 'actual-admin',
      admin: true,
      employee,
      google: true,
      email_verified: true,
    }),
    store: {},
  });
  t.after(() => app.close());
  const headers = { authorization: 'Bearer test' };
  assert.equal((await app.inject({ url: '/api/identity' })).statusCode, 401);
  let response = await app.inject({ url: '/api/identity', headers });
  assert.deepEqual(response.json(), {
    uid: 'actual-admin',
    roles: ['admin', 'employee', 'customer'],
  });
  assert.equal(response.headers['cache-control'], 'private, no-store');
  employee = false;
  response = await app.inject({ url: '/api/identity', headers });
  assert.deepEqual(response.json().roles, ['admin', 'customer']);
  assert.equal(
    (await app.inject({ url: '/api/identity?asCustomer=other', headers })).statusCode,
    400,
  );
  assert.equal(
    (
      await app.inject({
        method: 'PUT',
        url: '/api/identity',
        headers,
        payload: { roles: ['admin'] },
      })
    ).statusCode,
    404,
  );
});
