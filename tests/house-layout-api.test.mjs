import test from 'node:test';
import assert from 'node:assert/strict';
import {buildApp} from '../apps/api/src/app.ts';
import {HouseLayoutMissing} from '../apps/api/src/house-layout.ts';
const h='10000000-0000-4000-8000-000000000001',r='10000000-0000-4000-8000-000000000002',s='10000000-0000-4000-8000-000000000003';
test('layout routes require verified admins, validate constraints and use trusted actors',async t=>{
  let calls=0,saved;
  const app=buildApp({verify:async token=>({uid:'trusted',admin:token==='admin'||token==='unverified',email_verified:token!=='unverified'}),store:{},layout:{read:async()=>{calls++;return{rooms:[]};},room:async(...args)=>{calls++;saved=args;return{...args[2],id:args[1]};},space:async(...args)=>{calls++;saved=args;if(args[3].name==='Missing')throw new HouseLayoutMissing();return{...args[3],id:args[2]};}}});t.after(()=>app.close());
  for(const token of ['customer','employee','unverified'])for(const [method,url,payload] of [['GET',`/api/houses/${h}/layout`],['PUT',`/api/houses/${h}/rooms/${r}`,{name:'Room',closed:false,version:0}],['PUT',`/api/houses/${h}/rooms/${r}/spaces/${s}`,{name:'Space',closed:false,version:0,capacity:1,species:['cat'],sharing:'individual'}]])assert.equal((await app.inject({method,url,payload,headers:{authorization:'Bearer '+token}})).statusCode,403);
  assert.equal(calls,0);
  const body={name:' Test space ',capacity:2,species:['rabbit','cat'],sharing:'same-household',closed:false,version:0};
  const put=payload=>app.inject({method:'PUT',url:`/api/houses/${h}/rooms/${r}/spaces/${s}`,headers:{authorization:'Bearer admin'},payload});
  for(const value of [{...body,species:[]},{...body,species:['cat','cat']},{...body,species:['bird']},{...body,capacity:0},{...body,capacity:1.5},{...body,sharing:'individual'},{...body,weightLimit:{value:0,unit:'kg'}},{...body,weightLimit:{value:2,unit:'stone'}},{...body,actor:'injected'},{...body,name:'\n'}])assert.equal((await put(value)).statusCode,400);
  assert.equal(calls,0);
  assert.equal((await put({...body,weightLimit:{value:7.5,unit:'kg'}})).statusCode,200);
  assert.deepEqual(saved,[h,r,s,{...body,name:'Test space',species:['cat','rabbit'],weightLimit:{value:7.5,unit:'kg'}},'trusted']);
  assert.equal((await put({...body,name:'Missing'})).statusCode,404);
  const response=await app.inject({url:`/api/houses/${h}/layout`,headers:{authorization:'Bearer admin'}});assert.equal(response.statusCode,200);assert.equal(response.headers['cache-control'],'private, no-store');
});
