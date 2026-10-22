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

test('self-registration has one canonical profile across retries and roles, without claiming existing records',async t=>{
  const app=initializeApp({projectId:'demo-niu-niu'},'profile-'+randomUUID());
  t.after(()=>deleteApp(app));
  const db=getFirestore(app), store=firestoreStore(db);
  const owner={uid:'profile-'+randomUUID(),email:'verified-owner@example.test'};
  const other={uid:'other-'+randomUUID(),email:'other@example.test'};
  const unlinked=await store.save(randomUUID(),{name:'Same Name',email:owner.email,phone:'',language:'en',version:0},'admin');
  assert.equal(await store.profile(owner),null);
  const input={name:'Same Name',language:'zh',version:0};
  const [first,retry]=await Promise.all([store.saveProfile(owner,input),store.saveProfile(owner,input)]);
  assert.equal(first.id,retry.id);assert.notEqual(first.id,unlinked.id);
  assert.equal((await db.collection('customers').where('ownerUid','==',owner.uid).get()).size,1);
  assert.equal((await db.collection('customers').doc(first.id).collection('history').get()).size,1);
  assert.equal(await store.profile(other),null);
  const adminEdit=await store.save(first.id,{name:'Edited by admin',email:'contact@example.test',phone:'',language:'en',version:1},'admin');
  const own=await store.profile(owner);
  assert.deepEqual(own,adminEdit);assert.equal(own.loginEmail,owner.email);
  assert.equal((await db.collection('customers').doc(first.id).get()).data().ownerUid,owner.uid);
  const selfEdit=await store.saveProfile(owner,{name:'Self edit',language:'zh',version:2});
  assert.equal(selfEdit.email,'contact@example.test');assert.equal(selfEdit.id,first.id);
  assert.equal((await store.list(undefined,'verified-owner@')).items.find(x=>x.id===first.id).name,'Self edit');
  await assert.rejects(store.saveProfile(owner,{name:'Stale edit',language:'en',version:1}),Conflict);
  const changedIdentity={...owner,email:'new-verified@example.test'};
  const refreshed=await store.profile(changedIdentity);
  assert.equal(refreshed.version,4);assert.equal(refreshed.loginEmail,changedIdentity.email);
  assert.equal((await store.list(undefined,'verified-owner@')).items.some(x=>x.id===first.id),false);
  const history=await db.collection('customers').doc(first.id).collection('history').get();
  assert.equal(history.size,4);
  assert.equal(history.docs[2].data().actor,owner.uid);
  assert.equal(history.docs[3].data().source,'identity-sync');
  // Even a corrupt internal reference must not turn another account into the owner.
  await db.collection('people').doc(other.uid).set({customerId:first.id});
  await assert.rejects(store.profile(other),/ownership mismatch/);
  await assert.rejects(store.saveProfile(other,{name:'Takeover',language:'en',version:4}),/ownership mismatch/);
  assert.equal((await store.profile(changedIdentity)).name,'Self edit');
});
