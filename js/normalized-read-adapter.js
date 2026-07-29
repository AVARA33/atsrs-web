/* ATSRS normalized-read cutover preparation.
   This module cannot switch the application read source. It builds equivalent
   domain models and proves whether a normalized result is safe for a canary. */
(function(root,factory){
  var comparator=null;
  if(typeof module==='object'&&module.exports){
    comparator=require('./shadow-read.js');
    module.exports=factory(comparator);
    return;
  }
  comparator=root&&root.atsrsShadowRead;
  if(root)root.atsrsNormalizedReadAdapter=factory(comparator);
})(typeof window!=='undefined'?window:null,function(shadow){
  'use strict';

  var ENTITIES=['personnel','certificates','projects','assignments'];

  function sortedModel(rows){
    return ENTITIES.reduce(function(output,entity){
      output[entity]=(rows[entity]||[]).map(function(item){
        return {id:String(item.id),canonical:item.canonical};
      }).sort(function(left,right){
        return left.id.localeCompare(right.id);
      });
      return output;
    },{});
  }

  function legacyModel(input){
    return sortedModel(shadow.buildSource(
      input.legacy,
      input.workspace,
      input.email||''
    ));
  }

  function normalizedModel(input){
    return sortedModel(shadow.buildTarget(input.normalized));
  }

  function enabledCanary(flag){
    return flag===true||flag==='canary';
  }

  async function evaluate(input){
    if(!shadow||typeof shadow.compare!=='function'){
      throw new Error('Normalized read comparator is unavailable');
    }
    var legacy=legacyModel(input);
    var result={
      mode:enabledCanary(input.featureFlag)?'canary':'legacy',
      authoritative_source:'legacy_json',
      selected_source:'legacy_json',
      cutover_enabled:false,
      normalized_candidate:false,
      fallback_reason:null,
      legacy_model:legacy,
      normalized_model:null,
      parity:null
    };
    if(!enabledCanary(input.featureFlag)){
      result.fallback_reason='feature_flag_off';
      return result;
    }
    try{
      var parity=await shadow.compare(input);
      result.parity=parity;
      if(parity.status!=='match'||parity.mismatch_count!==0||parity.skipped_count!==0){
        result.fallback_reason='parity_gate_failed';
        return result;
      }
      result.normalized_model=normalizedModel(input);
      result.normalized_candidate=true;
      return result;
    }catch(error){
      result.fallback_reason='normalized_read_unavailable';
      return result;
    }
  }

  return {
    evaluate:evaluate,
    legacyModel:legacyModel,
    normalizedModel:normalizedModel,
    specification:{
      modes:['legacy','canary'],
      default_mode:'legacy',
      authoritative_source:'legacy_json',
      fallback_source:'legacy_json',
      cutover_enabled:false,
      candidate_gate:'exact canonical parity with zero skipped records',
      mutation:false
    }
  };
});
