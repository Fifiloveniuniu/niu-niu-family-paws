import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
const english = JSON.parse(
  await readFile(new URL('../apps/web/src/locales/en.json', import.meta.url), 'utf8'),
);
const chinese = JSON.parse(
  await readFile(new URL('../apps/web/src/locales/zh.json', import.meta.url), 'utf8'),
);
function shape(value) {
  if (Array.isArray(value)) return value.map(shape);
  if (value && typeof value === 'object')
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, shape(value[key])]),
    );
  return typeof value;
}
function variables(value, path = '') {
  if (typeof value === 'string')
    return [[path, [...value.matchAll(/\{\{([^}]+)\}\}/g)].map((match) => match[1]).sort()]];
  return Object.entries(value).flatMap(([key, child]) => variables(child, path + '.' + key));
}
test('locale resources cover the same keys, structures and interpolation values', () => {
  assert.deepEqual(shape(chinese), shape(english));
  assert.deepEqual(
    variables(chinese).sort(([a], [b]) => a.localeCompare(b)),
    variables(english).sort(([a], [b]) => a.localeCompare(b)),
  );
});
test('UI components do not embed Chinese translation alternatives or message dictionaries', async () => {
  const root = new URL('../apps/web/src/', import.meta.url);
  for (const name of await readdir(root))
    if (name.endsWith('.tsx')) {
      const source = await readFile(new URL(name, root), 'utf8');
      assert.doesNotMatch(source, /[\u3400-\u9fff]/, name + ' contains inline Chinese');
      assert.doesNotMatch(
        source,
        /const (?:englishMessages|chineseMessages)\s*(?::[^=]*)?=\s*\{/,
        name + ' embeds a message dictionary',
      );
    }
});
