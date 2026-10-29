import test from 'node:test';
import assert from 'node:assert/strict';
import {matrix,roundedAllocation,csv} from './public/market.js';
const base={eventId:'one',market:'Spread',selection:'A',line:-3.5,odds:110,bookKey:'draftkings'};
test('comparison groups only identical market lines across books',()=>{const groups=matrix([base,{...base,bookKey:'fanduel',odds:120},{...base,line:-4.5,odds:140}]);assert.equal(groups.length,2);assert.equal(groups[0].quotes.length,2);assert.equal(groups[0].best,2.2);});
test('stale higher prices do not win live best-price highlighting',()=>{const now=Date.now();const [r]=matrix([{...base,updatedAt:new Date(now).toISOString()},{...base,odds:200,updatedAt:new Date(now-300001).toISOString()}],now,true);assert.equal(r.best,2.1);});
test('rounded stakes sum to bankroll and report worst actual cash outcome',()=>{const r=roundedAllocation(110,125,123.45);assert.ok(Math.abs(r.first+r.second-123.45)<1e-8);assert.equal(r.profit,Math.min(r.winA,r.winB));assert.ok(r.profit>0);assert.throws(()=>roundedAllocation(110,110,0));assert.ok(roundedAllocation(-110,-110,100).profit<0);});
test('CSV escapes quotes, commas, newlines and formula-leading cells',()=>{const result=csv([{event:'A, "B"',selection:'=bad()',odds:-110}]);assert.ok(result.includes('"A, ""B"""'));assert.ok(result.includes('"\'=bad()"'));assert.ok(result.includes('"\'-110"'));});
