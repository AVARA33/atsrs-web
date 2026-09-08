/* Owner-only reporting; authorization and secrets stay on the server. */
(function(){
 'use strict';
 var generation=0,inFlight=null,CACHE_TTL=5*60*1000,CACHE_PREFIX='atsrs_developer_hr_summary_v1:';
 function cell(parent,tag,text){var n=document.createElement(tag),value=String(text==null?'—':text);n.textContent=window.atsrsI18n?window.atsrsI18n.translate(value):value;parent.appendChild(n);return n;}
 function money(v){return v==null?'Unavailable':'$'+Number(v).toFixed(4);}
 function date(v){return new Date(v).toLocaleString(window.atsrsLocaleCode?window.atsrsLocaleCode():'en-GB',{timeZone:'Asia/Baku'});}
 function cacheKey(){return CACHE_PREFIX+String(window.__atsrsDeveloperAccessUserId||'');}
 function readCache(){
  try{var parsed=JSON.parse(sessionStorage.getItem(cacheKey())||'null');return parsed&&parsed.data&&Number.isFinite(parsed.savedAt)?parsed:null;}
  catch(ignore){return null;}
 }
 function writeCache(data){try{sessionStorage.setItem(cacheKey(),JSON.stringify({savedAt:Date.now(),data:data}));}catch(ignore){}}
 window.atsrsRefreshJobMonitor=async function(force){
  var host=document.getElementById('jobIngestionMonitor');
  if(!host)return;
  if(!window.__atsrsDeveloperAccess){host.replaceChildren();host.classList.add('hidden');return;}
  var owner=window.__atsrsDeveloperAccessUserId;
  host.classList.remove('hidden');
  var previousButton=host.querySelector('button'),hadContent=!!previousButton,cached=readCache();
  var restoreFocus=!!previousButton&&document.activeElement===previousButton;
  if(!hadContent&&cached){renderResult(cached.data);hadContent=true;previousButton=host.querySelector('button');}
  if(!force&&cached&&Date.now()-cached.savedAt<CACHE_TTL){host.setAttribute('aria-busy','false');return cached.data;}
  if(inFlight)return inFlight;
  var request=++generation;
  host.setAttribute('aria-busy','true');
  if(previousButton)previousButton.disabled=true;
  if(!hadContent){host.replaceChildren();cell(host,'p','Loading server statistics…');}
  inFlight=(async function(){try{
   var responses=await Promise.all([window.supabaseClient.rpc('atsrs_get_hr_dashboard_summary'),window.supabaseClient.rpc('atsrs_get_hr_queue_preview')]);
   var summary=responses[0],queue=responses[1];
   if(summary&&summary.data&&queue&&queue.data&&!queue.error){summary.data.coverage=summary.data.coverage||{};Object.assign(summary.data.coverage,queue.data);}
   return summary;
  }catch(e){return {error:e};}})();
  var result=await inFlight;inFlight=null;
  if(request!==generation||!window.__atsrsDeveloperAccess||owner!==window.__atsrsDeveloperAccessUserId)return;
  host.setAttribute('aria-busy','false');
  if(previousButton)previousButton.disabled=false;
  if(hadContent&&(result.error||!result.data)){
   previousButton.title='Refresh failed. Previous statistics retained; try again.';
   return;
  }
  if(result.data)writeCache(result.data);
  renderResult(result.data,result.error);
  return result.data;

  function renderResult(data,error){
  var result={data:data,error:error};
  // Build off-screen and swap once; never collapse the existing report while awaiting RPC.
  var target=host,oldTable=target.querySelector('.job-monitor-table'),oldCoverage=target.querySelector('details');
  var coverageOpen=!!oldCoverage&&oldCoverage.open;
  var tableScroll=oldTable?oldTable.scrollLeft:0;
  var builder=document.createElement('div');
  function commit(){target.replaceChildren(...builder.children);var t=target.querySelector('.job-monitor-table');if(t)t.scrollLeft=tableScroll;if(restoreFocus)refresh.focus({preventScroll:true});}
  var header=cell(builder,'div','');header.className='job-monitor-header';
  cell(header,'h2','AI balance & HR activity');
  var refresh=cell(header,'button','Refresh');refresh.type='button';refresh.className='btn';refresh.onclick=function(){return window.atsrsRefreshJobMonitor(true);};
  if(result.error||!result.data){cell(builder,'p','Statistics unavailable. Refresh to retry.');commit();return;}
  var d=result.data, b=d.balance;
  var metrics=cell(builder,'div','');metrics.className='job-monitor-metrics';
  [['Shared API balance · last verified',b?'$'+Number(b.amount_usd).toFixed(2):'Unavailable'],['HR daily limit',money(d.daily_limit)],['HR today · used',money(d.today_cost)],['HR today · remaining',money(d.daily_remaining)],['HR today · reserved',money(d.today_reserved)],['HR this month · calculated',money(d.month_cost)],['HR monthly limit',money(d.monthly_limit)],['Month reserved · unresolved',money(d.unresolved_reserve)],['AI Scan cost','Not connected']].forEach(function(p){var box=cell(metrics,'div','');cell(box,'span',p[0]);cell(box,'strong',p[1]);});
  [['HR today · new recruiters',d.today_recruiters_added],['HR today · new companies',d.today_companies_added]].forEach(function(p){var box=cell(metrics,'div','');cell(box,'span',p[0]);cell(box,'strong',p[1]==null?'Unavailable':p[1]);});
  cell(builder,'p','Shared balance is not live'+(b?' — verified '+date(b.checked_at)+' (Baku)':'')+'. Refresh does not recheck the OpenAI balance. AI Scan and HR use the same balance.');
  var link=cell(builder,'a','Check current balance in OpenAI');link.href='https://platform.openai.com/settings/organization/billing/overview';link.target='_blank';link.rel='noopener noreferrer';
  cell(builder,'p','HR statistics refreshed '+date(d.refreshed_at)+' (Baku). '+(d.enabled?'Enabled':'Paused')+' · Mon–Fri, 09:00–17:00 Baku · bounded batches every 5 minutes.');
  cell(builder,'p','HR costs are calculated from recorded tokens, not an invoice or total account spend. Reservations are separate. AI Scan costs are not included.');
  if(d.daily_reset_at)cell(builder,'p','Daily allowance resets '+date(d.daily_reset_at)+' (Baku); unused allowance does not roll over. Remaining subtracts both used cost and reservations. '+(d.daily_budget_paused?'New paid AI calls are paused: insufficient daily headroom. ':'')+'Each new call requires '+money(d.reservation_per_call)+' of budget headroom.');
  var wrap=cell(builder,'div','');wrap.className='job-monitor-table';var table=cell(wrap,'table','');
  cell(table,'caption','Daily HR statistics · last 30 days · Baku time');
  var head=cell(cell(table,'thead',''),'tr','');['Date','Daily limit (USD)','Used (USD)','Reserved (USD)','Remaining (USD)','AI calls','New jobs','Updated jobs','New recruiters','New companies','Budget paused at (Baku)','Run errors'].forEach(function(t){var th=cell(head,'th',t);th.scope='col';});
  var body=cell(table,'tbody','');
  (d.daily||[]).forEach(function(r){var tr=cell(body,'tr','');[r.day,r.daily_limit==null?'—':money(r.daily_limit),money(r.cost),money(r.reserved),r.remaining==null?'—':money(r.remaining),r.calls,r.published,r.updated,r.recruiters_added,r.companies_added,r.paused_at?date(r.paused_at)+' · '+r.pause_reason:'—',r.errors].forEach(function(t){cell(tr,'td',t);});});
  cell(builder,'p','New recruiters and companies are HR directory records first added on that day (Baku time). Updates to existing records are excluded.');
  if(d.coverage){
   var c=d.coverage,scope=c.scope||[],sources=c.sources||[],connected=scope.filter(function(s){return s.connector_state==='connected';}).length;
   var details=cell(builder,'details','');details.open=coverageOpen;
   cell(details,'summary','Daily source coverage · '+scope.length+' name records · '+connected+' connected · '+(scope.length-connected)+' need integration/review');
   cell(details,'p',sources.filter(function(s){return s.enabled;}).length+' active feeds · '+c.pending+' queued postings · '+c.review+' require review. A daily plan is not proof that all vacancies have been imported.');
   var box=cell(details,'div','');box.className='job-monitor-table';
   var coverageTable=cell(box,'table',''),h=cell(cell(coverageTable,'thead',''),'tr','');
   ['Company / alias','Connection','Last check (Baku)','Last full listing scan','Details'].forEach(function(t){cell(h,'th',t);});
   var tb=cell(coverageTable,'tbody','');
   scope.forEach(function(s){var tr=cell(tb,'tr','');var matches=sources.filter(function(b){return (s.boards||[]).indexOf(b.board)>=0;});var full=matches.length&&matches.every(function(b){return b.last_full_scan_at;})?matches.map(function(b){return b.last_full_scan_at;}).sort()[0]:null;
    [s.name,s.connector_state==='connected'?'Connected':s.connector_state==='needs_connector'?'Needs connector':s.connector_state==='missing_source'?'Missing careers URL':'Needs review',s.last_checked_at?date(s.last_checked_at):'Not checked',full?date(full):'Not completed',s.last_error||matches.map(function(b){return b.last_error;}).filter(Boolean).join('; ')||'—'].forEach(function(v){cell(tr,'td',v);});
   });
   var queue=c.queue_preview||[];
   cell(details,'h3','Pending publication queue');
   cell(details,'p',(c.pending_recent||0)+' date-verified recent · '+(c.pending_no_date||0)+' awaiting detail-page date · showing the next '+queue.length+' records. The closest valid source date is processed first within each underrepresented specialty.');
   var queueBox=cell(details,'div','');queueBox.className='job-monitor-table';
   var queueTable=cell(queueBox,'table',''),queueHead=cell(cell(queueTable,'thead',''),'tr','');
   ['Specialty','Job','Company','Source date','Discovered (Baku)','Provider','Queue ID'].forEach(function(t){cell(queueHead,'th',t);});
   var queueBody=cell(queueTable,'tbody','');
   queue.forEach(function(q){var tr=cell(queueBody,'tr','');[q.specialty,q.title,q.company,q.source_date||'Detail check required',q.discovered_at?date(q.discovered_at):'—',q.provider,q.board+':'+q.external_id].forEach(function(v){cell(tr,'td',v);});});
  }
  commit();
  }
 };
})();
