(function(){
  'use strict';
  var endpoint='https://hwtjuqyxzivymofamwxl.supabase.co/functions/v1/system-status';
  var overlay=null;
  var timer=0;
  var inFlight=null;
  var lastCheckedAt=0;
  var idleInterval=300000;
  var activeInterval=30000;
  var nextCheckInterval=idleInterval;

  function safe(value){
    return String(value==null?'':value).replace(/[&<>"']/g,function(character){
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character];
    });
  }
  function remove(){
    if(overlay){overlay.remove();overlay=null;}
    if(document.body)document.body.classList.remove('atsrs-maintenance-active');
  }
  function show(status){
    if(!document.body)return;
    if(!overlay){
      overlay=document.createElement('div');
      overlay.className='atsrs-maintenance';
      overlay.setAttribute('role','status');
      overlay.setAttribute('aria-live','polite');
      document.body.appendChild(overlay);
    }
    document.body.classList.add('atsrs-maintenance-active');
    overlay.innerHTML='<div class="atsrs-maintenance-card"><div class="atsrs-maintenance-mark">A</div>'+
      '<h1>'+safe(status.title||'ATSRS improvements are in progress')+'</h1>'+
      '<p>'+safe(status.message||'Some services may be temporarily unavailable. Please try again shortly.')+'</p>'+
      '<button type="button" class="secondary" data-maintenance-retry>Check again</button>'+
      '<span class="atsrs-maintenance-note">Your ATSRS data remains safely stored.</span></div>';
    overlay.querySelector('[data-maintenance-retry]').onclick=function(){check(true);};
  }
  function schedule(delay){
    clearTimeout(timer);
    timer=setTimeout(function(){check(false);},delay);
  }
  function check(force){
    if(inFlight)return inFlight;
    if(document.hidden&&!force){clearTimeout(timer);return Promise.resolve();}
    var elapsed=Date.now()-lastCheckedAt;
    if(!force&&lastCheckedAt&&elapsed<nextCheckInterval){
      schedule(nextCheckInterval-elapsed);
      return Promise.resolve();
    }
    inFlight=(async function(){
      var nextDelay=idleInterval;
      try{
        var response=await fetch(endpoint+'?t='+Date.now(),{cache:'no-store',method:'GET'});
        var status=response.ok?await response.json():{active:false};
        lastCheckedAt=Date.now();
        if(status&&status.active){show(status);nextDelay=activeInterval;}else remove();
      }catch(error){
        lastCheckedAt=Date.now();
        remove();
      }finally{
        nextCheckInterval=nextDelay;
        inFlight=null;
        if(!document.hidden)schedule(nextDelay);
      }
    })();
    return inFlight;
  }
  function start(){
    check(true);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
  document.addEventListener('visibilitychange',function(){
    if(document.hidden){clearTimeout(timer);return;}
    var elapsed=Date.now()-lastCheckedAt;
    if(!lastCheckedAt||elapsed>=nextCheckInterval)check(false);
    else schedule(nextCheckInterval-elapsed);
  });
  window.addEventListener('atsrs:resume',function(){check(false);});
})();
