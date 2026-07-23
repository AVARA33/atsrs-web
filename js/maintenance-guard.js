(function(){
  'use strict';
  var endpoint='https://hwtjuqyxzivymofamwxl.supabase.co/functions/v1/system-status';
  var overlay=null;
  var timer=0;

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
    overlay.querySelector('[data-maintenance-retry]').onclick=check;
  }
  async function check(){
    try{
      var response=await fetch(endpoint+'?t='+Date.now(),{cache:'no-store',method:'GET'});
      var status=response.ok?await response.json():{active:false};
      if(status&&status.active)show(status);else remove();
    }catch(error){
      remove();
    }
  }
  function start(){
    check();
    clearInterval(timer);
    timer=setInterval(check,30000);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
  window.addEventListener('atsrs:resume',check);
})();
