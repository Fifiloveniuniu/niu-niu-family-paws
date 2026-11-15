import test from 'node:test';
import assert from 'node:assert/strict';
import {placementIssue} from '../apps/web/src/calendar-placement.ts';
const stay=(extra={})=>({id:'1',name:'Mochi',species:'dog',house:1,room:1,start:0,end:2,status:'upcoming',units:2,...extra});
const issue=(stays,extra={})=>{const p={pet:'Willow',species:'dog',start:0,end:4,house:1,room:1,maximum:4,units:2,...extra};return placementIssue(stays,p.pet,p.species,p.start,p.end,p.house,p.room,p.maximum,p.units);};
test('checks peak concurrent capacity across the complete stay, not total assigned units',()=>{
 assert.equal(issue([stay({end:1}),stay({id:'2',name:'Biscuit',start:2,end:3})]),null);
 assert.equal(issue([stay(),stay({id:'2',name:'Biscuit',start:1,end:3})]),'capacity');
});
test('rejects mixed species, duplicate pet occupancy across houses, and overdue unknown release',()=>{
 assert.equal(issue([stay({species:'cat'})]),'species');
 assert.equal(issue([stay({name:'Willow',house:2})]),'duplicate');
 assert.equal(issue([stay({end:-1,start:-4,overdue:true,status:'in'})]),'overdue');
});
test('unresolved rules never silently become availability',()=>{
 assert.equal(issue([],{maximum:0}),'unconfigured');
 assert.equal(issue([],{units:NaN}),'unconfigured');
 assert.equal(issue([stay({start:-2,end:0})]),'boundary');
 assert.equal(issue([],{end:0}),'dates');
});
test('checked-out stays and other rooms do not reserve capacity',()=>{
 assert.equal(issue([stay({status:'out',units:10,species:'cat'})]),null);
 assert.equal(issue([stay({room:2,species:'cat',units:10})]),null);
});
