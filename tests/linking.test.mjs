import test from 'node:test';
import assert from 'node:assert/strict';
import {buildApp} from '../apps/api/src/app.ts';

test('link endpoints enforce current admin/Google verification, schemas and bounded claims',async t=>{
  let called=0,admin=true;
  const app=buildApp({store:{},verify:async token=>({uid:token,email:'verified@example.test',email_verified:token!=='unverified',google:token!=='password',admin:token==='admin'&&admin}),links:{
    adminState:async()=>{called++;return {status:'none'};},issue:async()=>{called++;return {};},decide:async()=>{called++;return {};},ownState:async()=>({status:'none'}),request:async(identity,code)=>{called++;return {status:'requested'};},
  }});t.after(()=>app.close());
  const path='/api/customers/10000000-0000-4000-8000-000000000001/account-link';
  const send=(token,url=path,method='GET',payload)=>app.inject({url,method,headers:token?{authorization:`Bearer ${token}`}:{},...(payload?{payload}:{})});
  assert.equal((await send(null)).statusCode,401);assert.equal((await send('customer')).statusCode,403);
  assert.equal((await send('unverified','/api/account-link')).statusCode,403);
  assert.equal((await send('password','/api/account-link')).statusCode,403);
  assert.equal((await send('admin')).statusCode,200);admin=false;assert.equal((await send('admin')).statusCode,403);admin=true;
  assert.equal((await send('customer',path,'POST',{})).statusCode,403);
  assert.equal((await send('admin',path,'POST',{ownerUid:'fake'})).statusCode,400);
  assert.equal((await send('admin',path,'PUT',{action:'approve',version:1,customerVersion:1,uid:'fake'})).statusCode,400);
  assert.equal((await send('customer','/api/account-link','POST',{code:'A'.repeat(32),uid:'fake'})).statusCode,400);
  assert.equal((await send('admin',path+'?code=secret')).statusCode,400);
  assert.equal((await send('admin',path,'POST',{})).statusCode,200);
  assert.equal((await send('admin',path,'PUT',{action:'approve',version:1,customerVersion:1})).statusCode,200);
  for(let i=0;i<12;i++)await send('customer','/api/account-link','POST',{code:'A'.repeat(32)});
  const limited=await send('customer','/api/account-link','POST',{code:'A'.repeat(32)});
  assert.equal(limited.statusCode,429);assert.equal(limited.headers['cache-control'],'private, no-store');
  assert.ok(called<17);
});
