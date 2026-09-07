// Public employer feeds only. Config is maintained by the service, never by applicants.
export function allowedUrl(value, source) {
 try { const u=new URL(value); return u.protocol==='https:'&&!u.username&&!u.password&&!u.port&&
  (source?.source_config?.prefixes||[]).some(prefix=>{const p=new URL(prefix);return u.origin===p.origin&&(u.pathname===p.pathname.replace(/\/$/,'')||u.pathname.startsWith(p.pathname.endsWith('/')?p.pathname:p.pathname+'/'));}); } catch {return false;}
}
export async function publicResponse(url,source,init={}) {
 for(let i=0;i<4;i++) {if(!allowedUrl(url,source))throw new Error('Source URL outside verified account');
  const r=await fetch(url,{...init,redirect:'manual',signal:AbortSignal.timeout(8000)});
  if(r.status>=300&&r.status<400){const next=r.headers.get('location');await r.body?.cancel();if(!next)throw new Error('Missing redirect');url=new URL(next,url).href;continue;}return r;
 }throw new Error('Too many source redirects');
}
async function json(url,source,init) {const r=await publicResponse(url,source,init);if(!r.ok)throw new Error(`Source HTTP ${r.status}`);return r.json();}
function text(v){return String(v||'').replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim();}
export function specialty(title) {
 const lanes=[['rov_roc',/\brov\b|remotely operated vehicle|remote operations (cent|operator)/i],['survey',/surveyor|hydrograph|geophysic|geotechnic|party chief|survey engineer/i],['marine',/\b(master|seafarer|deckhand|bosun|able seaman|dpo|marine engineer|chief officer|second officer|third officer)\b/i],['diving',/\bdiver|diving/i],['electrical',/electrical|electrician|electronics|instrumentation/i],['mechanical',/mechanical|mechanic\b|machinist|welder|fabricator/i],['healthcare',/nurs(e|ing)|physician|medical|clinical|pharmac|therapist/i],['information_technology',/software|developer|cyber|data (engineer|scientist|analyst)|\bIT\b|devops/i],['finance',/financ|accountant|payroll|audit|tax\b/i],['human_resources',/human resources|recruiter|talent acquisition|\bHR\b/i],['sales',/sales|business development|account executive/i],['marketing',/marketing|communications|brand|content/i],['supply_chain',/logistic|procurement|supply chain|buyer|warehouse/i],['quality_safety',/\bhse\b|\bhsse\b|\bqhse\b|safety|quality/i],['project_management',/project manager|program manager|project control|planning engineer/i],['engineering',/engineer|architect|technician/i],['education',/teacher|instructor|education|professor/i],['customer_service',/customer|reception|guest|hospitality/i],['administration',/administrat|executive assistant|office manager/i]];
 return lanes.find(([,re])=>re.test(title||''))?.[0]||'unclassified';
}
function normalized(s,id,title,url,description='',date=null,location='',country='',apply=url,requirements='') {
 return {id:String(id),name:title,company:{identifier:s.board,name:s.source_config.company},active:true,visibility:'PUBLIC',postingUrl:url,applyUrl:apply,releasedDate:date,
 location:{fullLocation:location,country},function:{id:specialty(title)},jobAd:{sections:{jobDescription:{text:description},qualifications:{text:requirements}}}};
}
export function jobSchemas(html) {
 const result=[];function walk(v){if(!v||typeof v!=='object')return;if([v['@type']].flat().includes('JobPosting'))result.push(v);if(Array.isArray(v))v.forEach(walk);else if(v['@graph'])walk(v['@graph']);}
 for(const m of html.matchAll(/<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)){try{walk(JSON.parse(m[1]));}catch{}}
 return result;
}
export async function urlId(url){const b=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(url));return Array.from(new Uint8Array(b)).map(x=>x.toString(16).padStart(2,'0')).join('').slice(0,32);}
export async function schemaEntry(s,j,url) {
 if(!allowedUrl(url,s))return null;
 const places=[j.jobLocation].flat().filter(Boolean).map(v=>[v.address?.addressLocality,v.address?.addressRegion,typeof v.address?.addressCountry==='string'?v.address.addressCountry:v.address?.addressCountry?.name].filter(Boolean).join(', '));
 const d=normalized(s,await urlId(url),j.title,url,j.description,j.datePosted,places.join('; ')||(j.jobLocationType==='TELECOMMUTE'?'Remote':''),'',url,j.qualifications);
 d.active=!j.validThrough||Date.parse(j.validThrough)>Date.now();d._schema=true;return d;
}
export function candidateLinks(html,base,s){return [...new Set([...html.matchAll(/href\s*=\s*["']([^"']+)["']/gi)].flatMap(m=>{try{const u=new URL(m[1].replace(/&amp;/g,'&'),base);u.hash='';if(!allowedUrl(u.href,s)||/\.(js|css|png|jpg|pdf|svg|woff2?)(\?|$)|\/wp-json\/|\/feed\/?$|\/events\/|\/content\/|\/login|\/register|\/privacy/i.test(u.href))return [];return /job|vacanc|career|opportunit|recruit|\/search\/|[?&](page|startrow)=/i.test(u.pathname+u.search)?[u.href]:[];}catch{return [];}}))].sort((a,b)=>linkRank(a)-linkRank(b));}
function linkRank(url){const u=new URL(url);return /\/(jobs?|vacancies|vacancy)\/[^/?]+/i.test(u.pathname)&&!/[?&]|\/page\//.test(url)?0:/[?&](page|startrow)=|\/page\/|\/search\//.test(url)?1:2;}
export async function discover(s) {
 const c=s.source_config,p=s.provider,entries=new Map();let total=0,nextOffset=0,complete=true,state={};
 const add=d=>{if(d&&allowedUrl(d.postingUrl,s)&&allowedUrl(d.applyUrl,s))entries.set(d.id,d);};
 if(p==='ashby') {const data=await json(c.feed,s);if(!Array.isArray(data.jobs))throw new Error('Invalid Ashby feed');for(const j of data.jobs){if(j.isListed===false)continue;add(normalized(s,j.id,j.title,j.jobUrl,j.descriptionHtml||j.descriptionPlain,j.publishedAt,j.location,j.address?.postalAddress?.addressCountry,j.applyUrl));}total=entries.size;}
 else if(p==='greenhouse'){const data=await json(c.feed,s);if(!Array.isArray(data.jobs))throw new Error('Invalid Greenhouse feed');for(const j of data.jobs)add(normalized(s,j.id,j.title,j.absolute_url,j.content,null,j.location?.name));total=entries.size;}
 else if(p==='lever'){const data=await json(c.feed,s);if(!Array.isArray(data))throw new Error('Invalid Lever feed');for(const j of data)add(normalized(s,j.id,j.text,j.hostedUrl,[j.description,...(j.lists||[]).map(l=>l.text+' '+l.content),j.additional].join('\n'),null,j.categories?.location,'',j.applyUrl));total=entries.size;}
 else if(p==='recruitee'){const data=await json(c.feed,s);if(!Array.isArray(data.offers))throw new Error('Invalid Recruitee feed');for(const j of data.offers)add(normalized(s,j.id||j.slug,j.title,j.careers_url||`${c.root}/o/${j.slug}`,j.description,j.published_at||null,j.location,'',j.careers_url||`${c.root}/o/${j.slug}`,j.requirements));total=entries.size;}
 else if(p==='workday') {const offset=s.scan_offset||0;const data=await json(c.feed+'/jobs',s,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({limit:20,offset,searchText:'',appliedFacets:{}})});if(!Array.isArray(data.jobPostings)||!Number.isFinite(data.total))throw new Error('Invalid Workday feed');for(const j of data.jobPostings){const url=c.root+j.externalPath;const d=normalized(s,await urlId(url),j.title,url,'',null,j.locationsText);d._detailUrl=c.feed+j.externalPath;add(d);}total=data.total;complete=offset+data.jobPostings.length>=total;if(!complete&&!data.jobPostings.length)throw new Error('Workday pagination stalled');nextOffset=complete?0:offset+data.jobPostings.length;}
 else if(p==='web') {
  const prior=s.discovery_state||{};const frontier=prior.frontier?.length?[...prior.frontier]:[...c.seeds];const seen=new Set(prior.frontier?.length?prior.seen||[]:[]);let count=prior.frontier?.length?prior.found||0:0;
  for(let i=0;i<3&&frontier.length;i++){const url=frontier.shift();if(seen.has(url))continue;let r;try{r=await publicResponse(url,s);if(!r.ok)throw new Error(`Source HTTP ${r.status}`);}catch(e){if(!seen.size)throw e;seen.add(url);continue;}const html=await r.text();seen.add(url);const schemas=jobSchemas(html);for(const j of schemas){const jobUrl=schemas.length===1?r.url:j.url;if(jobUrl)add(await schemaEntry(s,j,jobUrl));}for(const u of candidateLinks(html,r.url,s))if(!seen.has(u)&&!frontier.includes(u))frontier.push(u);frontier.sort((a,b)=>linkRank(a)-linkRank(b));if(frontier.length+seen.size>5000)throw new Error('Discovery frontier needs review: over 5000 pages');}
  count+=entries.size;complete=!frontier.length;total=count;state=complete?{}:{frontier,seen:[...seen],found:count};
  if(complete&&total===0)throw new Error('No structured vacancies found; source needs connector review');
 }else throw new Error('Unsupported provider');
 return {entries,total,nextOffset,complete,state};
}
export async function detail(s,q) {
 let d={...q.payload};
 if(s.provider==='workday') {const j=await json(d._detailUrl,s);const v=j.jobPostingInfo;if(!v||v.externalUrl!==d.postingUrl)throw new Error('Workday detail identity mismatch');if(s.source_config.employer_filter&&!text(j.hiringOrganization?.name).toLowerCase().includes(s.source_config.employer_filter))throw new Error('Shared board employer does not match listed company');d={...d,name:v.title||d.name,company:{identifier:s.board,name:j.hiringOrganization?.name||s.source_config.company},active:v.canApply===true&&v.posted===true,jobAd:{sections:{jobDescription:{text:v.jobDescription}}},location:{fullLocation:v.location,country:v.country?.descriptor}};}
 const r=await publicResponse(d.postingUrl,s);if(!r.ok)throw new Error(`Job page HTTP ${r.status}`);const html=await r.text();
 const matched=jobSchemas(html).filter(j=>text(j.title).toLowerCase()===text(d.name).toLowerCase());
 if(s.provider==='web'){if(matched.length!==1)throw new Error('Job schema missing or ambiguous');d=await schemaEntry(s,matched[0],d.postingUrl);}
 else if(matched.length===1){d.releasedDate=matched[0].datePosted||d.releasedDate;if(matched[0].validThrough&&Date.parse(matched[0].validThrough)<=Date.now())d.active=false;}
 // The exact official job page must also corroborate the title; a generic careers shell is insufficient.
 const plain=text(html).toLowerCase();if(!plain.includes(text(d.name).toLowerCase())&&matched.length!==1)throw new Error('Official page does not corroborate vacancy title');
 return {d,html};
}
