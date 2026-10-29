export const SPORTS = {NBA:'basketball_nba',NFL:'americanfootball_nfl',MLB:'baseball_mlb'};
export const BOOKS=['draftkings','fanduel','betmgm','caesars','betrivers'];
export class FeedError extends Error { constructor(message,status=502){super(message);this.status=status;} }
export function normalize(events,sport){
  if(!Array.isArray(events))throw new FeedError('The odds provider returned an invalid response.');
  return events.flatMap(event=>(event.bookmakers||[]).filter(b=>BOOKS.includes(b.key)).flatMap(book=>(book.markets||[]).flatMap(market=>{
    const label={h2h:'Moneyline',spreads:'Spread',totals:'Total'}[market.key];
    if(!label)return [];
    return (market.outcomes||[]).filter(o=>Number.isFinite(o.price)&&Math.abs(o.price)>=100).map(o=>({sport,event:`${event.away_team} vs ${event.home_team}`,eventId:event.id,start:event.commence_time,market:label,selection:o.name,line:o.point??'—',odds:o.price,bookmaker:book.title||book.key,bookKey:book.key,outcomeCount:market.outcomes?.length,updatedAt:market.last_update||book.last_update||null}));
  })));
}
export function createFeed({key=()=>process.env.ODDS_API_KEY,fetcher=fetch,now=Date.now}={}){
  const cache=new Map(),pending=new Map();
  return async sport=>{
    if(!SPORTS[sport])throw new FeedError('Choose NBA, NFL, or MLB.',400);
    if(!key())throw new FeedError('Live odds need ODDS_API_KEY in server environment settings. Demo mode is available separately.',503);
    const hit=cache.get(sport);if(hit&&now()-hit.time<60000)return hit.value;
    if(pending.has(sport))return pending.get(sport);
    const request=(async()=>{
      const url=new URL(`https://api.the-odds-api.com/v4/sports/${SPORTS[sport]}/odds/`);
      url.search=new URLSearchParams({apiKey:key(),regions:'us',bookmakers:BOOKS.join(','),markets:'h2h,spreads,totals',oddsFormat:'american',dateFormat:'iso'});
      let response;try{response=await fetcher(url,{signal:AbortSignal.timeout(15000),redirect:'error'});}catch{throw new FeedError('Unable to reach the odds provider. Check network access and try again.');}
      if(!response.ok){const status=response.status;throw new FeedError(status===401||status===403?'The provider rejected the API key or subscription.':status===429?'Odds provider quota or rate limit reached. Try again later.':'The odds provider is unavailable.',status===429?429:502);}
      let events;try{events=await response.json();}catch{throw new FeedError('The odds provider returned invalid JSON.');}
      const value={source:'The Odds API',bookmaker:'Multiple sportsbooks',sport,fetchedAt:new Date(now()).toISOString(),rows:normalize(events,sport),remaining:response.headers.get('x-requests-remaining'),propsAvailable:false};
      cache.set(sport,{time:now(),value});return value;
    })();
    pending.set(sport,request);try{return await request;}finally{pending.delete(sport);}
  };
}
