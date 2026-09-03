/* Owner-only reporting; authorization and secrets stay on the server. */
(function(){
 'use strict';
 var generation=0;
 function cell(parent,tag,text){var n=document.createElement(tag);n.textContent=String(text==null?'—':text);parent.appendChild(n);return n;}
 function money(v){return v==null?'Unavailable':'$'+Number(v).toFixed(4);}
 function date(v){return new Date(v).toLocaleString('en-GB',{timeZone:'Asia/Baku'});}
 window.atsrsRefreshJobMonitor=async function(){
  var host=document.getElementById('jobIngestionMonitor'),request=++generation;
  if(!host)return;
  if(!window.__atsrsDeveloperAccess){host.replaceChildren();host.classList.add('hidden');return;}
  var owner=window.__atsrsDeveloperAccessUserId;
  var previousButton=host.querySelector('button'),hadContent=!!previousButton;
  var restoreFocus=!!previousButton&&document.activeElement===previousButton;
  host.classList.remove('hidden');
  host.setAttribute('aria-busy','true');
  if(previousButton)previousButton.disabled=true;
  if(!hadContent){host.replaceChildren();cell(host,'p','Loading server statistics…');}
  var result;
  try{result=await window.supabaseClient.rpc('atsrs_get_hr_cost_summary');}
  catch(e){result={error:true};}
  if(request!==generation||!window.__atsrsDeveloperAccess||owner!==window.__atsrsDeveloperAccessUserId)return;
  host.setAttribute('aria-busy','false');
  if(previousButton)previousButton.disabled=false;
  if(hadContent&&(result.error||!result.data)){
   previousButton.title='Refresh failed. Previous statistics retained; try again.';
   return;
  }
  // Build off-screen and swap once; never collapse the existing report while awaiting RPC.
  var target=host,oldTable=target.querySelector('.job-monitor-table'),oldCoverage=target.querySelector('details');
  var coverageOpen=!!oldCoverage&&oldCoverage.open;
  var tableScroll=oldTable?oldTable.scrollLeft:0;
  host=document.createElement('div');
  function commit(){target.replaceChildren(...host.children);var t=target.querySelector('.job-monitor-table');if(t)t.scrollLeft=tableScroll;if(restoreFocus)refresh.focus({preventScroll:true});}
  var header=cell(host,'div','');header.className='job-monitor-header';
  cell(header,'h2','AI balance & HR activity');
  var refresh=cell(header,'button','Refresh');refresh.type='button';refresh.className='btn';refresh.onclick=window.atsrsRefreshJobMonitor;
  if(result.error||!result.data){cell(host,'p','Statistics unavailable. Refresh to retry.');commit();return;}
  var d=result.data, b=d.balance;
  var metrics=cell(host,'div','');metrics.className='job-monitor-metrics';
  [['Shared API balance · last verified',b?'$'+Number(b.amount_usd).toFixed(2):'Unavailable'],['HR daily limit',money(d.daily_limit)],['HR today · used',money(d.today_cost)],['HR today · remaining',money(d.daily_remaining)],['HR today · reserved',money(d.today_reserved)],['HR this month · calculated',money(d.month_cost)],['HR monthly limit',money(d.monthly_limit)],['Month reserved · unresolved',money(d.unresolved_reserve)],['AI Scan cost','Not connected']].forEach(function(p){var box=cell(metrics,'div','');cell(box,'span',p[0]);cell(box,'strong',p[1]);});
  [['HR today · new recruiters',d.today_recruiters_added],['HR today · new companies',d.today_companies_added]].forEach(function(p){var box=cell(metrics,'div','');cell(box,'span',p[0]);cell(box,'strong',p[1]==null?'Unavailable':p[1]);});
  cell(host,'p','Shared balance is not live'+(b?' — verified '+date(b.checked_at)+' (Baku)':'')+'. Refresh does not recheck the OpenAI balance. AI Scan and HR use the same balance.');
  var link=cell(host,'a','Check current balance in OpenAI');link.href='https://platform.openai.com/settings/organization/billing/overview';link.target='_blank';link.rel='noopener noreferrer';
  cell(host,'p','HR statistics refreshed '+date(d.refreshed_at)+' (Baku). '+(d.enabled?'Enabled':'Paused')+' · Mon–Fri, 09:00–17:00 Baku · bounded batches every 5 minutes.');
  cell(host,'p','HR costs are calculated from recorded tokens, not an invoice or total account spend. Reservations are separate. AI Scan costs are not included.');
  if(d.daily_reset_at)cell(host,'p','Daily allowance resets '+date(d.daily_reset_at)+' (Baku); unused allowance does not roll over. Remaining subtracts both used cost and reservations. '+(d.daily_budget_paused?'New paid AI calls are paused: insufficient daily headroom. ':'')+'Each new call requires '+money(d.reservation_per_call)+' of budget headroom.');
  var wrap=cell(host,'div','');wrap.className='job-monitor-table';var table=cell(wrap,'table','');
  cell(table,'caption','Daily HR statistics · last 30 days · Baku time');
  var head=cell(cell(table,'thead',''),'tr','');['Date','Daily limit (USD)','Used (USD)','Reserved (USD)','Remaining (USD)','AI calls','New jobs','Updated jobs','New recruiters','New companies','Budget paused at (Baku)','Run errors'].forEach(function(t){var th=cell(head,'th',t);th.scope='col';});
  var body=cell(table,'tbody','');
  (d.daily||[]).forEach(function(r){var tr=cell(body,'tr','');[r.day,r.daily_limit==null?'—':money(r.daily_limit),money(r.cost),money(r.reserved),r.remaining==null?'—':money(r.remaining),r.calls,r.published,r.updated,r.recruiters_added,r.companies_added,r.paused_at?date(r.paused_at)+' · '+r.pause_reason:'—',r.errors].forEach(function(t){cell(tr,'td',t);});});
  cell(host,'p','New recruiters and companies are HR directory records first added on that day (Baku time). Updates to existing records are excluded.');
  if(d.coverage){
   var c=d.coverage,scope=c.scope||[],sources=c.sources||[],connected=scope.filter(function(s){return s.connector_state==='connected';}).length;
   var details=cell(host,'details','');details.open=coverageOpen;
   cell(details,'summary','Daily source coverage · '+scope.length+' name records · '+connected+' connected · '+(scope.length-connected)+' need integration/review');
   cell(details,'p',sources.filter(function(s){return s.enabled;}).length+' active feeds · '+c.pending+' queued postings · '+c.review+' require review. A daily plan is not proof that all vacancies have been imported.');
   var box=cell(details,'div','');box.className='job-monitor-table';
   var coverageTable=cell(box,'table',''),h=cell(cell(coverageTable,'thead',''),'tr','');
   ['Company / alias','Connection','Last check (Baku)','Last full listing scan','Details'].forEach(function(t){cell(h,'th',t);});
   var tb=cell(coverageTable,'tbody','');
   scope.forEach(function(s){var tr=cell(tb,'tr','');var matches=sources.filter(function(b){return (s.boards||[]).indexOf(b.board)>=0;});var full=matches.length&&matches.every(function(b){return b.last_full_scan_at;})?matches.map(function(b){return b.last_full_scan_at;}).sort()[0]:null;
    [s.name,s.connector_state==='connected'?'Connected':s.connector_state==='needs_connector'?'Needs connector':s.connector_state==='missing_source'?'Missing careers URL':'Needs review',s.last_checked_at?date(s.last_checked_at):'Not checked',full?date(full):'Not completed',s.last_error||matches.map(function(b){return b.last_error;}).filter(Boolean).join('; ')||'—'].forEach(function(v){cell(tr,'td',v);});
   });
  }
  commit();
 };
})();
