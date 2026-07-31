/* Pure normalized workspace-command error and retry policy.
   Transport, timers, circuit state and UI events remain owned by server-data.js. */
(function(root,factory){
  var api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.ATSRSWorkspaceCommandPolicy=api;
})(typeof window!=='undefined'?window:null,function(){
  'use strict';

  function errorCode(error){
    return String(error&&error.code||error&&error.status||'').toUpperCase();
  }
  function message(error){
    return String(error&&error.message||'');
  }
  function isWriteConflict(error){
    return errorCode(error)==='ATSRS_WRITE_CONFLICT';
  }
  function isStaleRevision(error){
    return errorCode(error)==='40001'
      ||message(error).indexOf('ATSRS_STALE_REVISION')!==-1;
  }
  function isStableCompatibilityRefresh(error){
    return message(error).indexOf('ATSRS_STABLE_ID_REFRESH_REQUIRED')!==-1;
  }
  function isDuplicateInsert(error){
    return errorCode(error)==='23505';
  }
  function isWorkspaceBusy(error){
    return errorCode(error)==='55P03'
      ||message(error).indexOf('ATSRS_WORKSPACE_BUSY')>=0;
  }
  function isRateLimited(error){
    return Number(error&&error.status||0)===429
      ||errorCode(error)==='ATSRS_RATE_LIMITED';
  }
  function isRetryable(error){
    if(isWriteConflict(error)||isStaleRevision(error)
      ||isStableCompatibilityRefresh(error)
      ||isWorkspaceBusy(error)||isRateLimited(error)){
      return false;
    }
    var code=errorCode(error);
    var status=Number(error&&error.status||0);
    if(code==='ATSRS_TRANSPORT_TIMEOUT'||code==='ATSRS_REVISION_TIMEOUT')return true;
    if(/^08/.test(code)
      ||code==='PGRST000'||code==='PGRST001'||code==='PGRST002'
      ||code==='PGRST003')return true;
    if(status===408||status===502||status===503||status===504||status===520){
      return true;
    }
    return status===0
      &&/fetch|network|connection|load failed|aborted|timeout|offline/i.test(message(error));
  }
  function requestTimeoutMs(config){
    var value=Number(config&&config.requestTimeoutMs);
    return Number.isFinite(value)&&value>=1000&&value<=60000?value:12000;
  }
  function circuitConfig(config){
    config=config||{};
    return {
      transientRetries:Number.isSafeInteger(Number(config.transientRetries))
        ?Math.max(0,Math.min(2,Number(config.transientRetries))):2,
      failureThreshold:Number.isSafeInteger(Number(config.circuitFailureThreshold))
        ?Math.max(1,Math.min(5,Number(config.circuitFailureThreshold))):2,
      transientOpenMs:Number.isFinite(Number(config.circuitTransientOpenMs))
        ?Math.max(1000,Math.min(120000,Number(config.circuitTransientOpenMs))):15000,
      staleOpenMs:Number.isFinite(Number(config.circuitStaleOpenMs))
        ?Math.max(5000,Math.min(600000,Number(config.circuitStaleOpenMs))):120000,
      busyOpenMs:Number.isFinite(Number(config.circuitBusyOpenMs))
        ?Math.max(1000,Math.min(30000,Number(config.circuitBusyOpenMs))):5000,
      rateLimitOpenMs:Number.isFinite(Number(config.circuitRateLimitOpenMs))
        ?Math.max(1000,Math.min(120000,Number(config.circuitRateLimitOpenMs))):30000
    };
  }
  function transientRetryDelay(attempt,random){
    var base=Math.min(4000,250*Math.pow(2,Math.max(0,Number(attempt)||0)));
    var sample=typeof random==='function'?Number(random()):0;
    if(!Number.isFinite(sample))sample=0;
    sample=Math.max(0,Math.min(0.999999999,sample));
    return base+Math.floor(sample*Math.max(1,Math.floor(base/4)));
  }
  return Object.freeze({
    errorCode:errorCode,
    isWriteConflict:isWriteConflict,
    isStaleRevision:isStaleRevision,
    isStableCompatibilityRefresh:isStableCompatibilityRefresh,
    isDuplicateInsert:isDuplicateInsert,
    isWorkspaceBusy:isWorkspaceBusy,
    isRateLimited:isRateLimited,
    isRetryable:isRetryable,
    requestTimeoutMs:requestTimeoutMs,
    circuitConfig:circuitConfig,
    transientRetryDelay:transientRetryDelay
  });
});
