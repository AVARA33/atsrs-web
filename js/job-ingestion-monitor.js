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
  var target=host,oldTable=target.querySelector('.job-monitor-table');
  var tableScroll=oldTable?oldTable.scrollLeft:0;
  host=document.createElement('div');
  function commit(){target.replaceChildren(...host.children);var t=target.querySelector('.job-monitor-table');if(t)t.scrollLeft=tableScroll;if(restoreFocus)refresh.focus({preventScroll:true});}
  var header=cell(host,'div','');header.className='job-monitor-header';
  cell(header,'h2','AI balance & HR activity');
  var refresh=cell(header,'button','Refresh');refresh.type='button';refresh.className='btn';refresh.onclick=window.atsrsRefreshJobMonitor;
  if(result.error||!result.data){cell(host,'p','Statistics unavailable. Refresh to retry.');commit();return;}
  var d=result.data, b=d.balance;
  var metrics=cell(host,'div','');metrics.className='job-monitor-metrics';
  [['Shared API balance · last verified',b?'$'+Number(b.amount_usd).toFixed(2):'Unavailable'],['HR today · calculated',money(d.today_cost)],['HR this month · calculated',money(d.month_cost)],['HR monthly limit',money(d.monthly_limit)],['Reserved · unresolved',money(d.unresolved_reserve)],['AI Scan cost','Not connected']].forEach(function(p){var box=cell(metrics,'div','');cell(box,'span',p[0]);cell(box,'strong',p[1]);});
  cell(host,'p','Shared balance is not live'+(b?' — verified '+date(b.checked_at)+' (Baku)':'')+'. Refresh does not recheck the OpenAI balance. AI Scan and HR use the same balance.');
  var link=cell(host,'a','Check current balance in OpenAI');link.href='https://platform.openai.com/settings/organization/billing/overview';link.target='_blank';link.rel='noopener noreferrer';
  cell(host,'p','HR statistics refreshed '+date(d.refreshed_at)+' (Baku). '+(d.enabled?'Enabled':'Paused')+' · Mon–Fri, 09:00–17:00 Baku · hourly.');
  cell(host,'p','HR costs are calculated from recorded tokens, not an invoice or total account spend. Reservations are separate. AI Scan costs are not included.');
  var wrap=cell(host,'div','');wrap.className='job-monitor-table';var table=cell(wrap,'table','');
  cell(table,'caption','Daily HR statistics · last 30 days · Baku time');
  var head=cell(cell(table,'thead',''),'tr','');['Date','HR cost (USD)','Reserved (USD)','AI calls','New jobs','Updated jobs','Run errors'].forEach(function(t){var th=cell(head,'th',t);th.scope='col';});
  var body=cell(table,'tbody','');
  (d.daily||[]).forEach(function(r){var tr=cell(body,'tr','');[r.day,money(r.cost),money(r.reserved),r.calls,r.published,r.updated,r.errors].forEach(function(t){cell(tr,'td',t);});});
  commit();
 };
})();
