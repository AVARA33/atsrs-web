(function (root,factory) {
  var api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.atsrsEntitlementCalculator=api;
})(typeof window!=='undefined'?window:globalThis,function(){
  'use strict';
  function integer(value){var parsed=Number(value);return Number.isFinite(parsed)?Math.trunc(parsed):0}
  function available(service){return Math.max(0,integer(service.plan_default)+integer(service.purchased)+integer(service.manual)-integer(service.used))}
  function preview(service,source,mode,quantity){
    var amount=Math.max(1,integer(quantity)||1),delta=(mode==='remove'?-1:1)*amount,bucket=source==='purchased'?'purchased':'manual',current=integer(service[bucket]),next=bucket==='purchased'?Math.max(0,current+delta):current+delta,projected={plan_default:integer(service.plan_default),purchased:integer(service.purchased),manual:integer(service.manual),used:integer(service.used)};projected[bucket]=next;
    return{delta:delta,source:bucket,sourceCurrent:current,sourceNext:next,available:available(projected)}
  }
  return{available:available,preview:preview};
});
