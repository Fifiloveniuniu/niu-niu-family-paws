import test from 'node:test';
import assert from 'node:assert/strict';
import { buildApp } from '../apps/api/src/app.ts';
import { PetAccess } from '../apps/api/src/pets.ts';
const customerId='10000000-0000-4000-8000-000000000010',id='10000000-0000-4000-8000-000000000011';
test('pet routes authenticate, validate ownership injection and keep photo responses private',async t=>{
  let received, touched=false;
  const pets={
    list:async(identity,cid)=>{touched=true;if(identity.uid!=='owner')throw new PetAccess();return {items:[],nextCursor:null};},
    save:async(...args)=>{received=args;return {id};},
    photo:async(identity)=>{if(identity.uid!=='owner')throw new PetAccess();return Buffer.from('test-photo');},
    search:async(identity)=>{if(identity.admin!==true)throw new PetAccess();return {items:[],nextCursor:null};},
  };
  const app=buildApp({verify:async token=>({uid:token,email_verified:token!=='unverified',google:true,admin:token==='admin'}),store:{},pets});t.after(()=>app.close());
  const path=`/api/customers/${customerId}/pets`;
  assert.equal((await app.inject({url:path})).statusCode,401);assert.equal(touched,false);
  assert.equal((await app.inject({url:path,headers:{authorization:'Bearer unverified'}})).statusCode,403);assert.equal(touched,false);
  assert.equal((await app.inject({url:path,headers:{authorization:'Bearer other'}})).statusCode,403);
  for(const body of [{name:'Pet',version:0,ownerUid:'other'},{name:'Pet',version:0,photo:'injected'},{name:'  ',version:0},{name:'Pet',version:-1}])assert.equal((await app.inject({method:'PUT',url:path+'/'+id,headers:{authorization:'Bearer owner'},payload:body})).statusCode,400);
  assert.equal((await app.inject({method:'PUT',url:path+'/'+id,headers:{authorization:'Bearer owner'},payload:{name:' Pet ',version:0}})).statusCode,200);
  assert.equal(received[0].uid,'owner');assert.equal(received[1],customerId);assert.equal(received[3].name,'Pet');
  const photo=await app.inject({url:path+'/'+id+'/photo',headers:{authorization:'Bearer owner'}});assert.equal(photo.statusCode,200);assert.equal(photo.headers['cache-control'],'private, no-store');assert.equal(photo.headers['content-type'],'image/webp');
  assert.equal((await app.inject({url:path+'/'+id+'/photo',headers:{authorization:'Bearer other'}})).statusCode,403);
  assert.equal((await app.inject({url:'/api/pet-search?search=pet',headers:{authorization:'Bearer owner'}})).statusCode,403);
});
