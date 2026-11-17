import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('test photo inventory contains 100 distinct cloud-backed images per supported species with attribution', async () => {
  const manifest = JSON.parse(
    await readFile(new URL('../docs/test-assets/pet-photos.json', import.meta.url), 'utf8'),
  );
  assert.equal(manifest.testOnly, true);
  assert.equal(manifest.bucket, 'niu-niu-family-paws-dev-pet-photos');
  assert.equal(manifest.entries.length, 300);
  assert.equal(new Set(manifest.entries.map((e) => e.sha256)).size, 300);
  assert.equal(new Set(manifest.entries.map((e) => e.pageId)).size, 300);
  for (const species of ['cat', 'dog', 'rabbit'])
    assert.equal(manifest.entries.filter((e) => e.species === species).length, 100);
  for (const entry of manifest.entries) {
    assert.equal(entry.testOnly, true);
    assert.match(entry.sha256, /^[a-f0-9]{64}$/);
    assert.equal(entry.object, `test-library/v1/${entry.species}/${entry.sha256}.webp`);
    assert.equal(entry.storageUri, `gs://${manifest.bucket}/${entry.object}`);
    assert.match(entry.generation, /^\d+$/);
    assert.ok(entry.creator && entry.license && entry.transformation);
    assert.equal(new URL(entry.sourcePage).hostname, 'commons.wikimedia.org');
    assert.match(entry.licenseUrl, /^https?:\/\/(creativecommons.org|www.creativecommons.org)\//);
    assert.ok(entry.bytes > 0 && entry.bytes < 3 * 1024 * 1024);
  }
});
