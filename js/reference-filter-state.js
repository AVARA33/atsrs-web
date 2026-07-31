/* Deterministic state authority for References sort controls. */
(function(root,factory){
  'use strict';
  var exported=factory();
  if(typeof module==='object'&&module.exports)module.exports=exported;
  if(root&&root.document)root.atsrsReferenceFilterState=exported.install(root.document);
})(typeof window!=='undefined'?window:globalThis,function(){
  'use strict';
  var KINDS=['appraisal','reference','recommendation','coverLetter'];

  function createAuthority(apply){
    var generation=0;
    var scope='';
    var states=new Map();

    function stateFor(kind){
      if(!states.has(kind))states.set(kind,{disabled:true,pending:true,count:0});
      return states.get(kind);
    }
    function emit(kind){
      var state=stateFor(kind);
      apply(kind,{disabled:state.disabled,pending:state.pending,count:state.count,scope:scope,generation:generation});
    }
    function begin(options){
      var nextScope=String(options&&options.scope||'');
      var changed=nextScope!==scope;
      scope=nextScope;
      generation+=1;
      if(changed||!states.size){
        KINDS.forEach(function(kind){states.set(kind,{disabled:true,pending:true,count:0});emit(kind);});
      }
      return {scope:scope,generation:generation};
    }
    function mount(kind){
      if(KINDS.indexOf(kind)<0)return false;
      emit(kind);
      return true;
    }
    function settle(kind,count,token){
      if(KINDS.indexOf(kind)<0)return false;
      if(!token||token.scope!==scope||token.generation!==generation)return false;
      var normalized=Math.max(0,Number(count)||0);
      states.set(kind,{disabled:normalized===0,pending:false,count:normalized});
      emit(kind);
      return true;
    }
    function snapshot(kind){
      var state=stateFor(kind);
      return {disabled:state.disabled,pending:state.pending,count:state.count,scope:scope,generation:generation};
    }
    return {begin:begin,mount:mount,settle:settle,snapshot:snapshot,kinds:KINDS.slice()};
  }

  function install(doc){
    var authority=createAuthority(function(kind,state){
      var filter=doc.getElementById('v134_'+kind+'_filter');
      if(!filter)return;
      filter.classList.add('active');
      filter.disabled=state.disabled;
      filter.setAttribute('aria-busy',state.pending?'true':'false');
      filter.dataset.atsrsFilterState=state.pending?'pending':(state.disabled?'empty':'ready');
      filter.dataset.atsrsFilterGeneration=String(state.generation);
    });
    authority.cloudOwns=function(){
      var view=doc.defaultView;
      if(!view)return false;
      var value=view.currentUser;
      return !!(value&&value.id&&value.id!=='local_test_user'&&view.supabaseClient);
    };
    return authority;
  }

  return {createAuthority:createAuthority,install:install,kinds:KINDS.slice()};
});
