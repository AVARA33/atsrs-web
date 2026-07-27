(function(){
  'use strict';

  var tasks=new Map();
  var nextTaskId=1;
  var wakeTimer=0;
  var recoveryTimer=0;
  var BUILD='ATSRS V370';
  var UPDATE='Last Update: 27 Jul 2026';

  function visible(){return document.visibilityState!=='hidden';}
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
  function recoverSession(){
    recoveryTimer=0;
    if(!visible()||navigator.onLine===false)return;
    setBuildBadge();
    window.dispatchEvent(new CustomEvent('atsrs:resume'));
    var client=window.supabaseClient;
    if(!client||!client.auth||typeof client.auth.getSession!=='function')return;
    client.auth.getSession().then(function(result){
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
  document.addEventListener('visibilitychange',function(){if(visible())resumeTasks();else clearWake();});
  window.addEventListener('pageshow',resumeTasks);
  window.addEventListener('online',resumeTasks);
  window.addEventListener('pagehide',clearWake);
})();
