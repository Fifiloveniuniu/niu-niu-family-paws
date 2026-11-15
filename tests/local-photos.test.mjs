import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash,randomUUID} from 'node:crypto';
import {localPhotos} from '../apps/api/src/local-photos.ts';
test('local photos fail closed outside demo emulators and reject traversal or mismatched bytes',async()=>{
  const keys=['FAMILY_PAWS_EMULATORS','GCLOUD_PROJECT','FIRESTORE_EMULATOR_HOST','FIREBASE_AUTH_EMULATOR_HOST'];
  const previous=Object.fromEntries(keys.map(k=>[k,process.env[k]]));
  try{
    for(const k of keys)delete process.env[k];
    assert.throws(()=>localPhotos(),/Isolated/);
    Object.assign(process.env,{FAMILY_PAWS_EMULATORS:'true',GCLOUD_PROJECT:'demo-niu-niu',FIRESTORE_EMULATOR_HOST:'127.0.0.1:8085',FIREBASE_AUTH_EMULATOR_HOST:'127.0.0.1:9099'});
    const store=localPhotos(),bytes=Buffer.from('local-photo-test-'+randomUUID()),hash=createHash('sha256').update(bytes).digest('hex'),key=`photos/${randomUUID()}/${randomUUID()}/${hash}.webp`;
    await assert.rejects(store.get('../../outside'),/Invalid/);
    await assert.rejects(store.put(key,Buffer.from('wrong')),/hash mismatch/);
    await store.put(key,bytes);await store.put(key,bytes);assert.deepEqual(await store.get(key),bytes);
    process.env.GCLOUD_PROJECT='niu-niu-family-paws';assert.throws(()=>localPhotos(),/Isolated/);
  }finally{for(const k of keys){if(previous[k]===undefined)delete process.env[k];else process.env[k]=previous[k];}}
});
