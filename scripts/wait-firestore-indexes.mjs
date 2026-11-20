import { readFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
const project = 'niu-niu-family-paws';
const base = `https://firestore.googleapis.com/v1/projects/${project}/databases/(default)/collectionGroups`;
export function indexKey(index) {
  const group =
    index.collectionGroup ??
    decodeURIComponent(index.name.split('/collectionGroups/')[1].split('/indexes/')[0]);
  const fields = index.fields.map((field) => ({
    fieldPath: field.fieldPath,
    ...(field.order ? { order: field.order } : {}),
    ...(field.arrayConfig ? { arrayConfig: field.arrayConfig } : {}),
    ...(field.vectorConfig ? { vectorConfig: field.vectorConfig } : {}),
  }));
  if (fields.some((field) => field.vectorConfig))
    throw Error('Vector index readiness needs explicit support');
  if (fields.at(-1)?.fieldPath !== '__name__')
    fields.push({
      fieldPath: '__name__',
      order: fields.filter((f) => f.order).at(-1)?.order ?? 'ASCENDING',
    });
  return JSON.stringify([group, index.queryScope, fields]);
}
export function pendingIndexes(spec, composite, fields) {
  const pending = [];
  const existing = new Map(composite.map((index) => [indexKey(index), index]));
  for (const wanted of spec.indexes) {
    const index = existing.get(indexKey(wanted));
    if (index?.state === 'NEEDS_REPAIR')
      throw Error('Required index needs repair: ' + wanted.collectionGroup);
    if (index?.state !== 'READY') pending.push(wanted.collectionGroup);
  }
  for (const wanted of spec.fieldOverrides ?? []) {
    const field = fields.get(wanted.collectionGroup + '/' + wanted.fieldPath);
    for (const expected of wanted.indexes) {
      const index = field?.indexConfig?.indexes?.find(
        (index) =>
          index.queryScope === expected.queryScope &&
          index.fields.some(
            (f) =>
              f.fieldPath === wanted.fieldPath &&
              f.order === expected.order &&
              f.arrayConfig === expected.arrayConfig,
          ),
      );
      if (index?.state === 'NEEDS_REPAIR')
        throw Error('Required field index needs repair: ' + wanted.collectionGroup);
      if (index?.state !== 'READY') pending.push(wanted.collectionGroup + '/' + wanted.fieldPath);
    }
  }
  return pending;
}
export async function waitForIndexes(
  spec,
  {
    read,
    sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
    now = Date.now,
    timeout = 30 * 60_000,
    log = console.log,
  },
) {
  const deadline = now() + timeout;
  while (true) {
    const composite = [];
    let cursor;
    do {
      const result = await read(
        base + '/-/indexes' + (cursor ? '?' + new URLSearchParams({ pageToken: cursor }) : ''),
      );
      composite.push(...(result.indexes ?? []));
      cursor = result.nextPageToken;
    } while (cursor);
    const fields = new Map();
    for (const field of spec.fieldOverrides ?? [])
      fields.set(
        field.collectionGroup + '/' + field.fieldPath,
        await read(
          base +
            '/' +
            encodeURIComponent(field.collectionGroup) +
            '/fields/' +
            encodeURIComponent(field.fieldPath),
        ),
      );
    const pending = pendingIndexes(spec, composite, fields);
    if (!pending.length) {
      log('All required Firestore indexes are ready.');
      return;
    }
    if (now() >= deadline)
      throw Error('Required Firestore indexes did not become ready; Hosting was not published');
    log(`Waiting for ${pending.length} required index definitions…`);
    await sleep(15_000);
  }
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (process.env.FIRESTORE_EMULATOR_HOST)
    throw Error('Release verification must not use an emulator');
  const spec = JSON.parse(await readFile('firestore.indexes.json', 'utf8'));
  const read = async (url) => {
    const token = execFileSync('gcloud', ['auth', 'print-access-token'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'inherit'],
    }).trim();
    const response = await fetch(url, { headers: { Authorization: 'Bearer ' + token } });
    if (!response.ok) throw Error('Firestore index metadata request failed: ' + response.status);
    return response.json();
  };
  await waitForIndexes(spec, { read });
}
