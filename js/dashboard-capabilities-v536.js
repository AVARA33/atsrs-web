/* ATSRS V536 — live dashboard capability statuses. */
(function(){
  'use strict';
  var lastPreferenceCheck=0;
  var preferenceRequest=null;

  function byId(id){return document.getElementById(id);}
  function mode(){
    var value='';
    try{value=localStorage.getItem('atsrs_use_mode')||localStorage.getItem('atsrs_account_type')||window.useMode||'';}catch(error){}
    value=String(value).toLowerCase();
    return value==='company'||value==='corporate'?'company':'personal';
  }
  function dashboardVisible(){
    var page=byId('dashboardPage');
    return Boolean(page&&!page.classList.contains('hidden'));
  }
  function setStatus(element,text,state){
    if(!element)return;
    element.textContent=text;
    element.classList.remove('is-live','is-enabled','is-disabled','is-checking');
    if(state)element.classList.add('is-'+state);
  }
  function visibleCards(){
    var panel=byId('dashboardCapabilities');
    return panel?Array.from(panel.querySelectorAll('.dashboard-capability-card')).filter(function(card){return getComputedStyle(card).display!=='none';}):[];
  }
  function syncCount(){
    var count=byId('dashboardCapabilitiesCount');
    if(count)count.textContent=String(visibleCards().length)+' available';
  }
  function syncVisibility(){
    var status=byId('dashboardVisibilityStatus');
    if(!status)return;
    var select=byId('profileVisibility');
    var value=select&&select.value||'Private';
    setStatus(status,value,value==='Public'?'enabled':'');
  }
  function applyEmailPreference(enabled){
    setStatus(byId('dashboardEmailAlertStatus'),enabled===false?'Off':'Enabled',enabled===false?'disabled':'enabled');
  }
  async function loadEmailPreference(force){
    if(!dashboardVisible())return;
    if(!force&&Date.now()-lastPreferenceCheck<30000)return;
    if(preferenceRequest)return preferenceRequest;
    var client=window.supabaseClient,user=window.currentUser;
    if(!client||!user||!user.id){
      setStatus(byId('dashboardEmailAlertStatus'),'Available','live');
      return;
    }
    setStatus(byId('dashboardEmailAlertStatus'),'Checking','checking');
    preferenceRequest=client.from('atsrs_notification_preferences')
      .select('email_enabled')
      .eq('user_id',user.id)
      .eq('account_type',mode())
      .maybeSingle()
      .then(function(result){
        lastPreferenceCheck=Date.now();
        if(result.error){setStatus(byId('dashboardEmailAlertStatus'),'Available','live');return;}
        applyEmailPreference(!result.data||result.data.email_enabled!==false);
      })
      .catch(function(){setStatus(byId('dashboardEmailAlertStatus'),'Available','live');})
      .finally(function(){preferenceRequest=null;});
    return preferenceRequest;
  }
  function sync(force){
    if(!dashboardVisible())return;
    requestAnimationFrame(syncCount);
    syncVisibility();
    loadEmailPreference(Boolean(force));
  }
  function wrap(name){
    var original=window[name];
    if(typeof original!=='function'||original.__atsrsCapabilitiesWrapped)return;
    var wrapped=function(){
      var result=original.apply(this,arguments);
      setTimeout(sync,0);
      return result;
    };
    wrapped.__atsrsCapabilitiesWrapped=true;
    window[name]=wrapped;
  }
  function start(){
    wrap('showPage');
    wrap('renderAll');
    var visibility=byId('profileVisibility');
    if(visibility)visibility.addEventListener('change',syncVisibility);
    window.addEventListener('atsrs:notification-preferences',function(event){
      if(event&&event.detail&&typeof event.detail.emailEnabled==='boolean')applyEmailPreference(event.detail.emailEnabled);
      else loadEmailPreference(true);
    });
    window.addEventListener('atsrs:data-hydrated',function(){sync(true);});
    window.addEventListener('atsrs:workspace-changed',function(){sync(true);});
    window.addEventListener('atsrs:resume',function(){sync(true);});
    window.addEventListener('resize',syncCount,{passive:true});
    sync(true);
  }
  window.atsrsDashboardCapabilities={sync:sync,applyEmailPreference:applyEmailPreference};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();
