import test from 'node:test';
import assert from 'node:assert/strict';
import {changePetBalance,validatePetCoverage,plannedDays} from '../apps/web/src/pet-balance.ts';
const change=(extra={})=>({id:'op-1',pet:'Willow',service:'daycare',version:0,delta:10,reason:'[TEST] opening credit',validFrom:'2026-01-01',validThrough:'2026-12-31',months:[1,2,3,4,5,6,7,8,9,10,11,12],...extra});
const account=()=>changePetBalance(undefined,change(),[],'2026-11-15T00:00:00Z');
const plan=(extra={})=>({id:'stay-1',pet:'Willow',service:'daycare',days:6,startDate:'2026-11-15',endDate:'2026-11-16',...extra});
test('per-pet/service coverage checks do not borrow another balance',()=>{
 assert.equal(validatePetCoverage(account(),'Willow','daycare',3,'2026-11-15','2026-11-16').code,'ok');
 assert.equal(validatePetCoverage(account(),'Mochi','daycare',3,'2026-11-15','2026-11-16').code,'missing');
 assert.equal(validatePetCoverage(account(),'Willow','boarding',3,'2026-11-15','2026-11-16').code,'missing');
});
test('coverage validates reviewed dates, every month crossed and manually entered whole days',()=>{
 const a=account();
 assert.equal(validatePetCoverage(a,'Willow','daycare',11,'2026-11-15','2026-11-16').code,'insufficient');
 assert.equal(validatePetCoverage(a,'Willow','daycare',1,'2026-12-30','2027-01-01').code,'coverage');
 assert.equal(validatePetCoverage({...a,months:[11]},'Willow','daycare',1,'2026-11-30','2026-12-01').code,'months');
 assert.equal(validatePetCoverage(a,'Willow','daycare',0,'2026-11-15','2026-11-16').code,'required');
 assert.equal(validatePetCoverage(a,'Willow','daycare',.5,'2026-11-15','2026-11-16').code,'required');
 assert.equal(validatePetCoverage(a,'Willow','daycare',1,'2026-02-30','2026-03-01').code,'dates');
});
test('planned credits cannot be allocated twice and stay removal restores planning headroom',()=>{
 const plans=[plan()];
 assert.equal(plannedDays(plans,'Willow','daycare'),6);
 assert.equal(validatePetCoverage(account(),'Willow','daycare',5,'2026-11-17','2026-11-18',plans).code,'insufficient');
 assert.equal(validatePetCoverage(account(),'Willow','daycare',5,'2026-11-17','2026-11-18',[]).code,'ok');
 assert.equal(validatePetCoverage(account(),'Willow','daycare',6,'2026-11-15','2026-11-16',plans,'stay-1').code,'ok');
});
test('adjustments retain history, reject stale versions and make identical retries idempotent',()=>{
 const first=account();
 assert.equal(changePetBalance(first,change(),[],'later'),first);
 assert.throws(()=>changePetBalance(first,change({delta:20}),[],'later'),/operation/);
 assert.throws(()=>changePetBalance(first,change({id:'op-2'}),[],'later'),/version/);
 const next=changePetBalance(first,change({id:'op-2',version:1,delta:-2,reason:'[TEST] correction'}),[],'2026-11-16T00:00:00Z');
 assert.equal(next.days,8);assert.equal(next.history.length,2);assert.equal(next.history[0].after,10);
});
test('balance changes cannot strand planned stays through amount, dates or eligibility',()=>{
 const a=account(),plans=[plan()];
 assert.throws(()=>changePetBalance(a,change({id:'x',version:1,delta:-5}),plans,'now'),/planned/);
 assert.throws(()=>changePetBalance(a,change({id:'x',version:1,delta:0,months:[1]}),plans,'now'),/planned/);
 assert.throws(()=>changePetBalance(a,change({id:'x',version:1,delta:0,validThrough:'2026-11-15'}),plans,'now'),/planned/);
 assert.throws(()=>changePetBalance(a,change({id:'x',version:1,delta:-11}),[],'now'),/negative/);
});
