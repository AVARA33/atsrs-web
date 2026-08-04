/* ATSRS shared, deterministic document-expiry contract. */
(function(root,factory){
  var api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.atsrsExpiryStatus=api;
})(typeof window!=='undefined'?window:globalThis,function(){
  'use strict';

  var DAY_MS=86400000;
  var ISO_DATE=/^\d{4}-\d{2}-\d{2}$/;

  function utcDay(value){
    var date=value instanceof Date?value:new Date(value);
    if(!Number.isFinite(date.getTime()))return NaN;
    return Date.UTC(date.getUTCFullYear(),date.getUTCMonth(),date.getUTCDate());
  }

  function classify(expiry,now){
    var value=String(expiry==null?'':expiry).trim();
    if(!value||value.toUpperCase()==='N/A'){
      return{bucket:'current',dateState:'no_expiry',days:null,label:'No expiry',review:false};
    }
    if(!ISO_DATE.test(value)){
      return{bucket:'current',dateState:'unconfirmed',days:null,label:'Date not confirmed',review:true};
    }
    var target=Date.parse(value+'T00:00:00Z');
    var today=utcDay(now||new Date());
    if(!Number.isFinite(target)||!Number.isFinite(today)){
      return{bucket:'current',dateState:'unconfirmed',days:null,label:'Date not confirmed',review:true};
    }
    var days=Math.round((target-today)/DAY_MS);
    if(days<0)return{bucket:'expired',dateState:'dated',days:days,label:'Expired',review:true};
    if(days===0)return{bucket:'expires_today',dateState:'dated',days:0,label:'Expires today',review:true};
    if(days<=30)return{bucket:'expiring_1_30',dateState:'dated',days:days,label:days+' days remaining',review:true};
    if(days<=90)return{bucket:'expiring_31_90',dateState:'dated',days:days,label:'Expires within '+days+' days',review:true};
    return{bucket:'current',dateState:'dated',days:days,label:'Current',review:false};
  }

  function summarize(items,getExpiry,now){
    var counts={
      total:0,current:0,expiring_31_90:0,expiring_1_30:0,
      expires_today:0,expired:0,unconfirmed:0
    };
    (Array.isArray(items)?items:[]).forEach(function(item){
      var result=classify(typeof getExpiry==='function'?getExpiry(item):item&&item.expiry,now);
      counts.total+=1;
      counts[result.bucket]+=1;
      if(result.dateState==='unconfirmed')counts.unconfirmed+=1;
    });
    counts.review=counts.expiring_31_90+counts.expiring_1_30+counts.expires_today+counts.expired+counts.unconfirmed;
    return counts;
  }

  return{classify:classify,summarize:summarize};
});
