import {matrix,quoteKey,roundedAllocation,csv} from './market.js';
import {compactRows,regionRows} from './board.js';
import {platforms} from './platforms.js';
import {opportunities} from './opportunities.js';
import {decimal,arb,bonus} from './math.js';
const demoData=[['NBA','Boston vs New York','Moneyline','Boston','—',-145],['NBA','Boston vs New York','Moneyline','New York','—',125],['NBA','Boston vs New York','Spread','Boston','−3.5',-110],['NBA','Boston vs New York','Total','Over','221.5',-110],['NBA','Boston vs New York','Player prop','Jayson Tatum · points over','27.5',-115],['NFL','Kansas City vs Buffalo','Moneyline','Kansas City','—',115],['NFL','Kansas City vs Buffalo','Moneyline','Buffalo','—',-135],['NFL','Kansas City vs Buffalo','Spread','Kansas City','+2.5',-110],['NFL','Kansas City vs Buffalo','Total','Under','48.5',-105],['NFL','Kansas City vs Buffalo','Player prop','Josh Allen · passing yards over','249.5',-115],['MLB','Los Angeles vs San Diego','Moneyline','Los Angeles','—',-160],['MLB','Los Angeles vs San Diego','Moneyline','San Diego','—',140]];
let data=[], live=true, requestId=0, liveRows=[], view='compact', shownRows=[], selectedQuote=null, quoteLookup=[], previousQuotes=new Map(), moves=new Map(), loading=false, refreshTimer=null;
const escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=n=>n.toLocaleString('en-US',{style:'currency',currency:'USD'}),pct=n=>(n*100).toFixed(2)+'%';
function price(r,withLine=false){
 const stamp=Date.parse(r.updatedAt),stale=!Number.isFinite(stamp)||Date.now()-stamp>300000||stamp>Date.now()+60000;
 const title=live?(Number.isFinite(stamp)?'Updated '+new Date(stamp).toLocaleString():'Timestamp unavailable'):'Illustrative demo';
 const index=quoteLookup.push(r)-1,move=live?moves.get(quoteKey(r)):null;
 return `<button type="button" class="quote" data-quote="${index}" title="${escape(title)} · inspect quote" aria-label="${escape(r.selection+' '+r.market+' '+r.odds+' '+r.bookmaker)}">${withLine?escape(r.market==='Spread'&&r.line>0?'+'+r.line:r.line)+' ':''}<b>${r.odds>0?'+':''}${r.odds}</b>${live&&stale?'<small>STALE / UNKNOWN</small>':''}${!withLine?'<small>'+pct(1/decimal(r.odds))+' implied</small>':''}${move?'<small class="movement">'+(move>0?'↑ improved':'↓ shortened')+'</small>':''}</button>`;
}
function render(){
 const query=document.querySelector('#search').value.toLowerCase(),sport=document.querySelector('#sport').value,market=document.querySelector('#market').value,side=document.querySelector('#side').value,book=document.getElementById('book').value,region=document.getElementById('region').value;
 const raw=live?liveRows:demoData.map(r=>({sport:r[0],event:r[1],market:r[2],selection:r[3],line:r[4],odds:r[5],bookmaker:'DraftKings',bookKey:'draftkings'}));
 quoteLookup=[];
 const scoped=regionRows(raw,region).filter(r=>(book==='All books'||r.bookmaker===book)&&(sport==='All sports'||r.sport===sport)&&(!document.getElementById('pregame').checked||!live||Date.parse(r.start)>Date.now()));
 const grouped=compactRows(scoped);
 const filtered=grouped.filter(r=>{
   const ml=r.moneylines[0],tag=ml?(ml.odds<0?'Favorite':ml.odds===100?'Even':'Underdog'):'';
   return (market==='All markets'||(market==='Moneyline'?r.moneylines.length:market==='Spread'?r.spreads.length:r.market===market))&&(side==='All sides'||side===tag)&&[r.event,r.selection,r.bookmaker].join(' ').toLowerCase().includes(query);
 });
 filtered.sort((a,b)=>document.getElementById('sort').value==='event'?a.event.localeCompare(b.event):(Date.parse(a.start)||0)-(Date.parse(b.start)||0)||a.event.localeCompare(b.event));
 shownRows=filtered.flatMap(r=>[...r.moneylines,...r.spreads,...r.other]);
 document.getElementById('boardmeta').textContent=`${filtered.length} team / selection rows · ${shownRows.length} quotes · ${new Set(shownRows.map(r=>r.bookmaker)).size} books · ${region==='oregon'?'Oregon confirmed coverage':'REFERENCE ONLY: Oregon availability not established'} · Click a price to inspect. Movement compares successive loaded snapshots only.`;
 if(view==='matrix'){renderMatrix(shownRows);return;}
 document.getElementById('boardhead').innerHTML='<tr><th>EVENT / BOOK</th><th>TEAM / SELECTION</th><th>MONEYLINE</th><th>SPREAD</th><th>TOTAL / PROP</th><th>SIDE</th></tr>';
 document.querySelector('#rows').innerHTML=filtered.map(r=>{
   const ml=r.moneylines[0],tag=ml?(ml.odds<0?'Favorite':ml.odds===100?'Even':'Underdog'):'—';
   return `<tr><td>${escape(r.event)}<small>${escape(r.sport)} · ${escape(r.bookmaker)}${r.start?' · '+escape(new Date(r.start).toLocaleString()):''}</small></td><td>${escape(r.selection)}</td><td>${r.moneylines.map(o=>price(o)).join('')||'—'}</td><td>${r.spreads.map(o=>price(o,true)).join('')||'—'}</td><td>${r.other.map(o=>price(o,true)).join('')||'—'}</td><td class="tag">${tag}</td></tr>`;
 }).join('')||'<tr><td colspan="6">No matching markets. Oregon mode shows confirmed coverage only; choose DraftKings or All books.</td></tr>';
}
for(const id of ['search','market','side','book','sort','pregame'])document.getElementById(id).addEventListener('input',render);
document.getElementById('region').addEventListener('input',()=>{render();renderCandidates();});
document.getElementById('sport').addEventListener('input',loadOdds);
document.getElementById('source').addEventListener('input',loadOdds);
document.getElementById('refresh').addEventListener('click',loadOdds);
document.querySelectorAll('[data-tab]').forEach(button=>button.addEventListener('click',()=>{document.querySelectorAll('main>section').forEach(s=>s.hidden=s.id!==button.dataset.tab);document.querySelectorAll('[data-tab]').forEach(b=>b.classList.toggle('active',b===button));document.querySelector('#location').textContent=button.textContent.slice(2).toUpperCase();}));
function calculate(kind){const f=document.getElementById(kind+'form'),out=document.getElementById(kind+'result'),v=new FormData(f);try{if(kind==='arb'){const r=roundedAllocation(v.get('a'),v.get('b'),v.get('stake'));out.innerHTML=`<span>MODELED NET RESULT</span><h3>${money(r.profit)}</h3><p>${r.profit>0?'Positive arbitrage in these inputs':'No positive arbitrage in these inputs'} · ${pct(r.roi)} return on cash staked.</p><p>Outcome A stake: <b>${money(r.first)}</b><br>Outcome B stake: <b>${money(r.second)}</b></p><p>Stakes are rounded to cents. Shown net is the lower of the two modeled settlement outcomes. Confirm sportsbook increments, rules, fees and limits.</p>`;}else{const r=bonus(v.get('a'),v.get('b'),v.get('stake'),v.has('returned'));out.innerHTML=`<span>MODELED CASH CONVERSION</span><h3>${money(r.conversion)}</h3><p>${pct(r.rate)} of the bonus face value.</p><p>Required cash hedge: <b>${money(r.hedge)}</b><br>If bonus wins: ${money(r.conversion)} net cash<br>If hedge wins: ${money(r.conversion)} net cash</p><p>Net cash excludes the free bonus face value and subtracts the hedge stake. Requires identical settlement and eligible bonus terms.</p>`;}}catch(e){out.textContent=e.message;}}
for(const kind of ['arb','bonus']){document.getElementById(kind+'form').addEventListener('submit',e=>{e.preventDefault();calculate(kind);});calculate(kind);}render();

async function loadOdds(){
  loading=true;const id=++requestId,source=document.getElementById('source'),sport=document.getElementById('sport'),status=document.getElementById('feedstatus'),notice=document.querySelector('.notice'),refresh=document.getElementById('refresh');
  live=source.value==='live';data=[];liveRows=[];renderCandidates();render();
  sport.options[0].disabled=live;
  if(!live){data=demoData;status.textContent='● Demo data';notice.textContent='Illustrative prices only. Not current odds.';refresh.disabled=false;loading=false;render();return;}
  if(sport.value==='All sports')sport.value='NBA';
  status.textContent='● Connecting';notice.textContent='Loading DraftKings prices…';refresh.disabled=true;
  try{
    const response=await fetch('/api/odds?sport='+encodeURIComponent(sport.value),{signal:AbortSignal.timeout(20000)}),body=await response.json();
    if(id!==requestId)return;
    if(!response.ok)throw Error(body.error||'Odds feed unavailable.');
    moves=new Map();
    for(const quote of body.rows){const old=previousQuotes.get(quoteKey(quote));if(old&&Date.parse(quote.updatedAt)>Date.parse(old.updatedAt)&&quote.odds!==old.odds)moves.set(quoteKey(quote),decimal(quote.odds)-decimal(old.odds));}
    previousQuotes=new Map(body.rows.map(r=>[quoteKey(r),r]));
    liveRows=body.rows;data=body.rows.map(r=>[r.sport,r.event,r.market,r.selection,r.line,r.odds,r.updatedAt,r.bookmaker]);renderCandidates();
    status.textContent='● Provider feed';notice.textContent=`${body.source} · sportsbook comparison · fetched ${new Date(body.fetchedAt).toLocaleString()}. Cached up to 60 seconds; provider timestamps shown per market. Prices over 5 minutes old are marked STALE. Props are not connected. ${data.length?'':'No sportsbook markets available for this sport.'}`;
    render();
  }catch(error){if(id!==requestId)return;status.textContent='● Feed unavailable';notice.textContent=error.name==='TimeoutError'?'Odds request timed out. Try refreshing.':error.message;data=[];render();}
  finally{if(id===requestId){refresh.disabled=false;loading=false;}}
}
loadOdds();

function renderCandidates(){
 const container=document.getElementById('candidates');
 if(!live){container.textContent='Demo mode: live opportunity scanning is disabled.';return;}
 if(document.getElementById('region').value==='oregon'){container.textContent='No cross-book sportsbook arbitrage is enabled for Oregon: DraftKings is the only confirmed online sportsbook in this workspace. Pick’em products are tracked separately. All-books reference mode can show research candidates, not Oregon-executable bets.';return;}
 const bank=Number(document.getElementById('scanbank').value),minimum=Number(document.getElementById('minroi').value),market=document.getElementById('scanmarket').value;
 if(!Number.isFinite(bank)||bank<1||!Number.isFinite(minimum)||minimum<0){container.textContent='Enter a positive total stake of at least $1 and a nonnegative minimum return.';return;}
 const candidates=opportunities(liveRows).map(r=>({...r,...roundedAllocation(r.a.odds,r.b.odds,bank)})).filter(r=>r.profit>0&&r.roi*100>=minimum&&(market==='All markets'||r.a.market===market));
 container.innerHTML=candidates.length?`<div class="tablewrap"><table><thead><tr><th>REFERENCE CANDIDATE</th><th>LEG A / STAKE</th><th>LEG B / STAKE</th><th>MIN. NET / RETURN</th></tr></thead><tbody>${candidates.map(r=>`<tr><td><strong>${escape(r.a.event)}</strong><small>${escape(r.a.market)} · reference only</small></td><td>${escape(r.a.bookmaker)} · ${escape(r.a.selection)} ${escape(r.a.line)}<small>${r.a.odds>0?'+':''}${r.a.odds} · stake ${money(r.first)}</small></td><td>${escape(r.b.bookmaker)} · ${escape(r.b.selection)} ${escape(r.b.line)}<small>${r.b.odds>0?'+':''}${r.b.odds} · stake ${money(r.second)}</small></td><td><b>${money(r.profit)} · ${pct(r.roi)}</b><small>If A: ${money(r.winA)} / if B: ${money(r.winB)}</small><small>Updated ${escape(new Date(r.a.updatedAt).toLocaleTimeString())} / ${escape(new Date(r.b.updatedAt).toLocaleTimeString())}</small></td></tr>`).join('')}</tbody></table></div>`:'No qualifying fresh candidates for the loaded sport and filters. Refresh the odds board to scan again.';

}
setInterval(()=>{render();renderCandidates();},30000);

document.getElementById('platformcards').innerHTML=platforms.map(p=>`<article><h3>${escape(p.name)}</h3><span class="pill">${escape(p.type)}</span><p>${escape(p.status)}</p><p class="muted">${escape(p.feed)}</p><p class="fine">${escape(p.note)}</p><a href="${p.url}" target="_blank" rel="noopener noreferrer">Operator / official source ↗</a></article>`).join('');
let picks=[];
try{const saved=JSON.parse(localStorage.getItem('edge-picks')||'[]');if(Array.isArray(saved))picks=saved.filter(p=>p&&typeof p.player==='string'&&typeof p.stat==='string'&&typeof p.platform==='string'&&Number.isFinite(p.line)&&['Higher','Lower'].includes(p.direction)).slice(-100);}catch{}
function showPicks(){document.getElementById('picklist').innerHTML=picks.map((p,i)=>`<div class="candidate"><strong>${escape(p.platform)} · ${escape(p.player)}</strong><p>${escape(p.stat)} · ${escape(p.direction)} ${p.line}</p><small>Manual note · ${escape(p.created||'date unknown')} · eligibility self-confirmed, not independently verified</small><button type="button" data-remove="${i}">Remove</button></div>`).join('')||'<p class="muted">No manual selections saved.</p>';}
function savePicks(){try{localStorage.setItem('edge-picks',JSON.stringify(picks));document.getElementById('pickstatus').textContent='Saved on this browser.';}catch{document.getElementById('pickstatus').textContent='Browser storage unavailable; notes last only while this page is open.';}showPicks();}
document.getElementById('pickform').addEventListener('submit',e=>{e.preventDefault();const f=new FormData(e.target),line=Number(f.get('line'));if(!f.has('eligible')||!Number.isFinite(line))return;picks.push({platform:f.get('platform'),player:f.get('player').trim(),stat:f.get('stat').trim(),line,direction:f.get('direction'),created:new Date().toLocaleString()});picks=picks.slice(-100);savePicks();e.target.reset();});
document.getElementById('picklist').addEventListener('click',e=>{const button=e.target.closest('[data-remove]');if(!button)return;picks.splice(Number(button.dataset.remove),1);savePicks();});showPicks();

function renderMatrix(rows){
 const books=[...new Set(rows.map(r=>r.bookmaker))].sort((a,b)=>a==='DraftKings'?-1:b==='DraftKings'?1:a.localeCompare(b));
 document.getElementById('boardhead').innerHTML='<tr><th>EVENT / SELECTION</th><th>MARKET / LINE</th>'+books.map(b=>'<th>'+escape(b)+'</th>').join('')+'</tr>';
 document.getElementById('rows').innerHTML=matrix(rows,Date.now(),live).map(r=>`<tr><td>${escape(r.event)}<small>${escape(r.selection)}</small></td><td>${escape(r.market)} ${escape(r.line)}</td>${books.map(book=>{const quotes=r.quotes.filter(q=>q.bookmaker===book);return '<td>'+quotes.map(q=>'<div class="'+(decimal(q.odds)===r.best?'bestquote':'')+'">'+price(q)+(decimal(q.odds)===r.best?'<small>BEST SHOWN</small>':'')+'</div>').join('')+(quotes.length?'':'—')+'</td>';}).join('')}</tr>`).join('')||'<tr><td>No matching quotes.</td></tr>';
}
for(const button of document.querySelectorAll('[data-view]'))button.addEventListener('click',()=>{view=button.dataset.view;document.querySelectorAll('[data-view]').forEach(b=>b.classList.toggle('selected',b===button));render();});
document.getElementById('rows').addEventListener('click',event=>{const button=event.target.closest('[data-quote]');if(!button)return;selectedQuote=quoteLookup[Number(button.dataset.quote)];const r=selectedQuote;if(!r)return;document.getElementById('detailbody').innerHTML=`<h3>${escape(r.selection)} · ${escape(r.market)} ${escape(r.line)}</h3><p>${escape(r.event)}</p><p>${escape(r.bookmaker)} · <b>${r.odds>0?'+':''}${r.odds}</b> · ${pct(1/decimal(r.odds))} implied probability</p><p>${live?'Provider update: '+escape(r.updatedAt?new Date(r.updatedAt).toLocaleString():'unknown'):'DEMO: illustrative price'}</p><p class="fine">${document.getElementById('region').value==='oregon'?'Oregon confirmed coverage.':'Reference price; Oregon access not established.'} Best shown means best among displayed prices for the identical market and line, not positive expected value.</p>`;document.getElementById('quotedetail').showModal();});
document.getElementById('closedetail').addEventListener('click',()=>document.getElementById('quotedetail').close());
for(const [id,form,field,tab] of [['usea','arbform','a','arbitrage'],['useb','arbform','b','arbitrage'],['usebonus','bonusform','a','bonus']])document.getElementById(id).addEventListener('click',()=>{if(!selectedQuote)return;document.getElementById(form).elements[field].value=selectedQuote.odds;calculate(form==='arbform'?'arb':'bonus');document.getElementById('quotedetail').close();document.querySelector('[data-tab='+tab+']').click();});
for(const id of ['scanbank','minroi','scanmarket'])document.getElementById(id).addEventListener('input',renderCandidates);
document.getElementById('export').addEventListener('click',()=>{const blob=new Blob([csv(shownRows)],{type:'text/csv;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='edge-'+(live?'provider':'demo')+'-'+document.getElementById('region').value+'-'+new Date().toISOString().slice(0,10)+'.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});
document.getElementById('autorefresh').addEventListener('change',event=>{clearInterval(refreshTimer);const seconds=Number(event.target.value);if(seconds)refreshTimer=setInterval(()=>{if(!document.hidden&&live&&!loading)loadOdds();},seconds*1000);document.getElementById('refreshnote').textContent=seconds?' Auto-refresh enabled; provider credits are consumed after cache expiry. Pauses while this tab is hidden.':' Auto-refresh disabled.';});
