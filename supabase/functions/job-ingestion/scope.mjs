// Registry checks are not vacancy imports. Unsupported sites stay visibly unconnected.
export function safePublicUrl(value) {
 try {const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password&&!u.port&&
 /^[a-z0-9.-]+\.[a-z]{2,}$/i.test(u.hostname)&&!/(^|\.)(localhost|local|internal|test|invalid)$/i.test(u.hostname)?u:null;}catch{return null;}
}
export async function checkScope(db,check,started) {
 const rows=check(await db.from('atsrs_hr_source_scope').select('*').neq('connector_state','connected')
  .or(`last_checked_at.is.null,last_checked_at.lt.${new Date(Date.now()-24*3600000).toISOString()}`)
  .order('last_checked_at',{nullsFirst:true}).limit(4)).data||[];
 for(const row of rows){if(Date.now()-started>20000)break;
  const url=safePublicUrl(row.careers_url);
  const patch={last_checked_at:new Date().toISOString(),http_status:null,last_error:null,connector_state:'needs_connector'};
  if(!url){patch.connector_state='missing_source';patch.last_error='Verified public careers URL required';}
  else try{
   // No credentials, redirect following, CAPTCHA solving, or login bypass.
   const r=await fetch(url,{method:'GET',redirect:'manual',signal:AbortSignal.timeout(4000)});
   patch.http_status=r.status;await r.body?.cancel();
   if(!r.ok){patch.connector_state='review';patch.last_error=`Careers HTTP ${r.status}; connector not activated`;}
   else patch.last_error='Careers reachable; vacancy-list connector still required';
  }catch{patch.connector_state='review';patch.last_error='Careers check timed out or failed; connector not activated';}
  check(await db.from('atsrs_hr_source_scope').update(patch).eq('name',row.name));
 }
}
export async function listingSweep(base,previousOffset,getJson,canContinue,maxPages=8) {
 const fresh=await getJson(base+'?limit=100&offset=0');
 if(!Array.isArray(fresh.content)||!Number.isInteger(fresh.totalFound)||fresh.totalFound<0)throw new Error('Invalid posting list');
 const entries=new Map(fresh.content.map(p=>[String(p.id),p]));
 let offset=Math.max(100,Number(previousOffset)||100),pages=1;
 while(offset<fresh.totalFound&&pages<maxPages&&canContinue()){
  const page=await getJson(base+`?limit=100&offset=${offset}`);
  if(!Array.isArray(page.content)||(!page.content.length&&offset<page.totalFound))throw new Error('Incomplete posting page');
  for(const p of page.content)entries.set(String(p.id),p);
  offset+=100;pages++;
 }
 return {entries,total:fresh.totalFound,nextOffset:offset>=fresh.totalFound?0:offset,complete:offset>=fresh.totalFound};
}
