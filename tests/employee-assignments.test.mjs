import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { buildApp } from '../apps/api/src/app.ts';
test('employee house assignment routes require current admin and reject role injection', async (t) => {
  let calls = 0,
    actor;
  const app = buildApp({
    verify: async (token) => ({
      uid: token,
      admin: token === 'admin',
      employee: true,
      email_verified: true,
    }),
    store: {},
    employeeAssignments: {
      lookup: async (email) => {
        calls++;
        return { email };
      },
      save: async (uid, input, actual) => {
        calls++;
        actor = actual;
        return { uid, ...input };
      },
    },
  });
  t.after(() => app.close());
  const body = { houseIds: [randomUUID()], version: 0, operationId: randomUUID() };
  for (const token of ['employee', 'customer']) {
    const headers = { authorization: 'Bearer ' + token };
    assert.equal(
      (await app.inject({ url: '/api/employee-assignments?email=employee@example.test', headers }))
        .statusCode,
      403,
    );
    assert.equal(
      (
        await app.inject({
          method: 'PUT',
          url: '/api/employee-assignments/target',
          headers,
          payload: body,
        })
      ).statusCode,
      403,
    );
  }
  assert.equal(calls, 0);
  const headers = { authorization: 'Bearer admin' };
  assert.equal(
    (
      await app.inject({
        method: 'PUT',
        url: '/api/employee-assignments/target',
        headers,
        payload: { ...body, employee: true },
      })
    ).statusCode,
    400,
  );
  assert.equal(
    (
      await app.inject({
        method: 'PUT',
        url: '/api/employee-assignments/target',
        headers,
        payload: body,
      })
    ).statusCode,
    200,
  );
  assert.equal(actor, 'admin');
  assert.equal(
    (
      await app.inject({
        method: 'PUT',
        url: '/api/employee-assignments/target',
        headers,
        payload: { ...body, houseIds: [body.houseIds[0], body.houseIds[0]] },
      })
    ).statusCode,
    400,
  );
});
