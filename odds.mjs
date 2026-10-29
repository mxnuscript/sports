export const SPORTS = {NBA:'basketball_nba',NFL:'americanfootball_nfl',MLB:'baseball_mlb'};
export const CORE_BOOKS=['draftkings','fanduel','betmgm','williamhill_us','betrivers'];
export const BOOKS=[...CORE_BOOKS,'rebet','underdog','prizepicks'];
export const PROP_BOOKS=['draftkings','underdog','prizepicks','rebet'];
export const PROP_MARKETS={NBA:{player_points:'Points',player_rebounds:'Rebounds',player_assists:'Assists',player_threes:'Made threes'},NFL:{player_pass_yds:'Passing yards',player_rush_yds:'Rushing yards',player_reception_yds:'Receiving yards',player_receptions:'Receptions'},MLB:{batter_hits:'Hits',batter_total_bases:'Total bases',pitcher_strikeouts:'Pitcher strikeouts'}};
export class FeedError extends Error { constructor(message,status=502){super(message);this.status=status;} }
export function normalize(events,sport){
  if(!Array.isArray(events))throw new FeedError('The odds provider returned an invalid response.');
  return events.flatMap(event=>(event.bookmakers||[]).filter(b=>BOOKS.includes(b.key)).flatMap(book=>(book.markets||[]).flatMap(market=>{
    const alternateProp=market.key.endsWith('_alternate'),baseKey=alternateProp?market.key.slice(0,-10):market.key;
    const prop=PROP_MARKETS[sport]?.[baseKey];
    const productType=['underdog','prizepicks'].includes(book.key)?'dfs':'sportsbook';
    const label=prop?'Player prop':{h2h:'Moneyline',spreads:'Spread',alternate_spreads:'Spread',totals:'Total',alternate_totals:'Total'}[market.key];
    if(!label)return [];
    return (market.outcomes||[]).filter(o=>Number.isFinite(o.price)&&Math.abs(o.price)>=100).map(o=>({sport,event:`${event.away_team} vs ${event.home_team}`,eventId:event.id,start:event.commence_time,market:label,marketKey:market.key.replace('alternate_',''),alternate:market.key.startsWith('alternate_')||alternateProp,productType,indicative:productType==='dfs',variant:alternateProp?'non-default / special selection':'standard',eligibility:book.key==='rebet'?'user_reported':null,stat:prop||null,player:o.description||null,selection:prop?`${o.description||'Unknown player'} · ${o.name}`:o.name,line:o.point??'—',odds:o.price,bookmaker:book.title||book.key,bookKey:book.key,outcomeCount:market.key.startsWith('alternate_')?2:market.outcomes?.length,updatedAt:market.last_update||book.last_update||null}));
  })));
}
export function createFeed({key=()=>process.env.ODDS_API_KEY,fetcher=fetch,now=Date.now}={}){
  const cache=new Map(),pending=new Map();
  const feed=async sport=>{
    if(!Object.hasOwn(SPORTS,sport))throw new FeedError('Choose NBA, NFL, or MLB.',400);
    if(!key())throw new FeedError('Live odds need ODDS_API_KEY in server environment settings. Demo mode is available separately.',503);
    const hit=cache.get(sport);if(hit&&now()-hit.time<60000)return hit.value;
    if(pending.has(sport))return pending.get(sport);
    const request=(async()=>{
      const url=new URL(`https://api.the-odds-api.com/v4/sports/${SPORTS[sport]}/odds/`);
      url.search=new URLSearchParams({apiKey:key(),regions:'us',bookmakers:CORE_BOOKS.join(','),markets:'h2h,spreads,totals',oddsFormat:'american',dateFormat:'iso'});
      let response;try{response=await fetcher(url,{signal:AbortSignal.timeout(15000),redirect:'error'});}catch{throw new FeedError('Unable to reach the odds provider. Check network access and try again.');}
      if(!response.ok){const status=response.status;throw new FeedError(status===401||status===403?'The provider rejected the API key or subscription.':status===429?'Odds provider quota or rate limit reached. Try again later.':'The odds provider is unavailable.',status===429?429:502);}
      let events;try{events=await response.json();}catch{throw new FeedError('The odds provider returned invalid JSON.');}
      const value={source:'The Odds API',bookmaker:'Multiple sportsbooks',sport,fetchedAt:new Date(now()).toISOString(),rows:normalize(events,sport),events:events.map(e=>({id:e.id,label:`${e.away_team} vs ${e.home_team}`,start:e.commence_time})),propMarkets:PROP_MARKETS[sport],remaining:response.headers.get('x-requests-remaining'),propsSupported:true};
      cache.set(sport,{time:now(),value});return value;
    })();
    pending.set(sport,request);try{return await request;}finally{pending.delete(sport);}
  };
  const propCache=new Map(),propPending=new Map();
  feed.alternates=(sport,event)=>feed.props(sport,event,'alternate_spreads,alternate_totals');
  feed.props=async(sport,event,market,book='draftkings')=>{
    const baseMarket=typeof market==='string'&&market.endsWith('_alternate')?market.slice(0,-10):market;
    if(typeof market!=='string'||(market.endsWith('_alternate')&&!['underdog','prizepicks'].includes(book)))throw new FeedError('Select a supported market / platform combination.',400);
    if(!Object.hasOwn(PROP_MARKETS,sport)||!(Object.hasOwn(PROP_MARKETS[sport],baseMarket)||market==='alternate_spreads,alternate_totals')||typeof event!=='string'||!/^[a-f0-9]{32}$/.test(event))throw new FeedError('Select a valid sport, event and prop market.',400);
    if(!PROP_BOOKS.includes(book)||(market==='alternate_spreads,alternate_totals'&&book!=='draftkings'))throw new FeedError('Select a supported prop platform.',400);
    if(!key())throw new FeedError('Configure ODDS_API_KEY to load player props.',503);
    const cacheKey=[sport,event,market,book].join(':'),hit=propCache.get(cacheKey);if(hit&&now()-hit.time<60000)return hit.value;if(propPending.has(cacheKey))return propPending.get(cacheKey);
    const task=(async()=>{
      const snapshot=await feed(sport),selected=snapshot.events.find(e=>e.id===event);
      if(!selected||Date.parse(selected.start)<=now())throw new FeedError('Choose an upcoming event from the current odds board.',400);
      const url=new URL(`https://api.the-odds-api.com/v4/sports/${SPORTS[sport]}/events/${event}/odds`);
      url.search=new URLSearchParams({apiKey:key(),bookmakers:book,markets:market,oddsFormat:'american',dateFormat:'iso'});
      let response;try{response=await fetcher(url,{signal:AbortSignal.timeout(15000),redirect:'error'});}catch{throw new FeedError('Player prop provider could not be reached.');}
      if(!response.ok)throw new FeedError(response.status===401||response.status===403?'Your odds plan or key does not allow this platform / market. ReBet requires a paid plan.':response.status===422?'This prop market is unsupported for the selected event.':response.status===429?'Player prop quota or rate limit reached.':`Player prop feed returned HTTP ${response.status}.`,response.status===429?429:502);
      let eventData;try{eventData=await response.json();}catch{throw new FeedError('Player prop provider returned invalid JSON.');}
      if(!eventData||eventData.id!==event||!Array.isArray(eventData.bookmakers))throw new FeedError('Player prop provider returned an unexpected event.');
      const value={rows:normalize([eventData],sport),fetchedAt:new Date(now()).toISOString(),market,stat:PROP_MARKETS[sport][baseMarket]||'Alternate spreads and totals',book,requestedBook:book,event:selected,remaining:response.headers.get('x-requests-remaining')};
      propCache.set(cacheKey,{time:now(),value});if(propCache.size>50)propCache.delete(propCache.keys().next().value);return value;
    })();propPending.set(cacheKey,task);try{return await task;}finally{propPending.delete(cacheKey);}
  };
  const bookCache=new Map();
  feed.book=async(sport,book)=>{
    if(!Object.hasOwn(SPORTS,sport)||book!=='rebet')throw new FeedError('Select the supported ReBet feed and sport.',400);
    if(!key())throw new FeedError('Configure ODDS_API_KEY.',503);
    const cacheKey=sport+book,hit=bookCache.get(cacheKey);if(hit&&now()-hit.time<60000)return hit.value;
    const url=new URL(`https://api.the-odds-api.com/v4/sports/${SPORTS[sport]}/odds/`);url.search=new URLSearchParams({apiKey:key(),bookmakers:book,markets:'h2h,spreads,totals',oddsFormat:'american',dateFormat:'iso'});
    let response;try{response=await fetcher(url,{signal:AbortSignal.timeout(15000),redirect:'error'});}catch{throw new FeedError('ReBet feed could not be reached.');}
    if(!response.ok)throw new FeedError(response.status===401||response.status===403?'ReBet coverage requires a paid odds subscription with access.':response.status===429?'ReBet odds quota or rate limit reached.':`ReBet provider HTTP ${response.status}.`,response.status===429?429:502);
    let events;try{events=await response.json();}catch{throw new FeedError('ReBet provider returned invalid JSON.');}
    const value={rows:normalize(events,sport),fetchedAt:new Date(now()).toISOString(),book};bookCache.set(cacheKey,{time:now(),value});return value;
  };

  return feed;

}
