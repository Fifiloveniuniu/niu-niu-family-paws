import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { execFileSync } from 'node:child_process';
import test from 'node:test';
import assert from 'node:assert/strict';
import { releaseManifest } from '../scripts/release-manifest.mjs';
import { verifyRelease, verifyApi } from '../scripts/verify-release.mjs';
import { indexKey, pendingIndexes, waitForIndexes } from '../scripts/wait-firestore-indexes.mjs';
const sha = 'a'.repeat(40);
const wanted = {
  collectionGroup: 'bookings',
  queryScope: 'COLLECTION',
  fields: [
    { fieldPath: 'status', order: 'ASCENDING' },
    { fieldPath: 'arrival', order: 'DESCENDING' },
  ],
};
const remote = {
  ...wanted,
  name: 'projects/test/databases/(default)/collectionGroups/bookings/indexes/test',
  fields: [...wanted.fields, { fieldPath: '__name__', order: 'DESCENDING' }],
  state: 'READY',
};
test('index readiness preserves implicit name ordering and distinguishes explicit opposite ordering', () => {
  assert.equal(indexKey(wanted), indexKey(remote));
  assert.equal(
    indexKey(wanted),
    indexKey({
      ...wanted,
      fields: wanted.fields.map((f) => ({ order: f.order, fieldPath: f.fieldPath })),
    }),
  );
  assert.notEqual(
    indexKey(wanted),
    indexKey({
      ...wanted,
      fields: [...wanted.fields, { fieldPath: '__name__', order: 'ASCENDING' }],
    }),
  );
});
test('release waits for every requested composite and exact field scope without mutating indexes', async () => {
  const spec = {
    indexes: [wanted],
    fieldOverrides: [
      {
        collectionGroup: 'balances',
        fieldPath: 'days',
        indexes: [{ order: 'ASCENDING', queryScope: 'COLLECTION_GROUP' }],
      },
    ],
  };
  const fields = new Map([
    [
      'balances/days',
      {
        indexConfig: {
          indexes: [
            {
              queryScope: 'COLLECTION',
              state: 'READY',
              fields: [{ fieldPath: 'days', order: 'ASCENDING' }],
            },
          ],
        },
      },
    ],
  ]);
  assert.deepEqual(pendingIndexes(spec, [remote], fields), ['balances/days']);
  let clock = 0,
    cycle = 0,
    calls = [];
  await waitForIndexes(spec, {
    now: () => clock,
    timeout: 60_000,
    log: () => {},
    sleep: async (ms) => {
      clock += ms;
      cycle++;
    },
    read: async (url) => {
      calls.push(url);
      if (url.includes('/fields/'))
        return {
          indexConfig: {
            indexes: [
              {
                queryScope: 'COLLECTION_GROUP',
                state: 'READY',
                fields: [{ fieldPath: 'days', order: 'ASCENDING' }],
              },
            ],
          },
        };
      return { indexes: [{ ...remote, state: cycle ? 'READY' : 'CREATING' }] };
    },
  });
  assert.equal(cycle, 1);
  assert(
    calls.every((url) =>
      url.startsWith('https://firestore.googleapis.com/v1/projects/niu-niu-family-paws/'),
    ),
  );
  assert.throws(
    () => pendingIndexes({ indexes: [wanted] }, [{ ...remote, state: 'NEEDS_REPAIR' }], new Map()),
    /repair/,
  );
  await assert.rejects(
    () =>
      waitForIndexes(
        { indexes: [wanted] },
        { read: async () => ({ indexes: [] }), now: () => 0, timeout: 0, log: () => {} },
      ),
    /not become ready/,
  );
});
test('release manifests require an exact commit and live verification rejects stale or exposed private APIs', async () => {
  assert.equal(releaseManifest(sha, 0).commit, sha);
  assert.throws(() => releaseManifest('main'), /full main commit/);
  let stale = false,
    publicIdentity = false,
    unhealthy = false;
  const read = async (url) => {
    if (url.includes('release.json'))
      return Response.json({ commit: stale ? 'b'.repeat(40) : sha });
    if (url.endsWith('/health')) return Response.json({ ok: !unhealthy });
    if (url.endsWith('/api/identity'))
      return Response.json({ code: 'unauthenticated' }, { status: publicIdentity ? 200 : 401 });
    if (url.endsWith('/api/public/pricing')) return Response.json({ rates: [] });
    return new Response('<!doctype html>', { headers: { 'content-type': 'text/html' } });
  };
  await verifyRelease(sha, read);
  stale = true;
  await assert.rejects(() => verifyRelease(sha, read), /does not match/);
  stale = false;
  publicIdentity = true;
  await assert.rejects(() => verifyRelease(sha, read), /unauthenticated/);
  publicIdentity = false;
  unhealthy = true;
  await assert.rejects(() => verifyApi(read), /unhealthy/);
});

test('API source uploads include runtime packages and exclude generated credentials and private files', async () => {
  const folder = await mkdtemp(join(tmpdir(), 'family-paws-source-'));
  try {
    execFileSync('git', ['init', folder], { stdio: 'pipe' });
    await writeFile(
      join(folder, '.gitignore'),
      await readFile(new URL('../.gcloudignore', import.meta.url)),
    );
    const allowed = [
      'apps/api/src/server.ts',
      'packages/time/wall-time.ts',
      'packages/pricing/source-rates.json',
      'package-lock.json',
      'cloudbuild.api.yaml',
    ];
    const denied = [
      'gha-creds-test.json',
      'apps/api/.env',
      'packages/gha-creds-test.json',
      'apps/api/private.key',
      'docs/customer-records.json',
      'node_modules/example/index.js',
    ];
    for (const path of [...allowed, ...denied]) {
      await mkdir(dirname(join(folder, path)), { recursive: true });
      await writeFile(join(folder, path), '');
    }
    const ignored = execFileSync('git', ['-C', folder, 'check-ignore', '--no-index', '--stdin'], {
      input: [...allowed, ...denied].join('\n') + '\n',
      encoding: 'utf8',
    })
      .trim()
      .split('\n');
    assert.deepEqual(ignored.sort(), denied.sort());
  } finally {
    await rm(folder, { recursive: true, force: true });
  }
});
