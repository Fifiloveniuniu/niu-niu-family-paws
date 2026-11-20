import { writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
export function releaseManifest(commit, now = Date.now()) {
  if (!/^[a-f0-9]{40}$/.test(commit ?? '')) throw Error('A full main commit SHA is required');
  return { commit, builtAt: new Date(now).toISOString() };
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href)
  await writeFile(
    'dist/release.json',
    JSON.stringify(releaseManifest(process.argv[2]), null, 2) + '\n',
  );
