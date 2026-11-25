import test from 'node:test';
import assert from 'node:assert/strict';
import { projectAccess, accessKey } from '../apps/api/src/access-management.ts';
import { parseRoute, safeReturnTo } from '../apps/web/src/routing.ts';
const user = {
  uid: 'person',
  email: 'person@example.test',
  displayName: 'Person',
  disabled: false,
  customClaims: { admin: true, employee: true },
  passwordHash: 'never-return-this',
};
test('managed permissions override stale Auth claims and never project credentials or private policy fields', () => {
  const account = projectAccess(
    user,
    {
      admin: false,
      employee: false,
      status: 'active',
      version: 2,
      secret: 'never-return-policy-secret',
    },
    { houseIds: ['house'], version: 3 },
  );
  assert.deepEqual(account.roles, ['customer']);
  assert.deepEqual(account.houseIds, []);
  assert.equal(account.version, 2);
  assert.equal(account.assignmentVersion, 3);
  assert.equal(JSON.stringify(account).includes('never-return'), false);
  assert.equal(
    projectAccess(user, { admin: true, employee: true, status: 'suspended' }).status,
    'suspended',
  );
  assert.equal(
    projectAccess(user, { admin: true, employee: true, status: 'corrupt' }).status,
    'suspended',
  );
  assert.equal(projectAccess({ ...user, disabled: true }, { status: 'active' }).status, 'disabled');
});
test('unmanaged bootstrap claims require exact booleans and all verified accounts retain customer access', () => {
  assert.deepEqual(projectAccess(user).roles, ['admin', 'employee', 'customer']);
  assert.deepEqual(projectAccess({ ...user, customClaims: { admin: 'true', employee: 1 } }).roles, [
    'customer',
  ]);
  assert.match(accessKey('uid/with/unsafe/segments'), /^[a-f0-9]{64}$/);
});
test('access and invitation return links retain language and flags without credential data', () => {
  for (const path of [
    '/app/access/?lang=zh&section=invitations',
    '/app/account/profile/?lang=es&dialog.access-accept=true',
  ])
    assert.equal(safeReturnTo(path), path);
  assert.equal(parseRoute('/app/access/').kind, 'identity-access');
});
