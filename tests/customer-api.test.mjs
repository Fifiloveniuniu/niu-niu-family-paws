import test from 'node:test';
import assert from 'node:assert/strict';
import { buildApp, Conflict } from '../apps/api/src/app.ts';
const id='10000000-0000-4000-8000-000000000001';
const body={name:'  Test customer  ', email:'test@example.test',phone:'',language:'zh',version:0};
test('API rejects missing, invalid, unverified, and non-admin identities before reading customer data', async t => {
  let touched=false;
  const store={list:async()=>{touched=true;return {items:[],nextCursor:null};},save:async()=>{touched=true;}};
  const app=buildApp({verify:async token=>{if(token==='bad')throw new Error('secret');return {uid:'u',admin:token==='admin'||token==='unverified',email_verified:token!=='unverified'};},store});
  t.after(()=>app.close());
  for(const [token,status] of [[null,401],['bad',401],['employee',403],['unverified',403]]) {
    for(const method of ['GET','PUT']) {
      const response=await app.inject({method,url:method==='GET'?'/api/customers':'/api/customers/'+id,headers:token?{authorization:'Bearer '+token}:{},...(method==='PUT'?{payload:body}:{})});
      assert.equal(response.statusCode,status);
    }
  }
  assert.equal(touched,false);
  const response=await app.inject({method:'GET',url:'/api/customers',headers:{authorization:'Bearer admin'}});
  assert.equal(response.statusCode,200);assert.equal(response.headers['cache-control'],'private, no-store');assert.equal(touched,true);
});
test('API rejects role injection and invalid input, passes trusted actor, and returns safe conflicts/errors',async t=>{
  let saved;
  const app=buildApp({verify:async()=>({uid:'trusted',admin:true,email_verified:true}),store:{list:async()=>({items:[],nextCursor:null}),save:async(id,input,actor)=>{saved={id,input,actor};if(input.version===2)throw new Conflict();if(input.version===3)throw new Error('private customer details');return {id,...input,version:1};}}});
  t.after(()=>app.close());
  const put=payload=>app.inject({method:'PUT',url:'/api/customers/'+id,headers:{authorization:'Bearer admin'},payload});
  for(const payload of [{...body,admin:true},{...body,name:'   '},{...body,email:'not-email'},{...body,version:-1},{...body,language:'fr'},{...body,phone:'x'.repeat(41)}])assert.equal((await put(payload)).statusCode,400);
  assert.equal((await put(body)).statusCode,200);assert.equal(saved.input.name,'Test customer');assert.equal(saved.actor,'trusted');
  assert.equal((await put({...body,version:2})).statusCode,409);
  const error=await put({...body,version:3});assert.equal(error.statusCode,500);assert.deepEqual(error.json(),{code:'unavailable'});
});
test('customer search is normalized, bounded, and applied with pagination by the store', async t => {
  let received;
  const app=buildApp({verify:async()=>({uid:'admin',admin:true,email_verified:true}),store:{list:async(...args)=>{received=args;return {items:[],nextCursor:null};},save:async()=>{throw new Error('unused');}}});
  t.after(()=>app.close());
  const search=url=>app.inject({method:'GET',url,headers:{authorization:'Bearer admin'}});
  assert.equal((await search('/api/customers?search=%20ALICE%20&cursor='+id)).statusCode,200);
  assert.deepEqual(received,[id,'alice']);
  assert.equal((await search('/api/customers?search='+ 'x'.repeat(255))).statusCode,400);
  assert.equal((await search('/api/customers?cursor=invalid')).statusCode,400);
});
