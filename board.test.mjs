import test from 'node:test';
import assert from 'node:assert/strict';
import {compactRows,regionRows} from './public/board.js';
const base={eventId:'event1',event:'A vs B',bookKey:'draftkings',bookmaker:'DraftKings',selection:'A'};
test('moneylines and spreads share a team row without losing alternate lines',()=>{const rows=compactRows([{...base,market:'Moneyline',odds:-120},{...base,market:'Spread',line:-1.5,odds:-110},{...base,market:'Spread',line:-2.5,odds:120},{...base,selection:'B',market:'Moneyline',odds:110}]);assert.equal(rows.length,2);assert.equal(rows[0].moneylines.length,1);assert.deepEqual(rows[0].spreads.map(r=>r.line),[-1.5,-2.5]);});
test('different events, books and totals remain separate',()=>{const ml={...base,market:'Moneyline',odds:110};const rows=compactRows([ml,{...ml,bookKey:'fanduel'},{...ml,eventId:'event2'},{...base,market:'Total',selection:'Over',line:222.5,odds:-110}]);assert.equal(rows.length,4);assert.equal(rows[3].other.length,1);});
test('Oregon scope admits confirmed coverage only; reference scope preserves feed',()=>{const rows=[base,{...base,bookKey:'fanduel'},{...base,bookKey:'betr'}];assert.deepEqual(regionRows(rows,'oregon'),[base]);assert.equal(regionRows(rows,'reference').length,3);});
