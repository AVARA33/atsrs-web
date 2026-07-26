/* ATSRS V350: session-aware refresh loading controller + notification assets. */
(function(){
  'use strict';
  var finished=false;
  var observer=null;
  var fallbackTimer=0;

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
    if(lines[0]&&lines[0].textContent!=='ATSRS V350')lines[0].textContent='ATSRS V350';
    if(lines[1]&&lines[1].textContent!=='Last Update: 26 Jul 2026')lines[1].textContent='Last Update: 26 Jul 2026';
  }
  function loadV241(){
    lockBuildBadge();
    loadAsset('link',{id:'atsrsNotificationsCss',rel:'stylesheet',href:'css/notifications.css?v=350'});
    loadAsset('script',{id:'atsrsNotificationsJs',src:'js/notifications.js?v=350'});
  }
  function appIsOpen(){
    var app=byId('app');
    return !!(app && !app.classList.contains('hidden'));
  }
  function finishBoot(){
    if(finished)return;
    finished=true;
    if(observer){observer.disconnect();observer=null;}
    if(fallbackTimer){clearTimeout(fallbackTimer);fallbackTimer=0;}
    if(document.body){
      document.body.classList.remove('atsrs-session-pending');
      document.body.classList.remove('atsrs-booting');
    }
  }
  function watchForOpenApp(){
    var app=byId('app');
    if(!app)return;
    if(appIsOpen()){finishBoot();return;}
    observer=new MutationObserver(function(){if(appIsOpen())finishBoot();});
    observer.observe(app,{attributes:true,attributeFilter:['class']});
  }
  function resolveSession(){
    loadV241();
    watchForOpenApp();
    var client=window.supabaseClient;
    if(!client||!client.auth||typeof client.auth.getSession!=='function'){
      finishBoot();
      return;
    }
    client.auth.getSession().then(function(result){
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
  fallbackTimer=setTimeout(finishBoot,12000);
})();
