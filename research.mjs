import {FeedError} from './odds.mjs';
const PATHS={NBA:'basketball/nba',NFL:'football/nfl',MLB:'baseball/mlb'};
const site='https://site.api.espn.com/apis/site/v2/sports/';
const web='https://site.web.api.espn.com/apis/common/v3/sports/';
const clean=value=>String(value??'').slice(0,600);
export const nameKey=value=>String(value??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/^la /,'los angeles ').replace(/[^a-z0-9]/g,'');
export function matchEvent(quote,events){
 const names=quote.event.split(' vs ').map(nameKey).sort();
 const matches=events.filter(event=>{
  const state=event.status?.type?.state||event.competitions?.[0]?.status?.type?.state;if(state&&state!=='pre')return false;
  const teams=event.competitions?.[0]?.competitors?.map(c=>nameKey(c.team?.displayName)).sort();
  return teams?.length===2&&JSON.stringify(teams)===JSON.stringify(names)&&Math.abs(Date.parse(event.date)-Date.parse(quote.start))<=90*60000;
 });
 return matches.length===1?matches[0]:null;
}
export function summarizeMatchup(summary,quote,now=Date.now()){
 const competitors=summary.header?.competitions?.[0]?.competitors||[];
 const teams=competitors.map(c=>{
  const id=String(c.team?.id),recent=(summary.lastFiveGames||[]).find(t=>String(t.team?.id)===id)?.events||[];
  const games=recent.filter(g=>Date.parse(g.gameDate)<now&&['W','L','T'].includes(g.gameResult)).slice(0,5).map(g=>{
   const home=String(g.homeTeamId)===id;const ownRaw=home?g.homeTeamScore:g.awayTeamScore,againstRaw=home?g.awayTeamScore:g.homeTeamScore;const own=ownRaw===undefined||ownRaw===null||ownRaw===''?NaN:Number(ownRaw),against=againstRaw===undefined||againstRaw===null||againstRaw===''?NaN:Number(againstRaw);
   return {date:g.gameDate,opponent:clean(g.opponent?.displayName),result:g.gameResult,score:clean(g.score),pointsFor:Number.isFinite(own)?own:null,pointsAgainst:Number.isFinite(against)?against:null};
  });
  const measured=games.filter(g=>g.pointsFor!==null&&g.pointsAgainst!==null);
  const stats=(summary.boxscore?.teams||[]).find(t=>String(t.team?.id)===id)?.statistics||[];
  const injuries=(summary.injuries||[]).find(t=>String(t.team?.id)===id)?.injuries;
  return {id,name:clean(c.team?.displayName),homeAway:c.homeAway,record:(c.record||[]).map(r=>({scope:clean(r.type),record:clean(r.summary||r.displayValue)})),seasonStats:stats.slice(0,20).map(s=>({name:clean(s.name),label:clean(s.label||s.displayName),value:clean(s.displayValue)})),recentGames:games,recentSummary:measured.length?{sample:measured.length,wins:games.filter(g=>g.result==='W').length,losses:games.filter(g=>g.result==='L').length,pointsFor:measured.reduce((n,g)=>n+g.pointsFor,0)/measured.length,pointsAllowed:measured.reduce((n,g)=>n+g.pointsAgainst,0)/measured.length}:null,injuryCoverage:injuries?'reported list; absence does not confirm availability':'unavailable',injuries:(injuries||[]).slice(0,18).map(i=>({player:clean(i.athlete?.displayName),reportedStatus:clean(i.status?.name||i.status?.type||i.status),reportedAt:i.date||null,olderThan24h:!Number.isFinite(Date.parse(i.date))||now-Date.parse(i.date)>86400000,confirmedGameDayInactive:false,detail:clean(i.shortComment||i.details?.detail||i.details?.type)}))};
 });
 const headToHead=(summary.seasonseries||[]).flatMap(s=>(s.events||[]).filter(e=>e.statusType?.completed&&Date.parse(e.date)<now).map(e=>({date:e.date,seasonSeries:clean(s.title),teams:(e.competitors||[]).map(c=>({team:clean(c.team?.displayName),score:clean(c.score?.displayValue??c.score),winner:c.winner===true}))}))).slice(0,5);
 const leaders=(summary.leaders||[]).flatMap(t=>(t.leaders||[]).flatMap(category=>(category.leaders||[]).slice(0,1).map(l=>({id:String(l.athlete?.id||''),player:clean(l.athlete?.displayName),team:clean(t.team?.displayName),stat:clean(category.displayName||category.name),value:clean(l.displayValue)}))));
 return {eventId:quote.eventId,event:quote.event,start:quote.start,espnEventId:String(summary.header?.id||''),season:summary.header?.season||null,teams,headToHead,leaders,players:[],limitations:['Injury reports are third-party reports, not confirmed game-day inactives or starting lineups.','Recent-game samples are small and not adjusted for opponent strength. Source season types may be unspecified, including preseason or prior-season games. No defensive-versus-position model is available.','Retrieval time does not establish when season statistics were last updated.']};
}
export function playerOverview(data,player,now=Date.now()){
 const stats=data.statistics||{},splits=(stats.splits||[]).filter(s=>!['career','postseason'].includes(String(s.displayName).toLowerCase()));
 const season=splits.map(split=>({scope:clean(split.displayName),seasonYear:null,stats:(stats.names||[]).slice(0,18).map((name,i)=>({name:clean(name),label:clean(stats.displayNames?.[i]||stats.labels?.[i]||name),value:clean(split.stats?.[i])}))}));
 const log=data.gameLog||{},recent=(log.statistics||[]).flatMap(group=>(group.events||[]).flatMap(entry=>{
  const event=log.events?.[entry.eventId];if(!event||Date.parse(event.gameDate)>=now||!['W','L','T'].includes(event.gameResult))return [];
  return [{date:event.gameDate,opponent:clean(event.opponent?.displayName),result:event.gameResult,stats:(group.names||[]).slice(0,18).map((name,i)=>({name:clean(name),label:clean(group.displayNames?.[i]||name),value:clean(entry.stats?.[i])}))}];
 })).slice(0,5);
 return {...player,seasonStats:season,recentGames:recent,limitations:'Season year not explicitly supplied in this overview; current provider split must not be assumed to cover a specific year. No minutes projection or causal injury-impact estimate.'};
}
export function propHistory(player,quotes){
 const names={player_points:'points',player_rebounds:'totalRebounds',player_assists:'assists',player_threes:'threePointFieldGoalsMade',player_pass_yds:'passingYards',player_rush_yds:'rushingYards',player_reception_yds:'receivingYards',player_receptions:'receptions',batter_hits:'hits',batter_total_bases:'totalBases',pitcher_strikeouts:'strikeouts'};
 const markets=[...new Map(quotes.filter(q=>nameKey(q.player)===nameKey(player.player)).map(q=>[JSON.stringify([q.marketKey,q.line]),q])).values()];
 return markets.map(q=>{
  const values=player.recentGames.flatMap(game=>{const value=game.stats.find(s=>s.name===names[q.marketKey])?.value;if(value===undefined||value===null||String(value).trim()===''||!Number.isFinite(Number(value)))return [];return [Number(value)];});
  return {market:q.stat,line:q.line,sample:values.length,over:values.filter(v=>v>q.line).length,under:values.filter(v=>v<q.line).length,push:values.filter(v=>v===q.line).length,average:values.length?values.reduce((a,b)=>a+b,0)/values.length:null,note:'Historical sample only; not a win probability or forecast. Missing stats are excluded, not counted as zero.'};
 });
}
export function createResearch({fetcher=fetch,now=Date.now}={}){
 const cache=new Map(),pending=new Map();
 async function get(url,signal){
  const hit=cache.get(url);if(hit&&now()-hit.at<300000)return hit;
  if(pending.has(url))return pending.get(url);
  const task=(async()=>{let response;try{response=await fetcher(url,{signal,redirect:'error'});}catch{throw new Error('Research source could not be reached.');}if(!response.ok)throw new Error('Research source HTTP '+response.status);let data;try{data=await response.json();}catch{throw new Error('Research source returned invalid JSON.');}const value={data,at:now()};cache.set(url,value);if(cache.size>150)cache.delete(cache.keys().next().value);return value;})();pending.set(url,task);try{return await task;}finally{pending.delete(url);}
 }
 return async({sport,quotes,eventId})=>{
  if(!Object.hasOwn(PATHS,sport))throw new FeedError('Unsupported research sport.',400);
  const unique=[...new Map(quotes.map(q=>[q.eventId,q])).values()].filter(q=>!eventId||q.eventId===eventId).slice(0,4);
  const result={source:'ESPN public sports feeds',retrievedAt:new Date(now()).toISOString(),matchups:[],unmatched:[],warnings:[],sources:[],coverage:{maxGames:4,maxPlayers:6},limitations:['Public ESPN endpoints are unofficial integration surfaces and may change or be unavailable. No guaranteed completeness or game-day status confirmation.']};
  if(!unique.length)return result;
  const signal=AbortSignal.timeout(18000),path=PATHS[sport],dates=[...new Set(unique.flatMap(q=>{const d=new Date(q.start);if(!Number.isFinite(+d))return [];return [0,-86400000].map(offset=>new Date(+d+offset).toISOString().slice(0,10).replaceAll('-',''));}))].slice(0,6);
  const boards=await Promise.all(dates.map(async date=>{const url=site+path+'/scoreboard?dates='+date;try{const r=await get(url,signal);result.sources.push({url,retrievedAt:new Date(r.at).toISOString(),kind:'event matching'});return r.data.events||[];}catch(error){result.warnings.push(error.message);return [];}}));
  const events=[...new Map(boards.flat().map(e=>[e.id,e])).values()];
  await Promise.all(unique.map(async q=>{
   const event=matchEvent(q,events);if(!event){result.unmatched.push({eventId:q.eventId,event:q.event,reason:'No unique team-and-start-time match in source schedule.'});return;}
   const url=site+path+'/summary?event='+event.id;
   try{const r=await get(url,signal);if(String(r.data.header?.id)!==String(event.id))throw new Error('Research summary event identity did not match.');const matched=matchEvent(q,[{date:r.data.header.competitions?.[0]?.date||event.date,competitions:r.data.header.competitions}]);if(!matched)throw new Error('Research summary teams did not match.');const matchup=summarizeMatchup(r.data,q,now());matchup.retrievedAt=new Date(r.at).toISOString();result.matchups.push(matchup);result.sources.push({url,retrievedAt:matchup.retrievedAt,kind:'matchup, injuries, records, season stats'});}catch(error){result.unmatched.push({eventId:q.eventId,event:q.event,reason:error.message});}
  }));
  let remaining=6;
  for(const matchup of result.matchups){
   if(!remaining)break;
   const names=[...new Set(quotes.filter(q=>q.eventId===matchup.eventId&&q.player).map(q=>q.player))];
   let players=[];
   if(names.length){
    const rosters=await Promise.all(matchup.teams.map(async team=>{const url=site+path+'/teams/'+team.id+'/roster';try{const r=await get(url,signal);result.sources.push({url,retrievedAt:new Date(r.at).toISOString(),kind:'player identity'});const raw=r.data.athletes||[];return raw.flatMap(a=>a.items||[a]).map(a=>({id:String(a.id||''),player:clean(a.displayName),team:team.name}));}catch{return [];}}));
    players=names.slice(0,remaining).flatMap(name=>{const found=rosters.flat().filter(a=>nameKey(a.player)===nameKey(name)&&/^\d+$/.test(a.id));if(found.length!==1){result.warnings.push('Player identity unavailable or ambiguous: '+clean(name));return [];}return [found[0]];});
   }else {const leading=new Map();for(const player of matchup.leaders.filter(l=>/^\d+$/.test(l.id)))if(!leading.has(player.team))leading.set(player.team,player);players=[...leading.values()].slice(0,2);}
   players=players.slice(0,remaining);remaining-=players.length;
   await Promise.all(players.map(async player=>{const url=web+path+'/athletes/'+player.id+'/overview';try{const r=await get(url,signal),overview=playerOverview(r.data,player,now());matchup.players.push({...overview,propHistory:propHistory(overview,quotes.filter(q=>q.eventId===matchup.eventId&&q.market==='Player prop')),retrievedAt:new Date(r.at).toISOString()});result.sources.push({url,retrievedAt:new Date(r.at).toISOString(),kind:'player season and recent stats'});}catch{result.warnings.push('Player statistics unavailable: '+player.player);}}));
  }
  result.warnings=[...new Set(result.warnings)];return result;
 };
}
