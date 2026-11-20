import { pathToFileURL } from 'node:url';
import { releaseManifest } from './release-manifest.mjs';
export async function verifyApi(read = fetch) {
  const origin = 'https://family-paws-api-2la63akoma-uw.a.run.app';
  const health = await read(origin + '/health');
  if (!health.ok || (await health.json()).ok !== true) throw Error('Deployed API is unhealthy');
  const pricing = await read(origin + '/api/public/pricing');
  if (!pricing.ok || !Array.isArray((await pricing.json()).rates))
    throw Error('Deployed API is missing public pricing');
}
export async function verifyRelease(commit, read = fetch) {
  releaseManifest(commit);
  const origin = 'https://niu-niu-family-paws.web.app';
  const manifest = await read(origin + '/release.json?commit=' + commit, { cache: 'no-store' });
  if (!manifest.ok || (await manifest.json()).commit !== commit)
    throw Error('Hosted release does not match the merged main commit');
  await verifyApi(read);
  const identity = await read(origin + '/api/identity');
  if (identity.status !== 401 || (await identity.json()).code !== 'unauthenticated')
    throw Error('Hosted private API did not reject an unauthenticated request');
  const pricing = await read(origin + '/api/public/pricing');
  if (!pricing.ok || !Array.isArray((await pricing.json()).rates))
    throw Error('Hosted API revision is missing public pricing');
  for (const path of ['/home/', '/app/metrics/']) {
    const page = await read(origin + path);
    if (!page.ok || !page.headers.get('content-type')?.includes('text/html'))
      throw Error('Hosted page failed: ' + path);
  }
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  let last;
  for (let attempt = 0; attempt < 20; attempt++) {
    try {
      if (process.argv[2] === '--api-only') await verifyApi();
      else await verifyRelease(process.argv[2]);
      console.log('Verified merged commit, public pages, API health and protected access.');
      last = null;
      break;
    } catch (error) {
      last = error;
      await new Promise((resolve) => setTimeout(resolve, 3_000));
    }
  }
  if (last) throw last;
}
