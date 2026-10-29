export function compactRows(rows){
  const groups=new Map();
  for(const r of rows){
    const team=['Moneyline','Spread'].includes(r.market);
    const key=JSON.stringify([r.eventId||r.event,r.bookKey||r.bookmaker,team?'team':r.market,r.selection]);
    if(!groups.has(key))groups.set(key,{...r,moneylines:[],spreads:[],other:[]});
    groups.get(key)[team?(r.market==='Moneyline'?'moneylines':'spreads'):'other'].push(r);
  }
  return [...groups.values()];
}
export function regionRows(rows,region){return region==='oregon'?rows.filter(r=>r.bookKey==='draftkings'):rows;}
