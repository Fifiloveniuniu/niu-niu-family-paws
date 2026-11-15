import test from 'node:test';
import assert from 'node:assert/strict';
import {buildApp,Conflict} from '../apps/api/src/app.ts';
import {validTimezone} from '../apps/api/src/houses.ts';
const id='10000000-0000-4000-8000-000000000001',input={name:' Test house ',address:' Test address ',timezone:'America/Los_Angeles',version:0};
test('house reads and writes require current verified admin and never trust an injected actor',async t=>{
  let calls=0,saved;
  const app=buildApp({verify:async token=>{if(token==='bad')throw new Error();return{uid:'trusted-admin',admin:token==='admin'||token==='unverified',email_verified:token!=='unverified'};},store:{},houses:{list:async()=>{calls++;return{items:[]};},save:async(id,body,actor)=>{calls++;saved={id,body,actor};if(body.version===9)throw new Conflict();return{id,...body};}}});
  t.after(()=>app.close());
  for(const [token,status] of [[null,401],['bad',401],['unverified',403],['customer',403],['employee',403]])for(const method of ['GET','PUT']){
    const response=await app.inject({method,url:'/api/houses'+(method==='PUT'?'/'+id:''),headers:token?{authorization:'Bearer '+token}:{},...(method==='PUT'?{payload:input}:{})});assert.equal(response.statusCode,status);
  }
  assert.equal(calls,0);
  const put=payload=>app.inject({method:'PUT',url:'/api/houses/'+id,headers:{authorization:'Bearer admin'},payload});
  for(const body of [{...input,name:' '},{...input,timezone:'PST'},{...input,timezone:'Not/AZone'},{...input,actor:'other'},{...input,version:-1},{...input,address:'x'.repeat(501)},{...input,name:'bad\nname'}])assert.equal((await put(body)).statusCode,400);
  assert.equal(calls,0);assert.equal((await put(input)).statusCode,200);assert.deepEqual(saved,{id,body:{...input,name:'Test house',address:'Test address'},actor:'trusted-admin'});
  assert.equal((await put({...input,version:9})).statusCode,409);
  const response=await app.inject({url:'/api/houses',headers:{authorization:'Bearer admin'}});assert.equal(response.statusCode,200);assert.equal(response.headers['cache-control'],'private, no-store');
});
test('house timezone validation accepts named daylight-saving zones and UTC, rejects fixed offsets and abbreviations',()=>{
  for(const zone of ['UTC','America/Los_Angeles','Asia/Shanghai','Europe/London'])assert.equal(validTimezone(zone),true);
  for(const zone of ['','PST','GMT+8','+08:00','Invalid/Zone'])assert.equal(validTimezone(zone),false);
});
