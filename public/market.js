import {decimal,arb} from './math.js';
export const quoteKey=r=>JSON.stringify([r.eventId||r.event,r.bookKey,r.marketKey||r.market,r.selection,r.line]);
export function matrix(rows,now=Date.now(),requireFresh=false){
 const groups=new Map();
 for(const r of rows){const key=JSON.stringify([r.eventId||r.event,r.marketKey||r.market,r.selection,r.line]);if(!groups.has(key))groups.set(key,{...r,quotes:[]});groups.get(key).quotes.push(r);}
 return [...groups.values()].map(r=>({...r,best:Math.max(...r.quotes.filter(q=>(!q.indicative&&(!q.productType||q.productType==='sportsbook'))&&(!requireFresh||(now-Date.parse(q.updatedAt)>=-60000&&now-Date.parse(q.updatedAt)<=300000))).map(q=>decimal(q.odds)))}));
}
export function roundedAllocation(a,b,bank){
 const total=Math.round(Number(bank)*100)/100,allocation=arb(a,b,total),first=Math.round(allocation.first*100)/100,second=Math.round((total-first)*100)/100;
 const winA=first*decimal(a)-first-second,winB=second*decimal(b)-first-second;
 return {first,second,winA,winB,profit:Math.min(winA,winB),roi:Math.min(winA,winB)/total};
}
export function csv(rows){
 const cols=['sport','event','start','market','selection','line','bookmaker','odds','updatedAt'];
 const safe=v=>'"'+String(v??'').replace(/^[=+@\-\t\r]/,"'$&").replaceAll('"','""')+'"';
 return [cols.join(','),...rows.map(r=>cols.map(c=>safe(r[c])).join(','))].join('\r\n');
}
