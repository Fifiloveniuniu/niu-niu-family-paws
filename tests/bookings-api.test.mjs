import test from 'node:test';
import assert from 'node:assert/strict';
import { buildApp } from '../apps/api/src/app.ts';
import { BookingConflict, BookingPolicyMissing, timestamp } from '../apps/api/src/bookings.ts';
import { PetInvalid } from '../apps/api/src/pets.ts';
const id = '10000000-0000-4000-8000-000000000001';
const input = {
  operationId: id,
  version: 0,
  customerId: id,
  petId: id,
  houseId: id,
  roomId: id,
  arrival: '2030-01-01T10:00:00.000Z',
  pickup: '2030-01-03T10:00:00.000Z',
};
test('booking transport rejects injected fields, unauthenticated calls and unverified admins', async (t) => {
  let calls = 0;
  const app = buildApp({
    verify: async (token) => ({
      uid: token,
      admin: token === 'admin' || token === 'unverified',
      google: true,
      email_verified: token !== 'unverified',
    }),
    store: {},
    bookings: {
      list: async () => ({ items: [], nextCursor: null }),
      availability: async () => ({ rooms: [] }),
      save: async (identity, ...args) => {
        calls++;
        if (identity.admin !== true) throw new BookingPolicyMissing();
        throw new BookingConflict('capacity');
      },
      action: async () => {
        throw Object.assign(new Error('Contention'), { code: 10 });
      },
    },
  });
  t.after(() => app.close());
  const url = '/api/bookings/' + id;
  assert.equal((await app.inject({ method: 'PUT', url, payload: input })).statusCode, 401);
  assert.equal(
    (
      await app.inject({
        method: 'PUT',
        url,
        payload: input,
        headers: { authorization: 'Bearer unverified' },
      })
    ).statusCode,
    403,
  );
  const put = (payload) =>
    app.inject({ method: 'PUT', url, payload, headers: { authorization: 'Bearer admin' } });
  for (const payload of [
    { ...input, actor: 'forged' },
    { ...input, status: 'completed' },
    { ...input, billingStatus: 'paid' },
    { ...input, units: 0 },
    { ...input, version: -1 },
    { ...input, petId: 'not-an-id' },
  ])
    assert.equal((await put(payload)).statusCode, 400);
  assert.equal(calls, 0);
  const conflict = await put(input);
  assert.equal(conflict.statusCode, 409);
  assert.deepEqual(conflict.json(), { code: 'booking_conflict', issue: 'capacity' });
  const blocked = await app.inject({
    method: 'PUT',
    url,
    payload: input,
    headers: { authorization: 'Bearer customer' },
  });
  assert.equal(blocked.statusCode, 409);
  assert.equal(blocked.json().code, 'booking_policy_unconfigured');
  const contention = await app.inject({
    method: 'POST',
    url: url + '/actions',
    headers: { authorization: 'Bearer admin' },
    payload: { operationId: id, version: 1, action: 'cancel', at: '2026-11-18T10:00:00.000Z' },
  });
  assert.equal(contention.statusCode, 409);
  assert.equal(contention.json().code, 'conflict');
});
test('booking timestamps accept explicit UTC instants and reject normalized or ambiguous local dates', () => {
  assert.equal(timestamp('2028-02-29T10:30:00Z'), '2028-02-29T10:30:00.000Z');
  for (const value of [
    '2027-02-29T10:30:00Z',
    '2030-01-01T24:00:00Z',
    '2030-01-01T10:00:00-08:00',
    '2030-01-01T10:00',
    '0000-01-01T00:00:00Z',
  ])
    assert.throws(() => timestamp(value), PetInvalid);
});
