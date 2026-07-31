/* ATSRS stable-ID compatibility gate.
   Default-off until the staging and production canary gates are approved. */
(function(root,factory){
  var config=factory();
  if(typeof module==='object'&&module.exports)module.exports=config;
  if(root){
    root.__ATSRS_STABLE_ID_COMPATIBILITY__=config;
    root.ATSRS_CLIENT_BUILD=config.clientBuild;
  }
})(typeof window!=='undefined'?window:null,function(){
  'use strict';
  return {
    enabled:false,
    clientBuild:'V405',
    cacheMs:60000,
    canaryQueryKey:'atsrsStableCompatibility',
    scopeHashes:[]
  };
});
