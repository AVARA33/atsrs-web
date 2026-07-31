/* Pure stable-ID compatibility policy helpers.
   Network transport, cache storage and UI events remain owned by server-data.js. */
(function(root,factory){
  var api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.ATSRSStableIdCompatibilityRuntime=api;
})(typeof window!=='undefined'?window:null,function(){
  'use strict';

  function config(root){
    return root&&root.__ATSRS_STABLE_ID_COMPATIBILITY__||{};
  }

  function cacheMs(value){
    var duration=Number(value&&value.cacheMs);
    return Number.isFinite(duration)
      ?Math.max(1000,Math.min(300000,duration))
      :60000;
  }

  function refreshRequired(state){
    return Boolean(
      state&&(state.refresh_required||state.client_compatible===false)
    );
  }

  async function requested(options){
    options=options||{};
    var gate=options.config||{};
    if(gate.enabled)return true;
    if(!options.context||!Array.isArray(gate.scopeHashes)
      ||!gate.scopeHashes.length)return false;
    var queryKey=String(
      gate.canaryQueryKey||'atsrsStableCompatibility'
    ).slice(0,64);
    var canary=false;
    try{
      canary=new URLSearchParams(String(options.locationSearch||''))
        .get(queryKey)==='canary';
    }catch(_error){canary=false;}
    if(!canary)return false;
    if(typeof options.getScopeHash!=='function')return false;
    var scopeHash=await options.getScopeHash();
    return gate.scopeHashes.indexOf(scopeHash)>=0;
  }

  return Object.freeze({
    config:config,
    cacheMs:cacheMs,
    refreshRequired:refreshRequired,
    requested:requested
  });
});
