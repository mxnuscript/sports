import {decimal,amount} from './math.js';
export function evaluateSlip(legs,stake,now=Date.now()){
 const cash=amount(stake),problems=[];
 if(legs.length<2||legs.length>6)problems.push('Choose 2–6 legs.');
 if(new Set(legs.map(q=>q.eventId)).size!==legs.length||legs.some(q=>!q.eventId))problems.push('Each leg must be from a distinct event; same-game pricing is not modeled.');
 if(new Set(legs.map(q=>q.bookKey)).size!==1)problems.push('A sportsbook parlay must use one sportsbook.');
 if(legs.some(q=>q.bookKey!=='draftkings'))problems.push('Only DraftKings is enabled for Oregon in this workspace.');
 if(legs.some(q=>Date.parse(q.start)<=now||!Number.isFinite(Date.parse(q.start))))problems.push('A game has started or its start time is unknown.');
 if(legs.some(q=>!Number.isFinite(Date.parse(q.updatedAt))||now-Date.parse(q.updatedAt)>300000||Date.parse(q.updatedAt)>now+60000))problems.push('One or more prices are stale or undated. Re-add fresh quotes.');
 const combined=legs.reduce((n,q)=>n*decimal(q.odds),1);
 return {problems,valid:problems.length===0,decimal:combined,return:cash*combined,profit:cash*(combined-1),breakEven:1/combined};
}
