import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { initializeApp, deleteApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { buildApp } from '../apps/api/src/app.ts';
import { firebaseIdentity } from '../apps/api/src/authentication.ts';
import { firestoreStore } from '../apps/api/src/store.ts';
import { petStore } from '../apps/api/src/pets.ts';
import { houseStore } from '../apps/api/src/houses.ts';
import { roomStore } from '../apps/api/src/rooms.ts';
import { balanceStore } from '../apps/api/src/balances.ts';
import { bookingStore } from '../apps/api/src/bookings.ts';
if (
  process.env.GCLOUD_PROJECT !== 'demo-niu-niu' ||
  process.env.FIRESTORE_EMULATOR_HOST !== '127.0.0.1:8085' ||
  process.env.FIREBASE_AUTH_EMULATOR_HOST !== '127.0.0.1:9099'
)
  throw Error('Isolated demo Auth/Firestore emulators required');
async function googleIdentity() {
  const name = randomUUID();
  const jwt =
    [
      { alg: 'none', typ: 'JWT' },
      {
        iss: 'https://accounts.google.com',
        aud: 'demo-test',
        sub: name,
        email: name + '@example.test',
        email_verified: true,
        name: '[TEST] Identity',
      },
    ]
      .map((v) => Buffer.from(JSON.stringify(v)).toString('base64url'))
      .join('.') + '.';
  const login = async () => {
    const response = await fetch(
      'http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithIdp?key=demo-key',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          postBody: new URLSearchParams({ id_token: jwt, providerId: 'google.com' }).toString(),
          requestUri: 'http://localhost',
          returnSecureToken: true,
        }),
      },
    );
    assert.equal(response.status, 200);
    return response.json();
  };
  return { login, ...(await login()) };
}
test('real authenticated HTTP workflows persist and enforce current admin roles and customer ownership', async (t) => {
  const app = initializeApp({ projectId: 'demo-niu-niu' }, 'http-' + randomUUID());
  const db = getFirestore(app, 'integration-' + randomUUID());
  const auth = getAuth(app);
  const admin = await googleIdentity(),
    owner = await googleIdentity(),
    stranger = await googleIdentity();

  await auth.setCustomUserClaims(admin.localId, { admin: true });
  const adminLogin = await admin.login();
  const api = buildApp({
    verify: firebaseIdentity(auth),
    store: firestoreStore(db),
    pets: petStore(db, { put: async () => {}, get: async () => Buffer.from('') }),
    houses: houseStore(db),
    rooms: roomStore(db),
    balances: balanceStore(db),
    bookings: bookingStore(db),
  });
  t.after(async () => {
    await api.close();
    try {
      await Promise.all([admin, owner, stranger].map((user) => auth.deleteUser(user.localId)));
    } finally {
      await deleteApp(app);
    }
  });
  const address = await api.listen({ host: 'localhost', port: 0 });
  const call = async (token, path, body, method = body ? 'PUT' : 'GET') => {
    const response = await fetch(address + '/api' + path, {
      method,
      headers: {
        Authorization: 'Bearer ' + token,
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    return {
      status: response.status,
      body: response.status === 204 ? null : await response.json(),
    };
  };
  const adm = (path, body, method) => call(adminLogin.idToken, path, body, method);
  const own = (path, body, method) => call(owner.idToken, path, body, method);
  const registered = await own('/profile', {
    name: '[TEST] Real owner',
    language: 'en',
    version: 0,
  });
  assert.equal(registered.status, 200);
  const cid = registered.body.id,
    pid = randomUUID(),
    otherCid = randomUUID(),
    otherPid = randomUUID();
  assert.equal(
    (
      await adm('/customers/' + otherCid, {
        name: '[TEST] Other owner',
        email: '',
        phone: '',
        language: 'zh',
        version: 0,
      })
    ).status,
    200,
  );
  assert.equal(
    (
      await own(`/customers/${cid}/pets/${pid}`, {
        name: '[TEST] Own pet',
        species: 'dog',
        weightKg: 12.5,
        version: 0,
      })
    ).status,
    200,
  );
  assert.equal(
    (
      await adm(`/customers/${otherCid}/pets/${otherPid}`, {
        name: '[TEST] Private pet',
        species: 'dog',
        weightKg: 8,
        version: 0,
      })
    ).status,
    200,
  );
  assert.equal((await own(`/customers/${otherCid}/pets`)).status, 403);
  assert.equal((await own('/customers')).status, 403);
  assert.equal(
    (
      await adm('/customers/' + cid, {
        name: '[TEST] Admin correction',
        email: '',
        phone: '',
        language: 'en',
        version: registered.body.version,
      })
    ).status,
    200,
  );
  assert.equal((await own('/profile')).body.name, '[TEST] Admin correction');
  const hid = randomUUID(),
    rid = randomUUID(),
    r2 = randomUUID();
  assert.equal(
    (
      await adm('/houses/' + hid, {
        name: '[TEST] HTTP house',
        address: '[TEST] Isolated address',
        timezone: 'America/Los_Angeles',
        version: 0,
      })
    ).status,
    200,
  );
  for (const id of [rid, r2])
    assert.equal(
      (
        await adm(`/houses/${hid}/rooms/${id}`, {
          name: '[TEST] HTTP room',
          capacity: 1,
          costs: { dog: 1 },
          version: 0,
        })
      ).status,
      200,
    );
  const balancePath = `/customers/${cid}/pets/${pid}/balance`;
  const adjustment = {
    operationId: randomUUID(),
    version: 0,
    delta: 30,
    validFrom: '2026-01-01',
    validThrough: '2031-12-31',
    reason: '[TEST] Reviewed manual credit',
  };
  assert.equal((await adm(balancePath, adjustment)).status, 200);
  assert.equal((await adm(balancePath, adjustment)).body.days, 30);
  assert.equal((await own(balancePath)).body.account.days, 30);
  assert.equal((await call(stranger.idToken, balancePath)).status, 403);
  assert.equal(
    (await own(balancePath, { ...adjustment, operationId: randomUUID(), version: 1 })).status,
    403,
  );
  const bid = randomUUID();
  const booking = {
    operationId: randomUUID(),
    version: 0,
    customerId: cid,
    petId: pid,
    houseId: hid,
    roomId: rid,
    arrival: '2030-01-01T10:00:00.000Z',
    pickup: '2030-01-03T10:00:00.000Z',
  };
  assert.equal((await own('/bookings/' + bid, booking)).body.code, 'booking_policy_unconfigured');
  const saved = await adm('/bookings/' + bid, booking);
  assert.equal(saved.status, 200);
  assert.equal(saved.body.billingStatus, 'unbilled');
  assert.equal((await adm('/bookings/' + bid, booking)).body.version, 1);
  const edit = {
    ...booking,
    operationId: randomUUID(),
    version: 1,
    pickup: '2030-01-04T10:00:00.000Z',
  };
  assert.equal((await adm('/bookings/' + bid, edit)).body.version, 2);
  assert.equal((await adm('/bookings/' + bid, { ...edit, operationId: randomUUID() })).status, 409);
  assert.equal(
    (
      await adm('/bookings/' + randomUUID(), {
        ...booking,
        operationId: randomUUID(),
        customerId: otherCid,
        petId: otherPid,
        roomId: r2,
      })
    ).status,
    200,
  );
  const ownList = await own('/bookings');
  assert.deepEqual(
    ownList.body.items.map((b) => b.petId),
    [pid],
  );
  assert.equal((await own('/bookings?customerId=' + otherCid)).status, 403);
  const available = await own(
    '/availability',
    { customerId: cid, petId: pid, arrival: booking.arrival, pickup: booking.pickup },
    'POST',
  );
  assert.equal(available.status, 200);
  assert.equal(JSON.stringify(available.body).includes('Private pet'), false);
  assert.equal((await own(balancePath)).body.account.days, 30);
  await auth.setCustomUserClaims(admin.localId, {});
  assert.equal((await adm('/customers')).status, 403); // Old token still says admin; server reads the current role.
  await auth.updateUser(owner.localId, { disabled: true });
  assert.equal((await own('/bookings')).status, 401);
});
