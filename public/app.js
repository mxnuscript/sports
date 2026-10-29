import {opportunities} from './opportunities.js';
import {decimal,arb,bonus} from './math.js';
const demoData=[['NBA','Boston vs New York','Moneyline','Boston','—',-145],['NBA','Boston vs New York','Moneyline','New York','—',125],['NBA','Boston vs New York','Spread','Boston','−3.5',-110],['NBA','Boston vs New York','Total','Over','221.5',-110],['NBA','Boston vs New York','Player prop','Jayson Tatum · points over','27.5',-115],['NFL','Kansas City vs Buffalo','Moneyline','Kansas City','—',115],['NFL','Kansas City vs Buffalo','Moneyline','Buffalo','—',-135],['NFL','Kansas City vs Buffalo','Spread','Kansas City','+2.5',-110],['NFL','Kansas City vs Buffalo','Total','Under','48.5',-105],['NFL','Kansas City vs Buffalo','Player prop','Josh Allen · passing yards over','249.5',-115],['MLB','Los Angeles vs San Diego','Moneyline','Los Angeles','—',-160],['MLB','Los Angeles vs San Diego','Moneyline','San Diego','—',140]];
let data=[], live=true, requestId=0, liveRows=[];
const escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=n=>n.toLocaleString('en-US',{style:'currency',currency:'USD'}),pct=n=>(n*100).toFixed(2)+'%';
function render(){const query=document.querySelector('#search').value.toLowerCase(),sport=document.querySelector('#sport').value,market=document.querySelector('#market').value,side=document.querySelector('#side').value;const book=document.getElementById('book').value;const filtered=data.filter(r=>(book==='All books'||(r[7]||'DraftKings')===book)&&(sport==='All sports'||r[0]===sport)&&(market==='All markets'||r[2]===market)&&(side==='All sides'||r[2]==='Moneyline'&&(side==='Favorite'?r[5]<0:r[5]>0))&&r.join(' ').toLowerCase().includes(query));document.querySelector('#rows').innerHTML=filtered.map(r=>`<tr><td>${escape(r[1])}<small>${escape(r[0])} · ${escape(r[2])} · ${live?escape(r[6]?'Updated '+new Date(r[6]).toLocaleString()+(Date.now()-Date.parse(r[6])>300000?' · STALE':''):'Timestamp unavailable'):'ILLUSTRATIVE'}</small></td><td>${escape(r[3])}</td><td>${escape(r[4])}</td><td><small>${escape(r[7]||'DraftKings')}</small><span class="price">${r[5]>0?'+':''}${r[5]}</span></td><td>${pct(1/decimal(r[5]))}</td><td class="tag">${r[2]==='Moneyline'?(r[5]<0?'Favorite':'Underdog'):'—'}</td></tr>`).join('')||'<tr><td colspan="6">No matching markets. Live mode never substitutes demo prices.</td></tr>';}
for(const id of ['search','market','side','book'])document.getElementById(id).addEventListener('input',render);
document.getElementById('sport').addEventListener('input',loadOdds);
document.getElementById('source').addEventListener('input',loadOdds);
document.getElementById('refresh').addEventListener('click',loadOdds);
document.querySelectorAll('[data-tab]').forEach(button=>button.addEventListener('click',()=>{document.querySelectorAll('main>section').forEach(s=>s.hidden=s.id!==button.dataset.tab);document.querySelectorAll('[data-tab]').forEach(b=>b.classList.toggle('active',b===button));document.querySelector('#location').textContent=button.textContent.slice(2).toUpperCase();}));
function calculate(kind){const f=document.getElementById(kind+'form'),out=document.getElementById(kind+'result'),v=new FormData(f);try{if(kind==='arb'){const r=arb(v.get('a'),v.get('b'),v.get('stake'));out.innerHTML=`<span>MODELED NET RESULT</span><h3>${money(r.profit)}</h3><p>${r.profit>0?'Positive arbitrage in these inputs':'No positive arbitrage in these inputs'} · ${pct(r.roi)} return on cash staked.</p><p>Outcome A stake: <b>${money(r.first)}</b><br>Outcome B stake: <b>${money(r.second)}</b></p><p>Allocations are rounded for display. Recalculate with executable stake increments before placing any bet.</p>`;}else{const r=bonus(v.get('a'),v.get('b'),v.get('stake'),v.has('returned'));out.innerHTML=`<span>MODELED CASH CONVERSION</span><h3>${money(r.conversion)}</h3><p>${pct(r.rate)} of the bonus face value.</p><p>Required cash hedge: <b>${money(r.hedge)}</b><br>If bonus wins: ${money(r.conversion)} net cash<br>If hedge wins: ${money(r.conversion)} net cash</p><p>Net cash excludes the free bonus face value and subtracts the hedge stake. Requires identical settlement and eligible bonus terms.</p>`;}}catch(e){out.textContent=e.message;}}
for(const kind of ['arb','bonus']){document.getElementById(kind+'form').addEventListener('submit',e=>{e.preventDefault();calculate(kind);});calculate(kind);}render();

async function loadOdds(){
  const id=++requestId,source=document.getElementById('source'),sport=document.getElementById('sport'),status=document.getElementById('feedstatus'),notice=document.querySelector('.notice'),refresh=document.getElementById('refresh');
  live=source.value==='live';data=[];liveRows=[];renderCandidates();render();
  sport.options[0].disabled=live;
  if(!live){data=demoData;status.textContent='● Demo data';notice.textContent='Illustrative prices only. Not current odds.';refresh.disabled=false;render();return;}
  if(sport.value==='All sports')sport.value='NBA';
  status.textContent='● Connecting';notice.textContent='Loading DraftKings prices…';refresh.disabled=true;
  try{
    const response=await fetch('/api/odds?sport='+encodeURIComponent(sport.value),{signal:AbortSignal.timeout(20000)}),body=await response.json();
    if(id!==requestId)return;
    if(!response.ok)throw Error(body.error||'Odds feed unavailable.');
    liveRows=body.rows;data=body.rows.map(r=>[r.sport,r.event,r.market,r.selection,r.line,r.odds,r.updatedAt,r.bookmaker]);renderCandidates();
    status.textContent='● Provider feed';notice.textContent=`${body.source} · sportsbook comparison · fetched ${new Date(body.fetchedAt).toLocaleString()}. Cached up to 60 seconds; provider timestamps shown per market. Prices over 5 minutes old are marked STALE. Props are not connected. ${data.length?'':'No sportsbook markets available for this sport.'}`;
    render();
  }catch(error){if(id!==requestId)return;status.textContent='● Feed unavailable';notice.textContent=error.name==='TimeoutError'?'Odds request timed out. Try refreshing.':error.message;data=[];render();}
  finally{if(id===requestId)refresh.disabled=false;}
}
loadOdds();

function renderCandidates(){
 const container=document.getElementById('candidates');
 if(!live){container.textContent='Demo mode: live opportunity scanning is disabled.';return;}
 const candidates=opportunities(liveRows);
 container.innerHTML=candidates.map(r=>`<div class="candidate"><strong>${escape(r.a.event)} · ${escape(r.a.market)}</strong><p>${escape(r.a.bookmaker)}: ${escape(r.a.selection)} ${escape(r.a.line)} (${r.a.odds>0?'+':''}${r.a.odds}) — ${money(r.first)}<br>${escape(r.b.bookmaker)}: ${escape(r.b.selection)} ${escape(r.b.line)} (${r.b.odds>0?'+':''}${r.b.odds}) — ${money(r.second)}</p><b>${pct(r.roi)} modeled return · ${money(r.profit)} per $100</b><small>Updated ${escape(new Date(r.a.updatedAt).toLocaleString())} / ${escape(new Date(r.b.updatedAt).toLocaleString())}. Confirm prices, rounding, limits, and rules.</small></div>`).join('')||'No qualifying fresh candidates for the loaded sport. Refresh the odds board to scan again.';
}
setInterval(()=>{render();renderCandidates();},30000);
