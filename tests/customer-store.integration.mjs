import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { initializeApp, deleteApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { firestoreStore } from '../apps/api/src/store.ts';
import { Conflict } from '../apps/api/src/app.ts';

if(process.env.FIRESTORE_EMULATOR_HOST!=='127.0.0.1:8085'||process.env.GCLOUD_PROJECT!=='demo-niu-niu') throw new Error('Isolated demo Firestore emulator required');
test('Firestore saves are audited, retry-safe, concurrency-safe and searchable before pagination',async t=>{
  const app=initializeApp({projectId:'demo-niu-niu'});
  t.after(()=>deleteApp(app));
  const db=getFirestore(app);
  const store=firestoreStore(db);
  const id=randomUUID();
  const input={name:'Alice Chen',email:'alice@example.test',phone:'',language:'zh',version:0};
  const first=await store.save(id,input,'admin-1');
  assert.deepEqual(await store.save(id,input,'admin-1'),first);
  const competing=await Promise.allSettled([
    store.save(id,{...input,name:'Alice One',version:1},'admin-1'),
    store.save(id,{...input,name:'Alice Two',version:1},'admin-2'),
  ]);
  assert.equal(competing.filter(r=>r.status==='fulfilled').length,1);
  assert.ok(competing.find(r=>r.status==='rejected').reason instanceof Conflict);
  const history=await db.collection('customers').doc(id).collection('history').orderBy('at').get();
  assert.equal(history.size,2);
  assert.equal(history.docs[0].data().actor,'admin-1');
  assert.equal(history.docs[1].data().before.name,'Alice Chen');
  const latest=(await store.list(undefined,'alice@')).items;
  assert.equal(latest.length,1);
  assert.equal(latest[0].version,2);
  assert.equal('searchKeys' in latest[0],false);
  assert.equal((await store.list(undefined,'no-match')).items.length,0);
  const chineseId=randomUUID();
  await store.save(chineseId,{...input,name:'小王',email:''},'admin-1');
  assert.equal((await store.list(undefined,'小')).items[0].id,chineseId);
  for(let index=0;index<52;index++) await store.save(randomUUID(),{...input,name:'Paged '+index,email:''},'admin-1');
  const page1=await store.list(undefined,'paged');
  assert.equal(page1.items.length,50);
  assert.ok(page1.nextCursor);
  const page2=await store.list(page1.nextCursor,'paged');
  assert.equal(page2.items.length,2);
  assert.equal(page2.nextCursor,null);
  assert.equal(new Set([...page1.items,...page2.items].map(c=>c.id)).size,52);
});
