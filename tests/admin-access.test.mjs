import test from 'node:test';
import assert from 'node:assert/strict';
import { hasAdminAccess } from '../apps/web/src/admin-access.ts';

test('administrator access requires a verified identity and an explicit boolean claim', () => {
  assert.equal(hasAdminAccess({admin:true,email_verified:true}),true);
  for(const claims of [{},{admin:true},{email_verified:true},{admin:'true',email_verified:true},{admin:1,email_verified:true},{admin:true,email_verified:false},{role:'admin',email_verified:true}]) {
    assert.equal(hasAdminAccess(claims),false);
  }
});
