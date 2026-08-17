/* ATSRS route feature loader: defer optional UI runtimes until first use. */
(function(){
  'use strict';

  var scriptPromises=Object.create(null);

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
    return loadScript('js/jobs-prototype.js?v=58138');
  }

  function loadQrUpload(){
    return loadScript('vendor/qrcode-generator-1.4.4.js?v=535')
      .then(function(){return loadScript('js/document-qr-upload-v535.js?v=541');});
  }

  function loadPreview(){
    return loadScript('js/product-experience.js?v=447');
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
      if(String(page||'')==='jobs')loadJobs().catch(report);
      return result;
    };
    window.showPage.__atsrsRouteFeatureLoader=true;
  }

  var jobsPage=document.getElementById('jobsPage');
  if(jobsPage&&!jobsPage.classList.contains('hidden'))loadJobs().catch(report);

  window.atsrsRouteFeatures={loadJobs:loadJobs,loadQrUpload:loadQrUpload,loadPreview:loadPreview};
})();
