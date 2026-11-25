import test from 'node:test';
import assert from 'node:assert/strict';
import {
  accountChangeError,
  inviteError,
  normalizeAccess,
  previewAccounts,
  previewActor,
} from '../apps/web/src/access-preview.ts';
import { parseRoute, safeReturnTo } from '../apps/web/src/routing.ts';
test('preview protects the acting administrator and the last active administrator', () => {
  const owner = previewAccounts.find((account) => account.id === previewActor);
  assert.equal(
    accountChangeError(previewAccounts, { ...owner, roles: ['customer'] }),
    'selfProtection',
  );
  assert.equal(
    accountChangeError(previewAccounts, { ...owner, status: 'suspended' }),
    'selfProtection',
  );
  const other = { ...owner, id: 'another-admin' };
  assert.equal(accountChangeError([other], { ...other, status: 'suspended' }), 'lastAdmin');
  assert.equal(accountChangeError([other], { ...other, roles: ['employee'] }), 'lastAdmin');
  assert.equal(
    accountChangeError([...previewAccounts, other], { ...other, status: 'suspended' }),
    null,
  );
});
test('role changes remove stale assignments and reject missing roles or unknown accounts', () => {
  const employee = previewAccounts[1];
  assert.deepEqual(normalizeAccess({ ...employee, roles: ['customer'] }).houses, []);
  assert.deepEqual(normalizeAccess({ roles: ['employee', 'employee'], houses: [2, 2, 999] }), {
    roles: ['employee'],
    houses: [2],
  });
  assert.equal(accountChangeError(previewAccounts, { ...employee, roles: [] }), 'chooseRole');
  assert.equal(accountChangeError(previewAccounts, { ...employee, id: 'unknown' }), 'unavailable');
});
test('invitation drafts reject invalid addresses and duplicate accounts or active drafts case-insensitively', () => {
  assert.equal(inviteError('wrong', previewAccounts, []), 'invalidEmail');
  assert.equal(inviteError(' OWNER@EXAMPLE.INVALID ', previewAccounts, []), 'duplicateEmail');
  const invitation = {
    id: 'draft',
    email: 'new@example.invalid',
    roles: ['employee'],
    houses: [],
    status: 'draft',
  };
  assert.equal(inviteError('NEW@example.invalid', previewAccounts, [invitation]), 'duplicateEmail');
  assert.equal(
    inviteError('new@example.invalid', previewAccounts, [{ ...invitation, status: 'cancelled' }]),
    null,
  );
});
test('Access routes and focused dialog links survive sign-in return URLs', () => {
  const url = '/app/access/?lang=zh&section=invitations&dialog.access-invite=true';
  assert.equal(parseRoute(url).kind, 'identity-access');
  assert.equal(safeReturnTo(url), url);
});
