/* Account-scoped, monotonic read receipts. Local storage is only a legacy import source. */
(function(){
 'use strict';
 var uid=null,reads=new Set(),generation=0,pending=null,lastSync=0,bound=null;
 var legacyKey='atsrs_dismissed_request_notifications';
 function changed(){window.dispatchEvent(new CustomEvent('atsrs:notification-reads-updated'))}
 function reset(){uid=null;reads=new Set();generation++;lastSync=0;changed()}
 function requests(){return typeof window.atsrsGetOwnerShareRequests==='function'?window.atsrsGetOwnerShareRequests():[]}
 function idsOf(rows){return Array.from(new Set(rows.map(function(r){return r.id}).filter(function(id){return /^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(id||'')})))}
 async function identity(){
  var client=window.supabaseClient;if(!client)return null;
  if(bound!==client){bound=client;client.auth.onAuthStateChange(function(event,session){var next=session&&session.user&&session.user.id;if(next!==uid){reset();if(next)setTimeout(function(){sync(true)},0)}})}
  var attempt=generation,result=await client.auth.getSession();if(attempt!==generation)return null;if(result.error)throw result.error;
  var next=result.data.session&&result.data.session.user.id;
  if(next!==uid){reset();uid=next||null}
  return uid?{client:client,uid:uid,generation:generation}:null;
 }
 async function write(context,ids){
  for(var i=0;i<ids.length;i+=100){
   var result=await context.client.from('atsrs_request_notification_reads').upsert(ids.slice(i,i+100).map(function(id){return {user_id:context.uid,request_id:id}}),{onConflict:'user_id,request_id',ignoreDuplicates:true});
   if(result.error)throw result.error;
  }
 }
 async function refresh(){
  var context=await identity();if(!context)return;
  var ids=idsOf(requests()),legacy=[];
  try{var stored=JSON.parse(localStorage.getItem(legacyKey)||'[]');if(Array.isArray(stored))legacy=stored}catch(ignore){}
  // UUID intersection prevents an old shared-browser cache being imported into another account.
  var imported=ids.filter(function(id){return legacy.includes(id)});
  if(imported.length){await write(context,imported);if(context.generation!==generation)return;try{localStorage.setItem(legacyKey,JSON.stringify(legacy.filter(function(id){return !imported.includes(id)})))}catch(ignore){}}
  var next=new Set(reads);
  for(var i=0;i<ids.length;i+=100){
   var result=await context.client.from('atsrs_request_notification_reads').select('request_id').eq('user_id',context.uid).in('request_id',ids.slice(i,i+100));
   if(result.error)throw result.error;
   (result.data||[]).forEach(function(row){next.add(row.request_id)});
  }
  if(context.generation===generation){reads=next;changed()}
 }
 function sync(force){
  if(pending)return pending;
  if(!force&&Date.now()-lastSync<30000)return Promise.resolve();
  lastSync=Date.now();pending=refresh().catch(function(){/* Retain confirmed reads and retry on focus/open. */}).finally(function(){pending=null});return pending;
 }
 async function mark(rows){
  var context=await identity();if(!context)throw new Error('Sign in to mark notifications as read.');
  var ids=idsOf(rows);await write(context,ids);
  if(context.generation===generation){ids.forEach(function(id){reads.add(id)});changed()}
 }
 window.atsrsNotificationReads={has:function(id){return reads.has(id)},sync:sync,mark:mark};
 window.addEventListener('focus',function(){sync(true)});
 window.addEventListener('atsrs:resume',function(){sync(true)});
 window.addEventListener('atsrs:share-requests-updated',function(){sync(true)});
 document.addEventListener('visibilitychange',function(){if(!document.hidden)sync(true)});
 setInterval(function(){if(!document.hidden)sync(false)},30000);
 setTimeout(function(){sync(true)},500);
})();
