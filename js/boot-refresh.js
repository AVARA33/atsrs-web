/* ATSRS V237: session-aware refresh loading controller. */
(function(){
  'use strict';
  var finished=false;
  var observer=null;
  var fallbackTimer=0;

  function byId(id){return document.getElementById(id);}
  function appIsOpen(){
    var app=byId('app');
    return !!(app && !app.classList.contains('hidden'));
  }
  function finishBoot(){
    if(finished) return;
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
    if(!app) return;
    if(appIsOpen()){finishBoot();return;}
    observer=new MutationObserver(function(){
      if(appIsOpen()) finishBoot();
    });
    observer.observe(app,{attributes:true,attributeFilter:['class']});
  }
  function resolveSession(){
    watchForOpenApp();
    var client=window.supabaseClient;
    if(!client || !client.auth || typeof client.auth.getSession!=='function'){
      finishBoot();
      return;
    }
    client.auth.getSession().then(function(result){
      var session=result && result.data && result.data.session;
      if(!session || !session.user) finishBoot();
    }).catch(finishBoot);
  }

  window.atsrsFinishBoot=finishBoot;
  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',resolveSession,{once:true});
  }else{
    resolveSession();
  }
  fallbackTimer=setTimeout(finishBoot,12000);
})();
