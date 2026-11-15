import test from 'node:test';
import assert from 'node:assert/strict';
import {fixtures} from '../scripts/dev-fixtures.mjs';
import {buildApp} from '../apps/api/src/app.ts';
test('every development customer and pet fixture can be edited through real API validation',async t=>{
 const savedCustomers=[],savedPets=[];
 const app=buildApp({verify:async()=>({uid:'fixture-test',email_verified:true,google:true,admin:true}),
 store:{save:async(id,input)=>{savedCustomers.push(id);return {id,...input};}},
 pets:{list:async()=>({items:[],nextCursor:null}),save:async(identity,cid,id,input)=>{savedPets.push(id);return {id,customerId:cid,...input};}}});
 t.after(()=>app.close());
 const headers={authorization:'Bearer test'};
 const ids=new Set();
 for(const fixture of fixtures){
  assert.ok(fixture.name.startsWith('[TEST / 测试]'));
  const response=await app.inject({method:'PUT',url:`/api/customers/${fixture.id}`,headers,payload:{name:fixture.name,email:'',phone:'',language:fixture.language,version:0}});
  assert.equal(response.statusCode,200,response.body);
  assert.equal((await app.inject({url:`/api/customers/${fixture.id}/pets`,headers})).statusCode,200);
  for(const [id,name] of fixture.pets){
   assert.ok(name.startsWith('[TEST / 测试]'));
   assert.equal(ids.has(id),false);ids.add(id);
   const response=await app.inject({method:'PUT',url:`/api/customers/${fixture.id}/pets/${id}`,headers,payload:{name,version:0}});
   assert.equal(response.statusCode,200,response.body);
  }
 }
 assert.equal(savedCustomers.length,2);assert.equal(savedPets.length,3);
});
