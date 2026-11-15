import test from 'node:test';
import assert from 'node:assert/strict';
import { runtimeEnvironment } from '../apps/api/src/environment.ts';
test('staging uses its own project and private photo bucket', () => {
  assert.deepEqual(runtimeEnvironment({FAMILY_PAWS_ENV:'staging',GCLOUD_PROJECT:'niu-niu-family-paws-dev'}), {projectId:'niu-niu-family-paws-dev',bucket:'niu-niu-family-paws-dev-pet-photos'});
});
test('mismatched projects and unknown environments fail closed', () => {
  for (const env of [{FAMILY_PAWS_ENV:'staging',GCLOUD_PROJECT:'niu-niu-family-paws'}, {GCLOUD_PROJECT:'niu-niu-family-paws-dev'}, {FAMILY_PAWS_ENV:'typo'}]) assert.throws(()=>runtimeEnvironment(env));
  assert.equal(runtimeEnvironment({}).projectId,'niu-niu-family-paws');
});
