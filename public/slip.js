import {evaluateSlip} from './slip-math.js';
import {quoteKey} from './market.js';
const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=value=>value.toLocaleString('en-US',{style:'currency',currency:'USD'});
let legs=[];
try{const stored=JSON.parse(localStorage.getItem('edge-slip')||'[]');if(Array.isArray(stored))legs=stored.filter(q=>q&&typeof q.event==='string'&&typeof q.selection==='string'&&Number.isFinite(q.odds)&&Math.abs(q.odds)>=100).slice(0,6);}catch{}
function save(){try{localStorage.setItem('edge-slip',JSON.stringify(legs));}catch{}renderSlip();}
export function addToSlip(quote){
 const status=document.getElementById('slipstatus');
 const existing=legs.findIndex(q=>quoteKey(q)===quoteKey(quote));if(existing>=0){legs[existing]={...quote};save();status.textContent='Selection refreshed from the clicked price snapshot.';return;}
 if(legs.length>=6){status.textContent='The illustrative builder supports up to six legs.';return;}
 if(legs.some(q=>q.eventId===quote.eventId)){status.textContent='Remove the other leg from this game first. Same-game parlay prices require a sportsbook quote.';return;}
 legs.push({...quote});save();status.textContent='Snapshot added. Quotes expire; verify prices and offered combinations in DraftKings.';
}
export function renderSlip(){
 const target=document.getElementById('sliplegs');if(!target)return;
 target.innerHTML=legs.map((q,i)=>`<div class="slipleg"><div><strong>${escape(q.selection)} · ${escape(q.stat||q.market)} ${escape(q.line)}</strong><small>${escape(q.event)} · ${escape(q.bookmaker)} · ${q.odds>0?'+':''}${q.odds} · ${escape(q.updatedAt?new Date(q.updatedAt).toLocaleString():'date unknown')}</small></div><button class="subtle" data-slipremove="${i}">Remove</button></div>`).join('')||'<p class="muted">Click an odds price and choose Add to bet slip.</p>';
 const result=document.getElementById('slipresult');try{const r=evaluateSlip(legs,document.getElementById('slipstake').value);result.innerHTML=r.valid?`<h3>${r.decimal.toFixed(3)}× illustrated payout</h3><p>Return ${money(r.return)} · net ${money(r.profit)} if all legs win · loses the stake if any leg loses, before voids.</p><p>Price-derived break-even ${(r.breakEven*100).toFixed(2)}%, not a forecast probability.</p>`:'<p>'+r.problems.map(escape).join('<br>')+'</p>';}catch(error){result.textContent=error.message;}
}
export function setupSlip(){
 document.getElementById('slipstake').addEventListener('input',renderSlip);
 document.getElementById('sliplegs').addEventListener('click',event=>{const button=event.target.closest('[data-slipremove]');if(!button)return;legs.splice(Number(button.dataset.slipremove),1);save();});
 document.getElementById('clearslip').addEventListener('click',()=>{legs=[];save();});
 setInterval(renderSlip,30000);renderSlip();
}
