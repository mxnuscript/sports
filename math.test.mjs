import test from 'node:test';
import assert from 'node:assert/strict';
import {decimal,arb,bonus} from './public/math.js';
test('American odds conversions and invalid inputs',()=>{assert.equal(decimal(-200),1.5);assert.equal(decimal(300),4);for(const n of [0,99,-99,Infinity,'bad'])assert.throws(()=>decimal(n));});
test('arbitrage allocates full bankroll and equalizes payouts',()=>{const r=arb(120,-110,100);assert.ok(Math.abs(r.first+r.second-100)<1e-9);assert.ok(Math.abs(r.first*decimal(120)-r.second*decimal(-110))<1e-9);assert.ok(r.profit>0);assert.ok(arb(-110,-110,100).profit<0);assert.throws(()=>arb(110,110,0));});
test('bonus conversion matches both settlement outcomes',()=>{for(const returned of [false,true]){const r=bonus(300,-330,100,returned);assert.ok(Math.abs((returned?400:300)-r.hedge-r.conversion)<1e-9);assert.ok(Math.abs(r.hedge*(decimal(-330)-1)-r.conversion)<1e-9);}});
