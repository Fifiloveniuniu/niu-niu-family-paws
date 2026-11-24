import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID, randomBytes } from 'node:crypto';
import { initializeApp, deleteApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { accessManagementStore, accessKey } from '../apps/api/src/access-management.ts';
import { firebaseIdentity } from '../apps/api/src/authentication.ts';
import { employeeAssignmentStore } from '../apps/api/src/employee-assignments.ts';
import { buildApp } from '../apps/api/src/app.ts';
if (
  process.env.GCLOUD_PROJECT !== 'demo-niu-niu' ||
  process.env.FIRESTORE_EMULATOR_HOST !== '127.0.0.1:8085' ||
  process.env.FIREBASE_AUTH_EMULATOR_HOST !== '127.0.0.1:9099'
)
  throw Error('Isolated demo emulators required');
test('real Auth and Firestore access lifecycle, transaction safety and HTTP authorization', async (t) => {
  const app = initializeApp({ projectId: 'demo-niu-niu' }, 'access-' + randomUUID()),
    db = getFirestore(app, 'integration-access-' + randomUUID()),
    auth = getAuth(app),
    ids = [];
  t.after(async () => {
    for (const uid of ids) await auth.deleteUser(uid);
    await deleteApp(app);
  });
  const prefix = 'iam-' + randomUUID().slice(0, 8);
  async function identity(role = {}, email = prefix + '-' + randomUUID() + '@example.test') {
    const sub = randomUUID(),
      jwt =
        [
          { alg: 'none', typ: 'JWT' },
          {
            iss: 'https://accounts.google.com',
            aud: 'demo-test',
            sub,
            email,
            email_verified: true,
            name: prefix + ' ' + email,
          },
        ]
          .map((v) => Buffer.from(JSON.stringify(v)).toString('base64url'))
          .join('.') + '.';
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
    const result = await response.json();
    ids.push(result.localId);
    await auth.setCustomUserClaims(result.localId, role);
    return { uid: result.localId, token: result.idToken, email };
  }
  const a = await identity({ admin: true }),
    b = await identity({ admin: true }),
    employee = await identity({ employee: true }),
    customer = await identity();
  const hid = randomUUID();
  await db.doc('houses/' + hid).set({ id: hid, name: '[TEST] Access house' });
  const scopedAuth = {
    getUser: (uid) => auth.getUser(uid),
    getUserByEmail: (email) => auth.getUserByEmail(email),
    listUsers: async (max, token) => {
      const all = await Promise.all(ids.map((uid) => auth.getUser(uid)));
      const start = Number(token ?? 0);
      return {
        users: all.slice(start, start + max),
        ...(all.length > start + max ? { pageToken: String(start + max) } : {}),
      };
    },
  };
  let now = Date.now();
  const store = accessManagementStore(db, scopedAuth, () => now),
    verify = firebaseIdentity(auth, db);
  const api = buildApp({
    verify,
    accessManagement: store,
    employeeAssignments: employeeAssignmentStore(db, auth),
    store: {},
  });
  t.after(() => api.close());
  const call = (who, method, url, payload) =>
    api.inject({
      method,
      url,
      headers: who ? { authorization: 'Bearer ' + who.token } : {},
      ...(payload ? { payload } : {}),
    });
  const input = (account, changes = {}) => ({
    roles: account.roles,
    houseIds: account.houseIds,
    status: account.status,
    version: account.version,
    assignmentVersion: account.assignmentVersion,
    operationId: randomUUID(),
    reason: '[TEST] reviewed access',
    ...changes,
  });
  await t.test(
    'current verified Google admin required; scopes and caller-selected actor fields rejected',
    async () => {
      assert.equal((await call(null, 'GET', '/api/access/accounts')).statusCode, 401);
      assert.equal((await call(customer, 'GET', '/api/access/accounts')).statusCode, 403);
      assert.equal((await call(employee, 'GET', '/api/access/history')).statusCode, 403);
      assert.equal(
        (await call(a, 'GET', '/api/access/accounts?asCustomer=forged')).statusCode,
        400,
      );
      const target = await store.get(employee.uid);
      assert.equal(
        (
          await call(a, 'PUT', '/api/access/accounts/' + employee.uid, {
            ...input(target),
            actor: 'forged',
          })
        ).statusCode,
        400,
      );
    },
  );
  await t.test(
    'roles and assignments save atomically, audit, replay once and reject stale/concurrent writes',
    async () => {
      const old = await store.get(customer.uid),
        write = input(old, { roles: ['employee', 'customer'], houseIds: [hid] });
      const response = await call(a, 'PUT', '/api/access/accounts/' + customer.uid, write);
      assert.equal(response.statusCode, 200, response.body);
      const saved = response.json();
      assert.deepEqual((await verify(customer.token)).employee, true);
      assert.deepEqual(saved.houseIds, [hid]);
      assert.deepEqual(await store.save(customer.uid, write, a.uid), saved);
      await assert.rejects(() => store.save(customer.uid, write, b.uid));
      await assert.rejects(
        () => store.save(customer.uid, { ...write, operationId: randomUUID() }, a.uid),
        { code: 'stale_access' },
      );
      const history = (await db.doc('accessHistory/' + write.operationId).get()).data();
      assert.equal(history.actorUid, a.uid);
      assert.deepEqual(history.after.houseIds, [hid]);
      const competing = await Promise.allSettled([
        store.save(customer.uid, input(saved, { houseIds: [] }), a.uid),
        store.save(customer.uid, input(saved, { houseIds: [hid] }), a.uid),
      ]);
      assert.equal(competing.filter((x) => x.status === 'fulfilled').length, 1);
      const fresh = await store.get(customer.uid);
      assert.equal(fresh.version, 2);
      const assignment = employeeAssignmentStore(db, auth);
      const found = await assignment.lookup(customer.email);
      assert.equal(found.uid, customer.uid);
      await assignment.save(
        customer.uid,
        { houseIds: [hid], version: found.version, operationId: randomUUID() },
        a.uid,
      );
      await assert.rejects(() => store.save(customer.uid, input(fresh), a.uid), {
        code: 'stale_access',
      });
      const final = await store.get(customer.uid);
      await store.save(customer.uid, input(final, { roles: ['customer'], houseIds: [hid] }), a.uid);
      assert.equal((await verify(customer.token)).employee, false);
      assert.deepEqual(
        (await db.doc('employeeAssignments/' + customer.uid).get()).data().houseIds,
        [],
      );
    },
  );
  await t.test(
    'suspension blocks old tokens immediately; restore preserves records; invalid houses and self lockout fail',
    async () => {
      const value = await store.get(employee.uid);
      await assert.rejects(
        () => store.save(employee.uid, input(value, { houseIds: [randomUUID()] }), a.uid),
        { code: 'house_unavailable' },
      );
      assert.equal((await store.get(employee.uid)).version, 0);
      await store.save(employee.uid, input(value, { status: 'suspended' }), a.uid);
      assert.equal((await call(employee, 'GET', '/api/identity')).statusCode, 401);
      const suspended = await store.get(employee.uid);
      await store.save(employee.uid, input(suspended, { status: 'active' }), a.uid);
      assert.equal((await call(employee, 'GET', '/api/identity')).statusCode, 200);
      const own = await store.get(a.uid);
      await assert.rejects(() => store.save(a.uid, input(own, { roles: ['customer'] }), a.uid), {
        code: 'self_protection',
      });
      await assert.rejects(() => store.save(a.uid, input(own, { status: 'suspended' }), a.uid), {
        code: 'self_protection',
      });
    },
  );
  await t.test(
    'concurrent administrators cannot remove each other and managed removal overrides stale Auth claims',
    async () => {
      const va = await store.get(a.uid),
        vb = await store.get(b.uid);
      const results = await Promise.allSettled([
        store.save(b.uid, input(vb, { roles: ['customer'] }), a.uid),
        store.save(a.uid, input(va, { roles: ['customer'] }), b.uid),
      ]);
      assert.equal(results.filter((x) => x.status === 'fulfilled').length, 1);
      const winner = (await store.get(a.uid)).roles.includes('admin') ? a : b,
        loser = winner === a ? b : a;
      assert.equal((await call(loser, 'GET', '/api/access/accounts')).statusCode, 403);
      assert.equal((await verify(loser.token)).admin, false);
      // Restore the other administrator using the remaining active administrator.
      await store.save(
        loser.uid,
        input(await store.get(loser.uid), { roles: ['admin', 'customer'] }),
        winner.uid,
      );
    },
  );
  const inviteInput = (email) => {
    const operationId = randomUUID();
    return {
      email,
      roles: ['employee', 'customer'],
      houseIds: [hid],
      operationId,
      code: operationId + '.' + randomBytes(24).toString('hex'),
    };
  };
  await t.test(
    'invitations are hash-only, private, email-bound, one-use, expiry/issuer checked, cancellable and replay-safe',
    async () => {
      const email = prefix + '-invite@example.test',
        write = inviteInput(email),
        invitation = await store.createInvitation(write, a.uid);
      assert.equal(invitation.status, 'pending');
      assert.deepEqual(await store.createInvitation(write, a.uid), invitation);
      const stored = (await db.doc('accessInvitations/' + invitation.id).get()).data();
      assert.equal(JSON.stringify(stored).includes(write.code), false);
      assert.equal('digest' in invitation, false);
      await assert.rejects(() => store.createInvitation(inviteInput(email), a.uid), {
        code: 'duplicate_email',
      });
      assert.equal((await call(customer, 'GET', '/api/access/invitations')).statusCode, 403);
      await assert.rejects(() => store.acceptInvitation(write.code, customer.uid, randomUUID()), {
        code: 'invitation_unavailable',
      });
      const invited = await identity({}, email),
        operationId = randomUUID();
      const result = await store.acceptInvitation(write.code, invited.uid, operationId);
      assert.deepEqual(result.roles, ['employee', 'customer']);
      assert.deepEqual(result.houseIds, [hid]);
      assert.deepEqual(await store.acceptInvitation(write.code, invited.uid, operationId), result);
      await assert.rejects(() => store.acceptInvitation(write.code, invited.uid, randomUUID()), {
        code: 'invitation_unavailable',
      });
      assert.equal((await verify(invited.token)).employee, true);
      assert.deepEqual(await store.createInvitation(write, a.uid), {
        ...invitation,
        status: 'accepted',
        version: 2,
      });
      const cancelWrite = inviteInput(prefix + '-cancel@example.test'),
        pending = await store.createInvitation(cancelWrite, a.uid),
        cancel = { version: pending.version, operationId: randomUUID() };
      assert.equal((await store.cancelInvitation(pending.id, cancel, a.uid)).status, 'cancelled');
      assert.equal((await store.cancelInvitation(pending.id, cancel, a.uid)).status, 'cancelled');
      const cancelledUser = await identity({}, pending.email);
      await assert.rejects(
        () => store.acceptInvitation(cancelWrite.code, cancelledUser.uid, randomUUID()),
        { code: 'invitation_unavailable' },
      );
      const expWrite = inviteInput(prefix + '-expired@example.test'),
        exp = await store.createInvitation(expWrite, a.uid);
      const expUser = await identity({}, exp.email);
      now += 86400001;
      await assert.rejects(() => store.acceptInvitation(expWrite.code, expUser.uid, randomUUID()), {
        code: 'invitation_unavailable',
      });
      assert.equal((await store.invitation(exp.id)).status, 'expired');
      now -= 86400001;
      const issuerWrite = inviteInput(prefix + '-issuer@example.test');
      await store.createInvitation(issuerWrite, b.uid);
      const issuerUser = await identity({}, issuerWrite.email);
      await store.save(b.uid, input(await store.get(b.uid), { roles: ['customer'] }), a.uid);
      await assert.rejects(
        () => store.acceptInvitation(issuerWrite.code, issuerUser.uid, randomUUID()),
        { code: 'forbidden' },
      );
    },
  );
  await t.test(
    'filtered pagination precedes page size; cursors bind filters; history and invitation pagination do not expose codes',
    async () => {
      for (let i = 0; i < 28; i++)
        await identity({}, prefix + '-page-' + String(i).padStart(2, '0') + '@example.test');
      const first = await store.list({
        search: prefix + '-page-',
        role: 'customer',
        pageSize: '25',
      });
      assert.equal(first.items.length, 25);
      assert.ok(first.nextCursor);
      const second = await store.list({
        search: prefix + '-page-',
        role: 'customer',
        pageSize: '25',
        cursor: first.nextCursor,
      });
      assert.equal(second.items.length, 3);
      assert.equal(new Set([...first.items, ...second.items].map((x) => x.uid)).size, 28);
      await assert.rejects(() => store.list({ search: 'other', cursor: first.nextCursor }), {
        code: 'invalid_cursor',
      });
      const history = await store.history({ pageSize: '25' });
      assert.ok(history.items.length);
      assert.equal(JSON.stringify(history).includes('digest'), false);
      assert.equal(JSON.stringify(await store.invitations({})).includes('signature'), false);
    },
  );
  await t.test(
    'Firebase-disabled/unverified/non-Google identities cannot obtain access',
    async () => {
      await auth.updateUser(employee.uid, { disabled: true });
      assert.equal((await call(employee, 'GET', '/api/identity')).statusCode, 401);
      const value = await store.get(employee.uid);
      assert.equal(value.status, 'disabled');
      await auth.updateUser(customer.uid, { emailVerified: false });
      assert.equal((await call(customer, 'GET', '/api/identity')).statusCode, 403);
      const password = randomUUID(),
        passwordEmail = prefix + '-password@example.test';
      const passwordUser = await auth.createUser({
        email: passwordEmail,
        emailVerified: true,
        password,
      });
      ids.push(passwordUser.uid);
      await auth.setCustomUserClaims(passwordUser.uid, { admin: true });
      const passwordLogin = await fetch(
        'http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=demo-key',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: passwordEmail, password, returnSecureToken: true }),
        },
      );
      assert.equal(passwordLogin.status, 200);
      assert.equal(
        (await call({ token: (await passwordLogin.json()).idToken }, 'GET', '/api/access/accounts'))
          .statusCode,
        401,
      );

      await assert.rejects(
        () => store.save(employee.uid, input(value, { status: 'active' }), a.uid),
        { code: 'auth_disabled' },
      );
    },
  );
});
