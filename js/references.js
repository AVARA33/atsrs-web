/* ATSRS V234: References & Appraisals are Supabase-only.
   Legacy browser file stores are removed and may never render over server data. */
(function(){
  'use strict';
  var renderTimer=0;
  var observer=null;
  var suppressUntil=0;

  function cloudActive(){
    var user=window.currentUser;
    return !!(user&&user.id&&user.id!=='local_test_user'&&window.supabaseClient&&window.atsrsCloudData&&typeof window.atsrsCloudData.renderFiles==='function');
  }
  function setBuild(){
    document.querySelectorAll('.build-badge').forEach(function(badge){
      var rows=badge.querySelectorAll('div');
      if(rows[0]&&rows[0].textContent!=='ATSRS V376')rows[0].textContent='ATSRS V376';
      if(rows[1]&&rows[1].textContent!=='Last Update: 27 Jul 2026')rows[1].textContent='Last Update: 27 Jul 2026';
    });
  }
  function isLegacyFileKey(key){
    var value=String(key||'');
    return /(?:^|_)(?:v134_(?:appraisal|reference|recommendation|coverLetter)_files|v105_(?:appraisal|reference)_files|appraisalFiles|referenceFiles|recommendationFiles|coverLetterFiles|cvFiles)$/i.test(value)||/^atsrs_file_meta_/i.test(value);
  }
  function clearLegacyBrowserFiles(){
    try{
      var keys=[];
      for(var i=0;i<localStorage.length;i++)keys.push(localStorage.key(i));
      keys.filter(isLegacyFileKey).forEach(function(key){localStorage.removeItem(key);});
    }catch(error){console.warn('ATSRS legacy file cleanup skipped',error);}
    if(!window.indexedDB)return;
    ['ATSRS_FILE_DB_MAIN','ATSRS_FILE_DB_V151'].forEach(function(name){try{indexedDB.deleteDatabase(name);}catch(error){}});
  }
  function renderCloudFiles(){
    clearTimeout(renderTimer);
    if(!cloudActive())return;
    suppressUntil=Date.now()+350;
    Promise.resolve(window.atsrsCloudData.renderFiles()).catch(function(error){console.error('ATSRS cloud file render failed',error);}).then(function(){setBuild();suppressUntil=Date.now()+350;});
  }
  function scheduleRender(delay){
    clearTimeout(renderTimer);
    renderTimer=setTimeout(renderCloudFiles,typeof delay==='number'?delay:30);
  }
  function installCloudOnlyFacade(){
    if(!cloudActive())return;
    window.renderCVStatus=function(){scheduleRender(0);};
    window.renderCoverLetterV146=function(){scheduleRender(0);};
    window.renderManagedFiles=function(){scheduleRender(0);};
  }
  function watchReferencePage(){
    if(observer)return;
    var page=document.getElementById('refsPage');
    if(!page||!window.MutationObserver)return;
    observer=new MutationObserver(function(){
      if(!cloudActive()||Date.now()<suppressUntil)return;
      scheduleRender(25);
    });
    observer.observe(page,{subtree:true,childList:true,characterData:true});
  }
  function run(){
    setBuild();
    installCloudOnlyFacade();
    watchReferencePage();
    scheduleRender(0);
  }

  /* Remove obsolete browser copies before older migration code can see them. */
  clearLegacyBrowserFiles();
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run);else run();
  window.addEventListener('load',function(){run();setTimeout(run,300);setTimeout(run,1000);});

  /* Older ATSRS scripts can repaint later; Supabase always wins the final render. */
  atsrsStableInterval(function(){
    setBuild();
    if(!cloudActive())return;
    installCloudOnlyFacade();
    var page=document.getElementById('refsPage');
    if(page&&!page.classList.contains('hidden'))scheduleRender(0);
  },1200);
})();
