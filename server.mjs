import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {createFeed,SPORTS,FeedError} from './odds.mjs';
import {createHash,timingSafeEqual} from 'node:crypto';
import {createAssistant,eligibleQuotes,comparisonQuotes} from './ai.mjs';
import {createResearch} from './research.mjs';
import {createJobs} from './jobs.mjs';
const odds=createFeed();
const research=createResearch();
const assistant=createAssistant({odds,research});
const matchupResearch=async(body,onProgress)=>{
 if(!body||!Object.hasOwn(SPORTS,body.sport))throw new FeedError('Choose NBA, NFL or MLB.',400);
 const snapshot=await odds(body.sport);let rows=snapshot.rows;
 if(body.propEvent){const props=await odds.props(body.sport,body.propEvent,body.propMarket,body.propBook||'draftkings');rows=[...props.rows,...rows];}
 const quotes=[...eligibleQuotes(rows),...comparisonQuotes(rows)];
 if(body.eventId&&!quotes.some(q=>q.eventId===body.eventId))throw new FeedError('Choose a game from the current live snapshot.',400);
 return research({sport:body.sport,quotes,eventId:body.eventId,onProgress});
};
const researchJobs=createJobs(matchupResearch);
const files={'/':'index.html','/app.js':'app.js','/style.css':'style.css','/math.js':'math.js','/opportunities.js':'opportunities.js','/board.js':'board.js','/platforms.js':'platforms.js','/market.js':'market.js','/prop-tools.js':'prop-tools.js','/pickem.js':'pickem.js','/workspace.js':'workspace.js','/slip.js':'slip.js','/slip-math.js':'slip-math.js','/research-ui.js':'research-ui.js'};
const digest=value=>createHash('sha256').update(value).digest();
http.createServer(async(req,res)=>{
  const url=new URL(req.url,'http://localhost');
  res.setHeader('X-Content-Type-Options','nosniff');
  if(url.pathname==='/health'){res.setHeader('Content-Type','application/json');return res.end('{"status":"ok"}');}
  const user=process.env.EDGE_USER,password=process.env.EDGE_PASSWORD;
  if(process.env.NODE_ENV==='production'&&(!user||!password)){res.writeHead(503);return res.end('Configure EDGE_USER and EDGE_PASSWORD before opening this app.');}
  if(user&&password){
    const expected='Basic '+Buffer.from(user+':'+password).toString('base64');
    if(!timingSafeEqual(digest(req.headers.authorization||''),digest(expected))){res.writeHead(401,{'WWW-Authenticate':'Basic realm="Edge", charset="UTF-8"','Cache-Control':'no-store'});return res.end('Sign in to access Edge.');}
  }
  if(url.pathname==='/api/research/status'){
    res.setHeader('Content-Type','application/json');res.setHeader('Cache-Control','no-store');
    try{res.end(JSON.stringify(researchJobs.get(url.searchParams.get('id'))));}catch(error){res.writeHead(error.status||500);res.end(JSON.stringify({error:error.status?error.message:'Job unavailable.'}));}return;
  }
  if(url.pathname==='/api/ask'||url.pathname==='/api/ai-check'||url.pathname==='/api/research'||url.pathname==='/api/research/start'){
    res.setHeader('Content-Type','application/json');res.setHeader('Cache-Control','no-store');
    if(req.method!=='POST'){res.writeHead(405);return res.end(JSON.stringify({error:'POST required.'}));}
    if(req.headers.origin&&(!URL.canParse(req.headers.origin)||new URL(req.headers.origin).host!==req.headers.host)){res.writeHead(403);return res.end(JSON.stringify({error:'Use Ask AI from this app.'}));}
    if(!req.headers['content-type']?.startsWith('application/json')){res.writeHead(415);return res.end(JSON.stringify({error:'JSON required.'}));}
    try{let raw='';for await(const chunk of req){raw+=chunk;if(Buffer.byteLength(raw)>12000){res.writeHead(413);return res.end(JSON.stringify({error:'Question too large.'}));}}let body;try{body=JSON.parse(raw);}catch{res.writeHead(400);return res.end(JSON.stringify({error:'Invalid JSON.'}));}res.end(JSON.stringify(await (url.pathname==='/api/ai-check'?assistant.check():url.pathname==='/api/research'?matchupResearch(body):url.pathname==='/api/research/start'?researchJobs.start(body):assistant(body))));}catch(error){res.writeHead(error.status||502);res.end(JSON.stringify({error:error.status?error.message:'AI request failed.'}));}return;
  }
  if(url.pathname==='/api/odds'||url.pathname==='/api/props'||url.pathname==='/api/alternates'||url.pathname==='/api/book'){
    res.setHeader('Content-Type','application/json');res.setHeader('Cache-Control','no-store');
    if(req.method!=='GET'){res.writeHead(405);return res.end(JSON.stringify({error:'GET required.'}));}
    try{res.end(JSON.stringify(await (url.pathname==='/api/book'?odds.book(url.searchParams.get('sport'),url.searchParams.get('book')):url.pathname==='/api/alternates'?odds.alternates(url.searchParams.get('sport'),url.searchParams.get('event')):url.pathname==='/api/props'?odds.props(url.searchParams.get('sport'),url.searchParams.get('event'),url.searchParams.get('market'),url.searchParams.get('book')||'draftkings'):odds(url.searchParams.get('sport')||'NBA'))));}catch(error){res.writeHead(error.status||502);res.end(JSON.stringify({error:error.status?error.message:'Odds feed unavailable.'}));}return;
  }
  const file=files[url.pathname];if(!file){res.writeHead(404);return res.end('Not found');}try{const body=await readFile(new URL('./public/'+file,import.meta.url));res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'text/html');res.end(body);}catch{res.writeHead(500);res.end('Unable to load application');}
}).listen(Number(process.env.PORT)||3000,'0.0.0.0');
