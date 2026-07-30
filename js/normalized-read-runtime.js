/* ATSRS normalized-read browser canary.
   Default-off, read-only and fail-closed: legacy JSON always remains selected. */
(function(root,factory){
  var adapter=null;
  if(typeof module==='object'&&module.exports){
    adapter=require('./normalized-read-adapter.js');
    module.exports=factory(adapter);
    return;
  }
  adapter=root&&root.atsrsNormalizedReadAdapter;
  if(root)root.atsrsNormalizedReadRuntime=factory(adapter);
})(typeof window!=='undefined'?window:null,function(adapter){
  'use strict';

  var TABLES={
    personnel:{
      name:'atsrs_workspace_personnel',
      columns:'id,source_entity_id,workspace_user_id,workspace_account_type,linked_user_id,first_name,last_name,position,company_name,email,phone,whatsapp,nationality,employee_id,source,access_status,linked_status,tracker_status,phone_verified,whatsapp_verified,metadata'
    },
    certificates:{
      name:'atsrs_personnel_certificates',
      columns:'id,source_entity_id,workspace_user_id,workspace_account_type,personnel_id,file_id,certificate_type,provider_name,document_number,issuing_country,issue_date,expiry_date,metadata'
    },
    projects:{
      name:'atsrs_workspace_projects',
      columns:'id,source_entity_id,workspace_user_id,workspace_account_type,project_name,vessel_name,client_name,team_name,metadata'
    },
    assignments:{
      name:'atsrs_project_personnel',
      columns:'id,source_entity_id,workspace_user_id,workspace_account_type,project_id,personnel_id'
    }
  };
  var state={
    enabled:false,
    primaryRead:false,
    scopeHashes:[],
    sequence:0,
    running:null,
    lastReport:null,
    currentScope:'',
    overrideScope:'',
    overrides:new Map()
  };

  function safeConfig(input){
    input=input&&typeof input==='object'?input:{};
    return {
      enabled:input.enabled===true,
      primaryRead:input.primaryRead===true,
      scopeHashes:Array.isArray(input.scopeHashes)
        ?input.scopeHashes.map(function(value){return String(value).toLowerCase();})
        :[]
    };
  }
  async function sha256(value){
    var bytes=await crypto.subtle.digest(
      'SHA-256',
      new TextEncoder().encode(String(value))
    );
    return Array.from(new Uint8Array(bytes),function(part){
      return part.toString(16).padStart(2,'0');
    }).join('');
  }
  async function allowed(config,scope){
    if(!config.enabled||!scope)return false;
    var digest=await sha256(scope);
    return config.scopeHashes.indexOf(digest)>=0;
  }
  function parse(value,fallback){
    try{
      var parsed=JSON.parse(String(value===undefined||value===null?'':value));
      return parsed===null?fallback:parsed;
    }catch(error){
      return fallback;
    }
  }
  function legacyInput(api,user,accountType){
    var prefix='atsrs_'+user.id+'_'+accountType+'_';
    return {
      profile:accountType==='personal'?parse(api.read(prefix+'profile'),{}):null,
      personnel:accountType==='company'?parse(api.read(prefix+'personnel'),[]):[],
      certificates:parse(api.read(prefix+'certs'),[]),
      projects:parse(api.read(prefix+'projects'),[])
    };
  }
  async function readTable(client,definition,userId,accountType){
    var result=await client.from(definition.name)
      .select(definition.columns)
      .eq('workspace_user_id',userId)
      .eq('workspace_account_type',accountType);
    if(result.error)throw result.error;
    return result.data||[];
  }
  async function normalizedInput(client,userId,accountType){
    var names=Object.keys(TABLES);
    var values=await Promise.all(names.map(function(name){
      return readTable(client,TABLES[name],userId,accountType);
    }));
    return names.reduce(function(output,name,index){
      output[name]=values[index];
      return output;
    },{});
  }
  function publish(root,report){
    state.lastReport=report;
    if(!root||!root.document||!root.document.documentElement)return;
    var element=root.document.documentElement;
    element.dataset.atsrsNormalizedReadMode=String(report.mode||'legacy');
    element.dataset.atsrsNormalizedReadStatus=String(report.status||'idle');
    element.dataset.atsrsNormalizedReadSelected=String(
      report.selected_source||'legacy_json'
    );
    element.dataset.atsrsNormalizedReadMismatchCount=String(report.mismatch_count||0);
  }
  function legacyReport(reason){
    return {
      mode:'legacy',
      status:'disabled',
      selected_source:'legacy_json',
      fallback_reason:reason||'feature_flag_off',
      mismatch_count:0,
      mutation:false
    };
  }
  function configure(input){
    var config=safeConfig(input);
    state.enabled=config.enabled;
    state.primaryRead=config.primaryRead;
    state.scopeHashes=config.scopeHashes;
    state.sequence++;
    if(!state.enabled||!state.primaryRead){
      state.running=null;
      state.currentScope='';
      state.overrideScope='';
      state.overrides.clear();
    }
    return getState();
  }
  function getState(){
    return {
      enabled:state.enabled,
      primaryRead:state.primaryRead,
      scopeCount:state.scopeHashes.length,
      running:!!state.running,
      overrideScope:state.overrideScope?'active':'',
      lastReport:state.lastReport
    };
  }
  function clearOverrides(){
    state.overrideScope='';
    state.overrides.clear();
  }
  function installOverrides(userId,accountType,model){
    var prefix='atsrs_'+userId+'_'+accountType+'_';
    var next=new Map();
    if(accountType==='personal'&&model.profile){
      next.set(prefix+'profile',JSON.stringify(model.profile));
    }
    if(accountType==='company'){
      next.set(prefix+'personnel',JSON.stringify(model.personnel||[]));
    }
    next.set(prefix+'certs',JSON.stringify(model.certificates||[]));
    next.set(prefix+'projects',JSON.stringify(model.projects||[]));
    state.overrides=next;
    state.overrideScope=userId+'::'+accountType;
  }
  function read(key,legacyValue){
    key=String(key||'');
    return state.overrideScope&&state.overrides.has(key)
      ?state.overrides.get(key)
      :legacyValue;
  }
  function invalidate(){
    state.sequence++;
    clearOverrides();
    state.lastReport=legacyReport('legacy_write_in_progress');
    if(typeof window!=='undefined')publish(window,state.lastReport);
    return state.lastReport;
  }
  async function shouldBlockForPrimary(scope){
    return state.primaryRead&&await allowed(safeConfig(state),scope);
  }
  async function run(root,detail){
    var sequence=++state.sequence;
    var config=safeConfig({
      enabled:state.enabled,
      primaryRead:state.primaryRead,
      scopeHashes:state.scopeHashes
    });
    var user=root&&root.currentUser;
    var client=root&&root.supabaseClient;
    var cloud=root&&root.atsrsCloudData;
    var accountType=detail&&detail.accountType;
    var scope=detail&&detail.scope;
    if(!adapter||!user||!user.id||!client||!cloud||typeof cloud.read!=='function'){
      var unavailable=legacyReport('runtime_unavailable');
      publish(root,unavailable);
      return unavailable;
    }
    if(!await allowed(config,scope)){
      var disabled=legacyReport('feature_flag_off');
      publish(root,disabled);
      return disabled;
    }
    state.currentScope=scope;
    if(config.primaryRead&&state.overrideScope===scope&&state.lastReport
      &&state.lastReport.status==='match'){
      return state.lastReport;
    }
    var operation=(async function(){
      try{
        var legacy=legacyInput(cloud,user,accountType);
        var normalized=await normalizedInput(client,user.id,accountType);
        if(sequence!==state.sequence){
          return legacyReport('stale_scope_result');
        }
        var currentMode='';
        try{currentMode=root.localStorage.getItem('atsrs_use_mode')||'';}catch(error){}
        if(currentMode!==accountType){
          return legacyReport('stale_scope_result');
        }
        var result=await adapter.evaluate({
          featureFlag:'canary',
          primaryRead:config.primaryRead,
          legacy:legacy,
          normalized:normalized,
          email:user.email||'',
          workspace:{userId:user.id,accountType:accountType}
        });
        var report={
          mode:'canary',
          status:result.normalized_candidate?'match':'fallback',
          selected_source:result.selected_source,
          fallback_reason:result.fallback_reason,
          mismatch_count:result.parity?result.parity.mismatch_count:0,
          skipped_count:result.parity?result.parity.skipped_count:0,
          normalized_candidate:result.normalized_candidate,
          mutation:false
        };
        if(result.selected_source==='normalized_overlay'&&result.read_model){
          installOverrides(user.id,accountType,result.read_model);
        }else if(sequence===state.sequence){
          clearOverrides();
        }
        if(sequence===state.sequence)publish(root,report);
        return report;
      }catch(error){
        var failed=legacyReport('normalized_read_unavailable');
        failed.status='fallback';
        if(sequence===state.sequence){
          clearOverrides();
          publish(root,failed);
        }
        return failed;
      }finally{
        if(state.running===operation)state.running=null;
      }
    })();
    state.running=operation;
    return operation;
  }
  function install(root,input){
    if(!root||!root.addEventListener)return false;
    configure(input);
    publish(root,legacyReport('feature_flag_off'));
    root.addEventListener('atsrs:data-hydrated',function(event){
      run(root,event&&event.detail||{});
    });
    root.addEventListener('atsrs:cloud-write-complete',function(event){
      var detail=event&&event.detail||{};
      if(!state.primaryRead||detail.scope!==state.currentScope)return;
      invalidate();
      run(root,{scope:detail.scope,accountType:detail.accountType});
    });
    return true;
  }
  function rollback(root){
    configure({enabled:false,primaryRead:false,scopeHashes:[]});
    var report=legacyReport('feature_flag_off');
    publish(root,report);
    return report;
  }

  var api={
    configure:configure,
    invalidate:invalidate,
    install:install,
    read:read,
    rollback:rollback,
    run:run,
    prepare:function(detail){
      return typeof window!=='undefined'?run(window,detail):Promise.resolve(legacyReport('runtime_unavailable'));
    },
    shouldBlockForPrimary:shouldBlockForPrimary,
    state:getState,
    specification:{
      default_enabled:false,
      default_primary_read:false,
      selected_source:'legacy_json',
      normalized_write:false,
      feature_scope:'sha256(user_id::account_type)',
      failure_behavior:'legacy fallback',
      mutation:false
    }
  };
  if(typeof window!=='undefined'){
    var bootConfig=window.__ATSRS_NORMALIZED_READ_CANARY__;
    install(window,bootConfig);
  }
  return api;
});
