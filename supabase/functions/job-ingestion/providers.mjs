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
function entity(v){return String(v||'').replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;|&apos;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&#(\d+);/g,(_,n)=>String.fromCodePoint(Number(n))).replace(/&#x([\da-f]+);/gi,(_,n)=>String.fromCodePoint(parseInt(n,16)));}
function dotNetDate(v){const m=String(v||'').match(/\/Date\((\d+)/);return m?new Date(Number(m[1])).toISOString():v||null;}
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
export function successFactorsEntries(html,base,s) {
 const entries=new Map();
 for(const m of html.matchAll(/<a\b[^>]*href\s*=\s*["']([^"']*\/job\/[^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)){
  let url;try{url=new URL(entity(m[1]),base);url.search='';url.hash='';}catch{continue;}
  const title=text(entity(m[2]));if(!title||!allowedUrl(url.href,s))continue;
  const match=url.pathname.match(/\/(\d+)\/?$/);const id=match?.[1];if(id)entries.set(id,normalized(s,id,title,url.href));
 }
 const totals=[...html.matchAll(/Showing\s+\d+\s+to\s+\d+\s+of\s+(\d+)\s+Jobs/gi)].map(m=>Number(m[1]));
 const total=totals.length?Math.max(...totals):entries.size;
 return {entries,total};
}
export function successFactorsDetail(html) {
 const title=text(entity(html.match(/itemprop=["']title["'][^>]*>([\s\S]*?)<\/span>/i)?.[1]));
 const description=html.match(/itemprop=["']description["'][^>]*>\s*<span\s+class=["']jobdescription["']>([\s\S]*?)<\/span>\s*<\/span>/i)?.[1]||'';
 const location=text(entity(html.match(/class=["']jobGeoLocation["'][^>]*>([\s\S]*?)<\/span>/i)?.[1]));
 const closing=text(entity(html.match(/data-careersite-propertyid=["']customfield4["'][^>]*>([\s\S]*?)<\/span>/i)?.[1]));
 const apply=entity(html.match(/class=["'][^"']*\bapply\b[^"']*["'][^>]*href=["']([^"']+)/i)?.[1]||'');
 return {title,description,location,closing,apply};
}
async function recmanJson(s,path) {
 const root=await publicResponse(s.source_config.root,s);if(!root.ok)throw new Error(`Source HTTP ${root.status}`);const html=await root.text();
 const token=html.match(/name=["']csrf-token["']\s+content=["']([^"']+)/i)?.[1];if(!token)throw new Error('RecMan CSRF token missing');
 const setCookies=typeof root.headers.getSetCookie==='function'?root.headers.getSetCookie():[root.headers.get('set-cookie')].filter(Boolean);
 const cookie=setCookies.map(v=>v.split(';',1)[0]).join('; ');
 return json(new URL(path,s.source_config.root).href,s,{headers:{Accept:'application/json','X-CSRF-TOKEN':token,...(cookie?{Cookie:cookie}:{})}});
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
 else if(p==='recman') {const data=await recmanJson(s,'/api/jobs?sort=newest');if(data.statusCode!==200||!Array.isArray(data.data?.job_posts))throw new Error('Invalid RecMan feed');for(const j of data.data.job_posts){const url=new URL(`/job/${j.AdID}`,c.root).href;add(normalized(s,j.AdID,j.JobTitle||j.Name,url,'',null,j.Place,'',url));}total=Number(data.data.metadata?.totalCount||entries.size);}
 else if(p==='hrmanager') {const data=await json(c.feed,s);if(!Array.isArray(data.Items))throw new Error('Invalid HR Manager feed');for(const j of data.Items){const due=dotNetDate(j.ApplicationDue);if(j.ShowApplyButton===false)continue;const d=normalized(s,j.Id,j.Name,j.AdvertisementUrlSecure||j.AdvertisementUrl,j.ShortDescription,dotNetDate(j.Published||j.Created),j.WorkPlace,'',j.ApplicationFormUrlSecure||j.ApplicationFormUrl||j.AdvertisementUrl);d.active=!due||Date.parse(due)>Date.now()||Date.parse(due)<0;add(d);}total=entries.size;}
 else if(p==='successfactors') {let start=0,ended=false;for(let page=0;page<20;page++){const url=new URL(c.feed);url.searchParams.set('q','');url.searchParams.set('sortColumn','referencedate');url.searchParams.set('sortDirection','desc');if(start)url.searchParams.set('startrow',String(start+1));const response=await publicResponse(url.href,s);if(!response.ok)throw new Error(`Source HTTP ${response.status}`);const parsed=successFactorsEntries(await response.text(),url.href,s);for(const [id,d] of parsed.entries)add(d);total=Math.max(total,parsed.total);if(parsed.entries.size<25){ended=true;break;}start+=25;}complete=ended;if(!complete)throw new Error(`SuccessFactors pagination incomplete: ${entries.size}/${total}`);}
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
 if(s.provider==='recman'){const j=await recmanJson(s,`/api/v2/job/${q.external_id}`);const v=j.data;if(j.statusCode!==200||!v||String(v.id)!==String(q.external_id))throw new Error('RecMan detail identity mismatch');d={...d,id:String(v.id),name:v.jobTitle||d.name,active:v.isArchived!==true&&v.isExpired!==true,validThrough:v.endDate||null,jobAd:{sections:{jobDescription:{text:v.body||''}}},location:{fullLocation:v.locations?.formattedAddress||v.location?.name||d.location?.fullLocation||'',country:v.location?.country||''}};}
 const r=await publicResponse(d.postingUrl,s);if(!r.ok)throw new Error(`Job page HTTP ${r.status}`);const html=await r.text();
 if(s.provider==='hrmanager'){const body=html.match(/<div\s+id=["']AdvertisementInnerContent["'][^>]*>([\s\S]*?)<\/div>\s*(?:<!--|<)/i)?.[1];if(!body)throw new Error('HR Manager job description missing');d={...d,active:d.active!==false,jobAd:{sections:{jobDescription:{text:body}}}};}
 const matched=jobSchemas(html).filter(j=>text(j.title).toLowerCase()===text(d.name).toLowerCase());
 if(s.provider==='web'){if(matched.length!==1)throw new Error('Job schema missing or ambiguous');d=await schemaEntry(s,matched[0],d.postingUrl);}
 else if(s.provider==='successfactors'){const parsed=successFactorsDetail(html);if(!parsed.title||parsed.title.toLowerCase()!==text(d.name).toLowerCase()||!parsed.description)throw new Error('SuccessFactors job detail missing or ambiguous');const apply=new URL(parsed.apply,d.postingUrl).href;d={...d,name:parsed.title,active:!parsed.closing||Date.parse(parsed.closing)>Date.now(),validThrough:parsed.closing||null,applyUrl:apply,location:{fullLocation:parsed.location,country:''},jobAd:{sections:{jobDescription:{text:parsed.description}}}};}
 else if(matched.length===1){d.releasedDate=matched[0].datePosted||d.releasedDate;if(matched[0].validThrough&&Date.parse(matched[0].validThrough)<=Date.now())d.active=false;}
 // The exact official job page must also corroborate the title; a generic careers shell is insufficient.
 const plain=text(html).toLowerCase();if(!plain.includes(text(d.name).toLowerCase())&&matched.length!==1)throw new Error('Official page does not corroborate vacancy title');
 return {d,html};
}
