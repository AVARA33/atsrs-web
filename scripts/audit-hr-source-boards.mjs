import fs from 'node:fs';
import {checkDetail,postingUrl} from '../supabase/functions/job-ingestion/policy.mjs';
const {boards}=JSON.parse(fs.readFileSync('qa/hr-source-scope-2026-09-03.json','utf8'));
let cursor=0; const results=[];
await Promise.all(Array.from({length:5},async()=>{
 while(cursor<boards.length){const source=boards[cursor++];try{
  const base=`https://api.smartrecruiters.com/v1/companies/${source.board}/postings`;
  const r=await fetch(base+'?limit=1',{signal:AbortSignal.timeout(12000),redirect:'error'});
  if(!r.ok)throw new Error('List HTTP '+r.status);
  const list=await r.json();if(!Array.isArray(list.content)||!Number.isFinite(list.totalFound))throw new Error('Invalid list');
  if(!list.content.length){results.push({...source,total:list.totalFound,state:'empty',checked_at:new Date().toISOString()});continue;}
  const id=String(list.content[0].id);if(!/^\d+$/.test(id))throw new Error('Non numeric id');
  const d=await fetch(base+'/'+id,{signal:AbortSignal.timeout(12000),redirect:'error'}).then(r=>r.json());
  const problem=checkDetail(d,source.board,id);if(problem)throw new Error(problem);
  const page=await fetch(d.postingUrl,{signal:AbortSignal.timeout(12000),redirect:'error'});const html=await page.text();
  if(!page.ok||!postingUrl(page.url,source.board,id)||!html.includes(id))throw new Error('Public page not verified');
  results.push({...source,total:list.totalFound,state:'ready',company:d.company.name,checked_at:new Date().toISOString()});
 }catch(e){results.push({...source,state:'review',error:e.message,checked_at:new Date().toISOString()});}}
}));
console.log(JSON.stringify(results,null,2));
