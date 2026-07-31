(function(){
  'use strict';

  var tasks=new Map();
  var nextTaskId=1;
  var wakeTimer=0;
  var recoveryTimer=0;
  var buildObserver=null;
  var requestFlights=new Map();
  var BUILD='ATSRS '+String(document.documentElement.dataset.atsrsBuild||'').trim();
  var UPDATE='Last Update: '+String(document.documentElement.dataset.atsrsUpdate||'').trim();
  var performanceMetrics={
    lcp:0,
    cls:0,
    inp:0,
    longTaskCount:0,
    longTaskMs:0,
    navigationMs:0
  };

  function visible(){return document.visibilityState!=='hidden';}
  function publishPerformanceMetrics(){
    var dataset=document.documentElement.dataset;
    dataset.atsrsLcp=String(Math.round(performanceMetrics.lcp));
    dataset.atsrsCls=String(Math.round(performanceMetrics.cls*10000)/10000);
    dataset.atsrsInp=String(Math.round(performanceMetrics.inp));
    dataset.atsrsLongTaskCount=String(performanceMetrics.longTaskCount);
    dataset.atsrsLongTaskMs=String(Math.round(performanceMetrics.longTaskMs));
    dataset.atsrsNavigationMs=String(Math.round(performanceMetrics.navigationMs));
  }
  function observePerformance(type,callback,options){
    if(typeof window.PerformanceObserver!=='function')return;
    try{
      var observer=new window.PerformanceObserver(function(list){
        list.getEntries().forEach(callback);
        publishPerformanceMetrics();
      });
      observer.observe(Object.assign({type:type,buffered:true},options||{}));
    }catch(_error){}
  }
  function installPerformanceMetrics(){
    publishPerformanceMetrics();
    observePerformance('largest-contentful-paint',function(entry){
      performanceMetrics.lcp=Math.max(performanceMetrics.lcp,entry.startTime||0);
    });
    observePerformance('layout-shift',function(entry){
      if(!entry.hadRecentInput)performanceMetrics.cls+=Number(entry.value)||0;
    });
    observePerformance('event',function(entry){
      if(entry.interactionId){
        performanceMetrics.inp=Math.max(performanceMetrics.inp,entry.duration||0);
      }
    },{durationThreshold:40});
    observePerformance('longtask',function(entry){
      performanceMetrics.longTaskCount+=1;
      performanceMetrics.longTaskMs+=Number(entry.duration)||0;
    });
    window.addEventListener('load',function(){
      setTimeout(function(){
        try{
          var navigation=window.performance
            &&window.performance.getEntriesByType('navigation')[0];
          if(navigation)performanceMetrics.navigationMs=navigation.loadEventEnd||0;
        }catch(_error){}
        publishPerformanceMetrics();
      },0);
    });
  }
  function singleFlight(key,operation){
    var flightKey=String(key||'default');
    if(requestFlights.has(flightKey))return requestFlights.get(flightKey);
    var shared=Promise.resolve().then(operation).finally(function(){
      if(requestFlights.get(flightKey)===shared)requestFlights.delete(flightKey);
    });
    requestFlights.set(flightKey,shared);
    return shared;
  }
  function getSessionSingleFlight(client){
    if(!client||!client.auth||typeof client.auth.getSession!=='function'){
      return Promise.resolve({data:{session:null}});
    }
    if(!client.auth.__atsrsSingleFlightInstalled){
      var nativeGetSession=client.auth.getSession.bind(client.auth);
      client.auth.getSession=function(){
        return singleFlight('auth:get-session',nativeGetSession);
      };
      client.auth.__atsrsSingleFlightInstalled=true;
    }
    return client.auth.getSession();
  }
  function clearWake(){if(wakeTimer){clearTimeout(wakeTimer);wakeTimer=0;}}
  function nextDelay(){
    var now=Date.now();
    var nearest=Infinity;
    tasks.forEach(function(task){if(!task.running&&task.next<nearest)nearest=task.next;});
    if(nearest===Infinity)return 5000;
    return Math.min(5000,Math.max(80,nearest-now));
  }
  function schedule(){
    clearWake();
    if(!visible()||!tasks.size)return;
    wakeTimer=setTimeout(runDue,nextDelay());
  }
  function finishTask(task){
    task.running=false;
    task.next=Date.now()+task.delay;
    schedule();
  }
  function runDue(){
    wakeTimer=0;
    if(!visible()){return;}
    var now=Date.now();
    tasks.forEach(function(task){
      if(task.running||task.next>now)return;
      task.running=true;
      try{
        var result=task.callback();
        if(result&&typeof result.then==='function'){
          Promise.resolve(result).then(function(){finishTask(task);},function(error){console.error(error);finishTask(task);});
        }else finishTask(task);
      }catch(error){console.error(error);finishTask(task);}
    });
    schedule();
  }
  function stableInterval(callback,delay){
    if(typeof callback!=='function')throw new TypeError('ATSRS scheduler requires a function.');
    var id=nextTaskId++;
    var safeDelay=Math.max(5000,Number(delay)||5000);
    tasks.set(id,{callback:callback,delay:safeDelay,next:Date.now()+safeDelay,running:false});
    schedule();
    return id;
  }
  function clearStableInterval(id){tasks.delete(id);schedule();}
  function setBuildBadge(){
    var badge=document.getElementById('buildBadge');
    if(!badge)return;
    var lines=badge.querySelectorAll('div');
    if(lines.length<2){badge.innerHTML='<div>'+BUILD+'</div><div>'+UPDATE+'</div>';return;}
    if(lines[0].textContent!==BUILD)lines[0].textContent=BUILD;
    if(lines[1].textContent!==UPDATE)lines[1].textContent=UPDATE;
  }
  function watchBuildBadge(){
    var badge=document.getElementById('buildBadge');
    if(!badge||buildObserver)return;
    setBuildBadge();
    buildObserver=new MutationObserver(setBuildBadge);
    buildObserver.observe(badge,{subtree:true,childList:true,characterData:true});
  }
  function recoverSession(){
    recoveryTimer=0;
    if(!visible()||navigator.onLine===false)return;
    setBuildBadge();
    window.dispatchEvent(new CustomEvent('atsrs:resume'));
    var client=window.supabaseClient;
    if(!client||!client.auth||typeof client.auth.getSession!=='function')return;
    getSessionSingleFlight(client).then(function(result){
      var session=result&&result.data&&result.data.session;
      if(!session||!session.expires_at||typeof client.auth.refreshSession!=='function')return;
      if((Number(session.expires_at)*1000)-Date.now()<300000){
        return client.auth.refreshSession();
      }
    }).catch(function(error){console.warn('ATSRS session recovery skipped',error);});
  }
  function queueRecovery(){
    if(recoveryTimer)clearTimeout(recoveryTimer);
    recoveryTimer=setTimeout(recoverSession,250);
  }
  function resumeTasks(){
    var now=Date.now();
    var offset=120;
    tasks.forEach(function(task){task.next=now+offset;offset+=90;});
    schedule();
    queueRecovery();
  }

  window.ATSRS_BUILD=BUILD;
  window.ATSRS_UPDATE=UPDATE;
  window.atsrsStableInterval=stableInterval;
  window.atsrsClearStableInterval=clearStableInterval;
  window.atsrsSetBuildBadge=setBuildBadge;
  window.atsrsSingleFlight=singleFlight;
  window.atsrsGetSessionSingleFlight=getSessionSingleFlight;
  window.atsrsPerformanceSnapshot=function(){
    return Object.assign({},performanceMetrics);
  };
  installPerformanceMetrics();
  watchBuildBadge();
  document.addEventListener('visibilitychange',function(){if(visible())resumeTasks();else clearWake();});
  window.addEventListener('pageshow',resumeTasks);
  window.addEventListener('online',resumeTasks);
  window.addEventListener('pagehide',clearWake);
})();
