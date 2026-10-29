import {randomUUID} from 'node:crypto';
import {FeedError} from './odds.mjs';
export function createJobs(run,{now=Date.now}={}){
 const jobs=new Map();
 return {
  start(body){
   if(!body||typeof body.sport!=='string')throw new FeedError('Choose a sport for research.',400);
   for(const [id,job] of jobs)if(now()-job.created>600000&&job.state!=='running')jobs.delete(id);
   const key=JSON.stringify([body.sport,body.eventId||'',body.propEvent||'',body.propMarket||'',body.propBook||'draftkings']);
   for(const job of jobs.values())if(job.state==='running'&&job.key===key)return {id:job.id};
   if([...jobs.values()].filter(j=>j.state==='running').length>=2)throw new FeedError('Research is already running. Wait for a current job to finish.',429);
   while(jobs.size>=12){const done=[...jobs.values()].find(j=>j.state!=='running');if(!done)break;jobs.delete(done.id);}
   const job={id:randomUUID(),key,created:now(),state:'running',progress:{phase:'Loading live events'}};jobs.set(job.id,job);
   Promise.resolve().then(()=>run(body,progress=>{job.progress=progress;})).then(result=>{job.result=result;job.state='complete';},error=>{job.error=error.status?error.message:'Research failed. Try again later.';job.state='failed';});
   return {id:job.id};
  },
  get(id){const job=jobs.get(id);if(!job)throw new FeedError('Research job not found or expired.',404);return {id:job.id,state:job.state,progress:job.progress,result:job.result,error:job.error};}
 };
}
