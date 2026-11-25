import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';

test('local workflow scripts refuse non-demo configuration before creating records', () => {
  for (const script of [
    'scripts/prepare-local-booking.mjs',
    'scripts/seed-local-workflows.mjs',
    'scripts/seed-local-metrics.mjs',
    'scripts/backfill-local-activity.mjs',
    'scripts/prepare-local-holiday-catalog.mjs',
  ]) {
    const env = { ...process.env, GCLOUD_PROJECT: 'not-a-demo-project' };
    delete env.FIRESTORE_EMULATOR_HOST;
    delete env.FIREBASE_AUTH_EMULATOR_HOST;
    const result = spawnSync(process.execPath, [script], {
      cwd: new URL('..', import.meta.url),
      env,
      encoding: 'utf8',
      timeout: 10000,
    });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /demo emulators|Demo emulators/);
  }
});
