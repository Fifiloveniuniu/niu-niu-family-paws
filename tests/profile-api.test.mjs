import test from 'node:test';
import assert from 'node:assert/strict';
import { buildApp, Conflict } from '../apps/api/src/app.ts';

test('profile access requires an active verified Google identity and never accepts a selected owner', async t => {
  const calls=[];
  const store={profile:async identity=>{calls.push(identity);return null;},saveProfile:async(identity,input)=>{calls.push({identity,input});return {id:'owned',...input};}};
  const app=buildApp({store,verify:async token=>{
    if(token==='bad'||token==='disabled')throw new Error('unusable account');
    return {uid:'server-owned-uid',email:'verified@example.test',google:token!=='password',email_verified:token!=='unverified',admin:token==='admin'};
  }});
  t.after(()=>app.close());
  const input={name:'  小王  ',language:'zh',version:0};
  for(const [token,status] of [[null,401],['bad',401],['disabled',401],['unverified',403],['password',403]]){
    for(const method of ['GET','PUT'])assert.equal((await app.inject({method,url:'/api/profile',headers:token?{authorization:'Bearer '+token}:{},...(method==='PUT'?{payload:input}:{})})).statusCode,status);
  }
  assert.equal(calls.length,0);
  const get=await app.inject({method:'GET',url:'/api/profile',headers:{authorization:'Bearer customer'}});
  assert.equal(get.statusCode,204);assert.equal(get.headers['cache-control'],'private, no-store');
  assert.deepEqual(calls.pop(),{uid:'server-owned-uid',email:'verified@example.test'});
  for(const field of ['uid','ownerUid','customerId','admin','email','loginEmail','balance']){
    const result=await app.inject({method:'PUT',url:'/api/profile',headers:{authorization:'Bearer customer'},payload:{...input,[field]:'attacker-controlled'}});
    assert.equal(result.statusCode,400,field);
  }
  assert.equal((await app.inject({url:'/api/profile?uid=victim',headers:{authorization:'Bearer customer'}})).statusCode,400);
  for(const token of ['customer','admin','employee']){
    const saved=await app.inject({method:'PUT',url:'/api/profile',headers:{authorization:'Bearer '+token},payload:input});
    assert.equal(saved.statusCode,200);
    assert.deepEqual(calls.pop(),{identity:{uid:'server-owned-uid',email:'verified@example.test'},input:{...input,name:'小王'}});
  }
});

test('profile validates edits, rejects stale writes, and never exposes raw store errors', async t=>{
  let touched=false;
  const app=buildApp({verify:async()=>({uid:'self',email:'self@example.test',google:true,email_verified:true}),store:{
    profile:async()=>({id:'self-profile'}),
    saveProfile:async(_identity,input)=>{touched=true;if(input.version===1)throw new Conflict();throw new Error('private information');},
  }});
  t.after(()=>app.close());
  const put=payload=>app.inject({method:'PUT',url:'/api/profile',headers:{authorization:'Bearer self'},payload});
  const input={name:'Example',language:'en',version:0};
  for(const invalid of [{name:' '},{name:'x'.repeat(121)},{name:'bad\nname'},{language:'fr'},{version:-1}])assert.equal((await put({...input,...invalid})).statusCode,400);
  assert.equal(touched,false);
  assert.equal((await put({...input,version:1})).statusCode,409);
  const result=await put(input);assert.equal(result.statusCode,500);assert.deepEqual(result.json(),{code:'unavailable'});
});
