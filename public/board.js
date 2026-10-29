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
export function gameRows(rows){
 const groups=new Map();
 for(const row of rows){const key=JSON.stringify([row.eventId||row.event,row.bookKey||row.bookmaker]);if(!groups.has(key))groups.set(key,{...row,teams:new Map(),totals:[],props:[]});const game=groups.get(key);if(['Moneyline','Spread'].includes(row.market)){if(!game.teams.has(row.selection))game.teams.set(row.selection,{name:row.selection,moneylines:[],spreads:[]});game.teams.get(row.selection)[row.market==='Moneyline'?'moneylines':'spreads'].push(row);}else game[row.market==='Player prop'?'props':'totals'].push(row);}
 return [...groups.values()].map(game=>({...game,teams:[...game.teams.values()]}));
}
