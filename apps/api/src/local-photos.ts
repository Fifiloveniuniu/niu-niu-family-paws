import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import path from 'node:path';
import type { Photos } from './pets.ts';
export const localPhotoDirectory = path.join(tmpdir(), 'family-paws-local-photo-cache');
export function localPhotos(): Photos {
  if (
    process.env.FAMILY_PAWS_EMULATORS !== 'true' ||
    process.env.GCLOUD_PROJECT !== 'demo-niu-niu' ||
    process.env.FIRESTORE_EMULATOR_HOST !== '127.0.0.1:8085' ||
    process.env.FIREBASE_AUTH_EMULATOR_HOST !== '127.0.0.1:9099'
  )
    throw new Error('Isolated demo emulators required');
  const file = (key: string) => {
    const match = /^photos\/[0-9a-f-]{36}\/[0-9a-f-]{36}\/([a-f0-9]{64})\.webp$/.exec(key);
    if (!match) throw new Error('Invalid local photo key');
    return { name: path.join(localPhotoDirectory, match[1] + '.webp'), hash: match[1] };
  };
  return {
    async put(key, bytes) {
      const target = file(key);
      if (createHash('sha256').update(bytes).digest('hex') !== target.hash)
        throw new Error('Photo hash mismatch');
      await mkdir(localPhotoDirectory, { recursive: true });
      try {
        await writeFile(target.name, bytes, { flag: 'wx' });
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
        const stored = await readFile(target.name);
        if (!stored.equals(bytes)) throw new Error('Local photo collision');
      }
    },
    async get(key) {
      return readFile(file(key).name);
    },
  };
}
