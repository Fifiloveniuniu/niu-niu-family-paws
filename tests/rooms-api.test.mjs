import test from 'node:test';
import assert from 'node:assert/strict';
import { buildApp } from '../apps/api/src/app.ts';
const hid = '10000000-0000-4000-8000-000000000001',
  id = '10000000-0000-4000-8000-000000000002';
test('room API validates weighted capacities and takes the actor from current admin identity', async (t) => {
  let calls = 0;
  let saved;
  const app = buildApp({
    verify: async (token) => ({ uid: token, admin: token === 'admin', email_verified: true }),
    store: {},
    rooms: {
      list: async () => ({ items: [] }),
      save: async (...args) => {
        calls++;
        saved = args;
        return { id, ...args[2] };
      },
    },
  });
  t.after(() => app.close());
  const input = { name: ' Test ', capacity: 2, costs: { dog: 1 }, version: 0 };
  const put = (body, token = 'admin') =>
    app.inject({
      method: 'PUT',
      url: `/api/houses/${hid}/rooms/${id}`,
      headers: { authorization: 'Bearer ' + token },
      payload: body,
    });
  assert.equal((await put(input, 'customer')).statusCode, 403);
  for (const body of [
    { ...input, name: ' ' },
    { ...input, capacity: 0 },
    { ...input, capacity: -1 },
    { ...input, costs: { dog: 0 } },
    { ...input, costs: { dragon: 1 } },
    { ...input, actor: 'injected' },
    { ...input, houseId: hid },
    { ...input, version: -1 },
  ])
    assert.equal((await put(body)).statusCode, 400);
  assert.equal(calls, 0);
  assert.equal((await put(input)).statusCode, 200);
  assert.equal(saved[0], hid);
  assert.equal(saved[1], id);
  assert.equal(saved[2].name, 'Test');
  assert.equal(saved[3], 'admin');
});
