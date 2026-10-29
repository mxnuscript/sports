export function propComparison(rows,now=Date.now(),freshOnly=true){
 const groups=new Map();
 for(const row of rows){
  if(freshOnly&&(!Number.isFinite(Date.parse(row.updatedAt))||now-Date.parse(row.updatedAt)>300000||Date.parse(row.updatedAt)>now+60000))continue;
  const key=JSON.stringify([row.eventId,row.player,row.marketKey||row.stat]);
  if(!groups.has(key))groups.set(key,{...row,books:new Map()});
  const group=groups.get(key);if(!group.books.has(row.bookKey))group.books.set(row.bookKey,{key:row.bookKey,name:row.bookmaker,quotes:[]});group.books.get(row.bookKey).quotes.push(row);
 }
 return [...groups.values()].map(group=>{const books=[...group.books.values()].map(book=>({...book,lines:[...new Set(book.quotes.map(q=>q.line).filter(Number.isFinite))].sort((a,b)=>a-b)}));const comparable=books.length>=2&&books.every(b=>b.lines.length===1)&&!books.some(b=>b.quotes.some(q=>q.alternate));const lines=books.map(b=>b.lines[0]);return {...group,books,gap:comparable?Math.max(...lines)-Math.min(...lines):null};}).sort((a,b)=>(b.gap??-1)-(a.gap??-1)||String(a.player).localeCompare(String(b.player)));
}
export function payoutScenario(stake,multipliers,probability=null){
 const cash=Number(stake),legs=multipliers.length-1;
 if(!Number.isFinite(cash)||cash<=0)throw Error('Enter a positive cash entry amount.');
 if(legs<2||legs>6)throw Error('Use 2–6 selections.');
 if(multipliers.some(v=>v===''||v===null||!Number.isFinite(Number(v))||Number(v)<0||Number(v)>10000))throw Error('Enter every gross payout multiplier, including 0 for losing outcomes.');
 const payouts=multipliers.map(Number);if(payouts.some((v,i)=>i&&v<payouts[i-1]))throw Error('Payout multipliers must not decrease as correct selections increase.');
 const choose=(n,k)=>{let v=1;for(let i=1;i<=k;i++)v=v*(n-i+1)/i;return v;};
 const expected=p=>payouts.reduce((sum,m,k)=>sum+m*choose(legs,k)*p**k*(1-p)**(legs-k),0);
 let threshold=null;if(payouts[0]>=1)threshold=0;else if(payouts.at(-1)>=1){let low=0,high=1;for(let i=0;i<70;i++){const mid=(low+high)/2;if(expected(mid)>=1)high=mid;else low=mid;}threshold=high;}
 let assumed=null;if(probability!==null&&probability!==''){assumed=Number(probability);if(!Number.isFinite(assumed)||assumed<0||assumed>1)throw Error('Assumed success probability must be between 0% and 100%.');}
 return {legs,threshold,outcomes:payouts.map((m,k)=>({correct:k,multiplier:m,return:cash*m,net:cash*(m-1)})),expectedNet:assumed===null?null:cash*(expected(assumed)-1)};
}
