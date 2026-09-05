/* ATSRS route feature loader: defer optional UI runtimes until first use. */
(function(){
  'use strict';

  var scriptPromises=Object.create(null);
  var sharedRequests=Object.create(null);

  window.atsrsSharedRequest=function(key,factory){
    key=String(key||'');
    if(sharedRequests[key])return sharedRequests[key];
    sharedRequests[key]=Promise.resolve().then(factory).finally(function(){delete sharedRequests[key];});
    return sharedRequests[key];
  };

  function loadScript(src){
    if(scriptPromises[src])return scriptPromises[src];
    scriptPromises[src]=new Promise(function(resolve,reject){
      var existing=document.querySelector('script[data-atsrs-lazy-src="'+src+'"]');
      if(existing){
        if(existing.dataset.atsrsLoaded==='true'){resolve();return;}
        existing.addEventListener('load',resolve,{once:true});
        existing.addEventListener('error',reject,{once:true});
        return;
      }
      var script=document.createElement('script');
      script.src=src;
      script.async=true;
      script.dataset.atsrsLazySrc=src;
      script.addEventListener('load',function(){script.dataset.atsrsLoaded='true';resolve();},{once:true});
      script.addEventListener('error',function(){
        delete scriptPromises[src];
        reject(new Error('ATSRS optional feature could not be loaded: '+src));
      },{once:true});
      document.head.appendChild(script);
    });
    return scriptPromises[src];
  }

  function loadJobs(){
    return loadScript('js/jobs-prototype.js?v=6067');
  }

  function loadRecruiters(){
    return loadScript('js/recruiters.js?v=6062');
  }

  function loadEmployers(){
    return loadScript('js/employers.js?v=6063');
  }

  var focusRecruiterStub=function(){
    var context=this,args=arguments;
    return loadRecruiters().then(function(){
      if(window.focusRecruiterCard===focusRecruiterStub)throw new Error('ATSRS recruiter directory did not initialise.');
      return window.focusRecruiterCard.apply(context,args);
    }).catch(report);
  };
  if(typeof window.focusRecruiterCard!=='function')window.focusRecruiterCard=focusRecruiterStub;

  function loadQrUpload(){
    return loadScript('vendor/qrcode-generator-1.4.4.js?v=535')
      .then(function(){return loadScript('js/document-qr-upload-v535.js?v=541');});
  }

  function loadPreview(){
    return loadScript('js/product-experience.js?v=451');
  }

  function report(error){
    console.error(error);
    if(typeof window.alert==='function')window.alert('This feature could not be loaded. Check your connection and try again.');
  }

  var qrStub=function(){
    var context=this,args=arguments;
    return loadQrUpload().then(function(){
      if(window.openDocumentQrUpload===qrStub)throw new Error('ATSRS QR upload did not initialise.');
      return window.openDocumentQrUpload.apply(context,args);
    }).catch(report);
  };
  window.openDocumentQrUpload=qrStub;

  var previewStub=function(){
    var context=this,args=arguments;
    return loadPreview().then(function(){
      if(window.atsrsOpenFilePreview===previewStub)throw new Error('ATSRS file preview did not initialise.');
      return window.atsrsOpenFilePreview.apply(context,args);
    }).catch(report);
  };
  window.atsrsOpenFilePreview=previewStub;

  var baseShowPage=window.showPage;
  if(typeof baseShowPage==='function'){
    window.showPage=function(page){
      var result=baseShowPage.apply(this,arguments);
      page=String(page||'');
      if(page==='jobs')loadJobs().catch(report);
      else if(page==='recruiters')loadRecruiters().catch(report);
      else if(page==='employers')loadEmployers().catch(report);
      return result;
    };
    window.showPage.__atsrsRouteFeatureLoader=true;
  }

  var jobsPage=document.getElementById('jobsPage');
  if(jobsPage&&!jobsPage.classList.contains('hidden'))loadJobs().catch(report);
  var recruitersPage=document.getElementById('recruitersPage');
  if(recruitersPage&&!recruitersPage.classList.contains('hidden'))loadRecruiters().catch(report);
  var employersPage=document.getElementById('employersPage');
  if(employersPage&&!employersPage.classList.contains('hidden'))loadEmployers().catch(report);

  window.atsrsOpenJobsDirectory=function(page,button){
    if(typeof window.showPage==='function')window.showPage(page,button);
    page=String(page||'');
    var loader=page==='jobs'?loadJobs:page==='recruiters'?loadRecruiters:page==='employers'?loadEmployers:null;
    if(!loader)return Promise.resolve();
    return loader().then(function(){if(page==='jobs')window.dispatchEvent(new CustomEvent('atsrs:jobs-nav'));}).catch(report);
  };

  window.atsrsRouteFeatures={loadJobs:loadJobs,loadRecruiters:loadRecruiters,loadEmployers:loadEmployers,loadQrUpload:loadQrUpload,loadPreview:loadPreview};
})();

