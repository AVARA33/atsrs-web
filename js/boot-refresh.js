/* ATSRS V441: bounded single-flight session-aware refresh loading controller. */
(function(){
  'use strict';
  var finished=false;
  var observer=null;
  var fallbackTimer=0;
  var bootStartedAt=Date.now();
  var BOOT_DEADLINE_MS=5000;

  function byId(id){return document.getElementById(id);}
  function loadAsset(tag,attributes){
    var key=attributes.id;
    if(key&&byId(key))return;
    var element=document.createElement(tag);
    Object.keys(attributes).forEach(function(name){element.setAttribute(name,attributes[name]);});
    (tag==='link'?document.head:document.body).appendChild(element);
  }
  function lockBuildBadge(){
    var badge=byId('buildBadge');
    if(!badge)return;
    var lines=badge.querySelectorAll('div');
    if(lines[0]&&lines[0].textContent!=='ATSRS V384')lines[0].textContent='ATSRS V384';
    if(lines[1]&&lines[1].textContent!=='Last Update: 28 Jul 2026')lines[1].textContent='Last Update: 28 Jul 2026';
  }
  function loadV241(){
    lockBuildBadge();
    loadAsset('link',{id:'atsrsNotificationsCss',rel:'stylesheet',href:'css/notifications.css?v=422'});
    loadAsset('script',{id:'atsrsNotificationsJs',src:'js/notifications.js?v=384'});
  }
  function appIsOpen(){
    var app=byId('app');
    return !!(app && !app.classList.contains('hidden'));
  }
  function finishBoot(){
    if(document.body){
      document.body.classList.remove('atsrs-session-pending');
      document.body.classList.remove('atsrs-booting');
    }
    if(finished)return;
    finished=true;
    if(observer){observer.disconnect();observer=null;}
    if(fallbackTimer){clearTimeout(fallbackTimer);fallbackTimer=0;}
  }
  function watchForOpenApp(){
    var app=byId('app');
    if(!app)return;
    if(appIsOpen()){finishBoot();return;}
    if(observer)return;
    observer=new MutationObserver(function(){if(appIsOpen())finishBoot();});
    observer.observe(app,{attributes:true,attributeFilter:['class']});
  }
  function armFallback(){
    if(finished)return;
    if(fallbackTimer)clearTimeout(fallbackTimer);
    var remaining=BOOT_DEADLINE_MS-(Date.now()-bootStartedAt);
    fallbackTimer=setTimeout(finishBoot,Math.max(0,remaining));
  }
  function resolveSession(){
    loadV241();
    watchForOpenApp();
    var client=window.supabaseClient;
    if(!client||!client.auth||typeof client.auth.getSession!=='function'){
      finishBoot();
      return;
    }
    var sessionRequest=typeof window.atsrsGetSessionSingleFlight==='function'
      ?window.atsrsGetSessionSingleFlight(client)
      :client.auth.getSession();
    sessionRequest.then(function(result){
      var session=result&&result.data&&result.data.session;
      if(!session||!session.user)finishBoot();
    }).catch(finishBoot);
  }

  window.atsrsFinishBoot=finishBoot;
  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',resolveSession,{once:true});
  }else{
    resolveSession();
  }
  window.addEventListener('atsrs:resume',lockBuildBadge);
  document.addEventListener('visibilitychange',function(){
    if(document.visibilityState!=='hidden')armFallback();
  });
  window.addEventListener('pageshow',armFallback);
  armFallback();
})();
