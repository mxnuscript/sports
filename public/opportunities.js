import {arb} from './math.js';
// Candidates require independent verification of settlement rules and availability.
export function opportunities(rows,now=Date.now()){
  const fresh=rows.filter(r=>!r.indicative&&(!r.productType||r.productType==='sportsbook')&&r.eventId&&r.outcomeCount===2&&Number.isFinite(r.odds)&&Math.abs(r.odds)>=100&&Number.isFinite(Date.parse(r.updatedAt))&&now-Date.parse(r.updatedAt)>=-60000&&now-Date.parse(r.updatedAt)<=300000&&Date.parse(r.start)>now);
  const groups=new Map();
  for(const r of fresh){const key=JSON.stringify([r.eventId,r.market]);if(!groups.has(key))groups.set(key,[]);groups.get(key).push(r);}
  const result=[];
  for(const list of groups.values())for(let i=0;i<list.length;i++)for(let j=i+1;j<list.length;j++){
    const a=list[i],b=list[j];
    if(a.bookKey===b.bookKey||(![a.bookKey,b.bookKey].includes('draftkings'))||a.selection===b.selection)continue;
    if(Math.abs(Date.parse(a.updatedAt)-Date.parse(b.updatedAt))>60000)continue;
    if(a.market==='Spread'&&!(Number.isFinite(a.line)&&Number.isFinite(b.line)&&a.line===-b.line&&Math.abs(a.line%1)===0.5))continue;
    if(a.market==='Total'&&!(a.line===b.line&&Number.isFinite(a.line)&&Math.abs(a.line%1)===0.5&&[a.selection,b.selection].sort().join(',')==='Over,Under'))continue;
    if(!['Moneyline','Spread','Total'].includes(a.market))continue;
    const allocation=arb(a.odds,b.odds,100);
    if(allocation.profit>0)result.push({a,b,...allocation});
  }
  return result.sort((a,b)=>b.roi-a.roi);
}
