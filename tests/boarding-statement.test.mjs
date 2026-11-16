import test from 'node:test';
import assert from 'node:assert/strict';
import {statementEntries,filterStatement,statementTotals,statementCsv,validStatementRange,emptyStatementFilters} from '../apps/web/src/boarding-statement.ts';
const pets=[{name:'Mochi',customer:'1',customerName:'[TEST] family 1'},{name:'Biscuit',customer:'2',customerName:'[TEST] family 2'}];
const at=(day)=>new Date(2026,10,day,10).toISOString();
const accounts={a:{pet:'Mochi',service:'boarding',history:[{id:'a',at:at(1),delta:10,after:10,reason:''},{id:'b',at:at(2),delta:-2,after:8,reason:'[TEST] correction'}]},b:{pet:'Biscuit',service:'boarding',history:[{id:'c',at:at(3),delta:5,after:5,reason:'[TEST] credit'}]}};
test('statement keeps per-pet historical running balances when earlier rows are filtered out',()=>{
 const entries=statementEntries(accounts,pets);assert.deepEqual(entries.map(e=>e.id),['c','b','a']);
 const rows=filterStatement(entries,{...emptyStatementFilters,pet:'Mochi',from:'2026-11-02',through:'2026-11-02'});
 assert.equal(rows.length,1);assert.equal(rows[0].before,10);assert.equal(rows[0].after,8);assert.deepEqual(statementTotals(rows),{added:0,removed:2,net:-2});assert.equal(accounts.a.history[0].after,10);
 assert.deepEqual(filterStatement(entries,{...emptyStatementFilters,customer:'2'}).map(e=>e.id),['c']);
 assert.equal(filterStatement(entries,{...emptyStatementFilters,kind:'terms'}).length,0);
});
test('statement rejects invalid date filters instead of showing an unfiltered ledger',()=>{
 assert.equal(validStatementRange('',''),true);assert.equal(validStatementRange('2026-11-03','2026-11-01'),false);assert.equal(validStatementRange('2026-02-30',''),false);
 assert.deepEqual(filterStatement(statementEntries(accounts,pets),{...emptyStatementFilters,from:'2026-11-03',through:'2026-11-01'}),[]);
});
test('CSV preserves signed numeric changes and quotes text/formulas without creating cells',()=>{
 const rows=statementEntries(accounts,pets).filter(e=>e.id==='b').map(e=>({...e,reason:' =SUM(1,2)\n"quoted"',pet:'@unsafe'}));
 const csv=statementCsv(rows,['Date','ID','Customer','Pet','Type','Change','Before','After','Note'],{added:'Added',correction:'Correction',terms:'Policy'});
 assert.ok(csv.startsWith('\ufeff'));assert.ok(csv.includes('"\'@unsafe"'));assert.ok(csv.includes('"Correction",-2,10,8'));assert.ok(csv.includes('"\' =SUM(1,2)\n""quoted"""'));assert.equal(rows[0].after,8);
});
