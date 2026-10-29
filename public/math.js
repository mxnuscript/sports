export function decimal(value){const n=Number(value);if(!Number.isFinite(n)||Math.abs(n)<100)throw Error('Use American odds of +100 or greater, or −100 or lower.');return n>0?1+n/100:1+100/Math.abs(n);}
export function amount(value){const n=Number(value);if(!Number.isFinite(n)||n<=0)throw Error('Enter a positive stake.');return n;}
export function arb(a,b,total){const x=decimal(a),y=decimal(b),bank=amount(total),sum=1/x+1/y;return {first:bank/(x*sum),second:bank/(y*sum),profit:bank/sum-bank,roi:1/sum-1};}
export function bonus(a,b,stake,returned=false){const x=decimal(a),y=decimal(b),s=amount(stake),win=s*(returned?x:x-1),hedge=win/y;return {hedge,conversion:win-hedge,rate:(win-hedge)/s};}
