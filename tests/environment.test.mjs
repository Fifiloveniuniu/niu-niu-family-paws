import test from 'node:test';
import assert from 'node:assert/strict';
import { runtimeEnvironment } from '../apps/api/src/environment.ts';
test('development selects separate database and private photo bucket with shared Auth project', () => {
  assert.deepEqual(runtimeEnvironment({FAMILY_PAWS_ENV:'staging',GCLOUD_PROJECT:'niu-niu-family-paws',K_SERVICE:'family-paws-api-dev'}), {projectId:'niu-niu-family-paws',databaseId:'development',bucket:'niu-niu-family-paws-dev-pet-photos'});
  assert.equal(runtimeEnvironment({}).databaseId,'(default)');
});
test('mismatched services, projects and unknown environments fail closed', () => {
  for (const env of [{FAMILY_PAWS_ENV:'staging',GCLOUD_PROJECT:'another-project'}, {K_SERVICE:'family-paws-api-dev'}, {FAMILY_PAWS_ENV:'staging',K_SERVICE:'family-paws-api'}, {FAMILY_PAWS_ENV:'typo'}]) assert.throws(()=>runtimeEnvironment(env));
});
