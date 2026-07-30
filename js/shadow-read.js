/* ATSRS normalized shadow-read comparator.
   Legacy workspace JSON remains authoritative. This module only reads the
   normalized shadow and records privacy-safe mismatch telemetry in memory. */
(function(root,factory){
  var api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.atsrsShadowRead=api;
})(typeof window!=='undefined'?window:null,function(){
  'use strict';

  var UUID_PATTERN=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  var STABLE_ID_NAMESPACE='9fe1439e-5b5a-5c86-9d7c-28a67036e814';
  var VOLATILE_FIELDS=new Set([
    'capturedAt','recoveredAt','updated_at','created_at','updatedAt','createdAt'
  ]);
  var lastReport=null;
  var activeRun=null;
  var runSequence=0;

  function publishStatus(report){
    if(typeof document==='undefined'||!document.documentElement)return;
    var root=document.documentElement;
    root.dataset.atsrsShadowReadStatus=String(report&&report.status||'idle');
    root.dataset.atsrsShadowReadMismatchCount=String(report&&report.mismatch_count||0);
    root.dataset.atsrsShadowReadBuild='V393';
  }

  function validUuid(value){
    return UUID_PATTERN.test(String(value||''));
  }
  function uuidBytes(value){
    return String(value).replace(/-/g,'').match(/.{2}/g).map(function(part){
      return parseInt(part,16);
    });
  }
  function formatUuid(bytes){
    var hex=Array.from(bytes,function(value){
      return value.toString(16).padStart(2,'0');
    }).join('');
    return [hex.slice(0,8),hex.slice(8,12),hex.slice(12,16),hex.slice(16,20),hex.slice(20)].join('-');
  }
  async function deterministicUuid(seed){
    var namespace=uuidBytes(STABLE_ID_NAMESPACE);
    var nameBytes=Array.from(new TextEncoder().encode(String(seed)));
    var input=new Uint8Array(namespace.length+nameBytes.length);
    input.set(namespace,0);input.set(nameBytes,namespace.length);
    var hash=new Uint8Array(await crypto.subtle.digest('SHA-1',input));
    var bytes=hash.slice(0,16);
    bytes[6]=(bytes[6]&0x0f)|0x50;
    bytes[8]=(bytes[8]&0x3f)|0x80;
    return formatUuid(bytes);
  }
  function stableDataKind(key){
    var value=String(key||'');
    if(/_personal_profile$/.test(value))return 'profile';
    if(/_company_personnel$/.test(value))return 'personnel';
    if(/_(personal|company)_certs$/.test(value))return 'certificates';
    if(/_(personal|company)_projects$/.test(value))return 'projects';
    return '';
  }
  function legacyEntityKey(key,index){
    return 'workspace_data:'+String(key)+(index===null?':owner':':item:'+(index+1));
  }
  async function hydrateStableValue(key,value){
    var kind=stableDataKind(key);
    if(!kind)return String(value);
    var decoded;
    try{decoded=JSON.parse(String(value));}catch(error){return String(value);}
    if(kind==='profile'&&decoded&&typeof decoded==='object'&&!Array.isArray(decoded)){
      if(!validUuid(decoded.atsrsId)){
        decoded.atsrsId=await deterministicUuid(legacyEntityKey(key,null));
      }
      return JSON.stringify(decoded);
    }
    if(!Array.isArray(decoded))return String(value);
    for(var index=0;index<decoded.length;index++){
      var item=decoded[index];
      if(!item||typeof item!=='object'||Array.isArray(item))continue;
      if(!validUuid(item.atsrsId)){
        item.atsrsId=await deterministicUuid(legacyEntityKey(key,index));
      }
      if(kind==='personnel'){
        item.atsrsProjectIds=Array.isArray(item.atsrsProjectIds)
          ?item.atsrsProjectIds.filter(validUuid):[];
      }
      if(kind==='certificates'&&/_personal_certs$/.test(String(key))&&!validUuid(item.atsrsPersonnelId)){
        item.atsrsPersonnelId=await deterministicUuid(
          legacyEntityKey(String(key).replace(/_personal_certs$/,'_personal_profile'),null)
        );
      }
    }
    return JSON.stringify(decoded);
  }
  function text(value){
    var normalized=String(value===undefined||value===null?'':value).trim();
    return normalized||null;
  }
  function requiredText(value){
    return String(value===undefined||value===null?'':value).trim();
  }
  function bool(value){
    return value===true||String(value).toLowerCase()==='true';
  }
  function date(value){
    var normalized=text(value);
    if(!normalized||/^(n\/a|na)$/i.test(normalized))return null;
    var match=normalized.match(/^(\d{4}-\d{2}-\d{2})/);
    return match?match[1]:normalized;
  }
  function canonicalMetadata(source,excluded){
    var output={};
    if(!source||typeof source!=='object'||Array.isArray(source))return output;
    Object.keys(source).sort().forEach(function(key){
      if(excluded.has(key)||VOLATILE_FIELDS.has(key))return;
      var value=source[key];
      if(value&&typeof value==='object'&&!Array.isArray(value)){
        output[key]=canonicalMetadata(value,new Set());
      }else if(Array.isArray(value)){
        output[key]=value.map(function(item){
          return item&&typeof item==='object'&&!Array.isArray(item)
            ?canonicalMetadata(item,new Set()):item;
        });
      }else{
        output[key]=value;
      }
    });
    return output;
  }
  function stableValue(value){
    if(Array.isArray(value))return value.map(stableValue);
    if(value&&typeof value==='object'){
      var output={};
      Object.keys(value).sort().forEach(function(key){output[key]=stableValue(value[key]);});
      return output;
    }
    return value;
  }
  function stableStringify(value){
    return JSON.stringify(stableValue(value));
  }
  async function sha256(value){
    var input=String(value);
    if(typeof crypto!=='undefined'&&crypto.subtle){
      var bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(input));
      return Array.from(new Uint8Array(bytes),function(part){
        return part.toString(16).padStart(2,'0');
      }).join('');
    }
    if(typeof require==='function'){
      return require('node:crypto').createHash('sha256').update(input).digest('hex');
    }
    throw new Error('SHA-256 is unavailable');
  }
  function parseLegacy(value,fallback){
    if(value===undefined||value===null||value==='')return fallback;
    try{return JSON.parse(String(value));}catch(error){return fallback;}
  }
  function profileCanonical(item,workspace,email){
    return {
      workspace_user_id:workspace.userId,
      workspace_account_type:workspace.accountType,
      linked_user_id:workspace.userId,
      first_name:requiredText(item.name),
      last_name:text(item.surname),
      position:text(item.position),
      company_name:text(item.company),
      email:text(email),
      phone:text(item.phone),
      whatsapp:text(item.whatsapp),
      nationality:text(item.country),
      employee_id:null,
      source:'workspace_data_personal_profile',
      access_status:null,
      linked_status:'linked',
      tracker_status:null,
      phone_verified:bool(item.phoneVerified),
      whatsapp_verified:bool(item.whatsappVerified),
      metadata:canonicalMetadata(item,new Set([
        'atsrsId','name','surname','position','company','phone','whatsapp',
        'country','phoneVerified','whatsappVerified'
      ]))
    };
  }
  function personnelCanonical(item,workspace){
    return {
      workspace_user_id:workspace.userId,
      workspace_account_type:workspace.accountType,
      linked_user_id:validUuid(item.linkedUserId)?String(item.linkedUserId).toLowerCase():null,
      first_name:requiredText(item.name),
      last_name:text(item.surname),
      position:text(item.position),
      company_name:text(item.company),
      email:text(item.email),
      phone:text(item.phone),
      whatsapp:text(item.whatsapp),
      nationality:text(item.nationality)||text(item.country),
      employee_id:text(item.employeeId),
      source:text(item.source),
      access_status:text(item.accessStatus),
      linked_status:text(item.linkedStatus),
      tracker_status:text(item.trackerStatus),
      phone_verified:bool(item.phoneVerified),
      whatsapp_verified:bool(item.whatsappVerified),
      metadata:canonicalMetadata(item,new Set([
        'atsrsId','atsrsProjectIds','linkedUserId','name','surname','position',
        'company','email','phone','whatsapp','nationality','country',
        'employeeId','source','accessStatus','linkedStatus','trackerStatus',
        'phoneVerified','whatsappVerified'
      ]))
    };
  }
  function targetPersonnelCanonical(item){
    return {
      workspace_user_id:item.workspace_user_id,
      workspace_account_type:item.workspace_account_type,
      linked_user_id:item.linked_user_id||null,
      first_name:requiredText(item.first_name),
      last_name:text(item.last_name),
      position:text(item.position),
      company_name:text(item.company_name),
      email:text(item.email),
      phone:text(item.phone),
      whatsapp:text(item.whatsapp),
      nationality:text(item.nationality),
      employee_id:text(item.employee_id),
      source:text(item.source),
      access_status:text(item.access_status),
      linked_status:text(item.linked_status),
      tracker_status:text(item.tracker_status),
      phone_verified:bool(item.phone_verified),
      whatsapp_verified:bool(item.whatsapp_verified),
      metadata:canonicalMetadata(item.metadata||{},new Set())
    };
  }
  function projectCanonical(item,workspace){
    return {
      workspace_user_id:workspace.userId,
      workspace_account_type:workspace.accountType,
      project_name:requiredText(item.project),
      vessel_name:text(item.vessel),
      client_name:text(item.client),
      team_name:text(item.team),
      metadata:canonicalMetadata(item,new Set(['atsrsId','project','vessel','client','team']))
    };
  }
  function targetProjectCanonical(item){
    return {
      workspace_user_id:item.workspace_user_id,
      workspace_account_type:item.workspace_account_type,
      project_name:requiredText(item.project_name),
      vessel_name:text(item.vessel_name),
      client_name:text(item.client_name),
      team_name:text(item.team_name),
      metadata:canonicalMetadata(item.metadata||{},new Set())
    };
  }
  function certificateCanonical(item,workspace,personnelId){
    return {
      workspace_user_id:workspace.userId,
      workspace_account_type:workspace.accountType,
      personnel_source_entity_id:personnelId,
      file_id:validUuid(item.cloudFileId)?String(item.cloudFileId).toLowerCase():null,
      certificate_type:requiredText(item.type),
      provider_name:text(item.provider),
      document_number:text(item.docNo),
      issuing_country:text(item.country),
      issue_date:date(item.issue),
      expiry_date:date(item.expiry),
      metadata:canonicalMetadata(item,new Set([
        'atsrsId','atsrsPersonnelId','person','type','provider','docNo','country',
        'issue','expiry','cloudFileId','fileName','mimeType','fileSize'
      ]))
    };
  }
  function targetCertificateCanonical(item,personnelById){
    var owner=personnelById.get(String(item.personnel_id));
    return {
      workspace_user_id:item.workspace_user_id,
      workspace_account_type:item.workspace_account_type,
      personnel_source_entity_id:owner?String(owner.source_entity_id).toLowerCase():null,
      file_id:item.file_id||null,
      certificate_type:requiredText(item.certificate_type),
      provider_name:text(item.provider_name),
      document_number:text(item.document_number),
      issuing_country:text(item.issuing_country),
      issue_date:date(item.issue_date),
      expiry_date:date(item.expiry_date),
      metadata:canonicalMetadata(item.metadata||{},new Set())
    };
  }
  function buildSource(legacy,workspace,email){
    var personnel=[];
    var certificates=[];
    var projects=[];
    var assignments=[];
    var skipped=[];
    var profile=legacy.profile;
    var companyPersonnel=Array.isArray(legacy.personnel)?legacy.personnel:[];
    var projectRows=Array.isArray(legacy.projects)?legacy.projects:[];
    var certificateRows=Array.isArray(legacy.certificates)?legacy.certificates:[];

    if(workspace.accountType==='personal'&&profile&&typeof profile==='object'&&!Array.isArray(profile)){
      if(validUuid(profile.atsrsId)){
        personnel.push({
          id:String(profile.atsrsId).toLowerCase(),
          canonical:profileCanonical(profile,workspace,email)
        });
      }else{
        skipped.push({entity:'personnel',reason:'missing_stable_id'});
      }
    }
    if(workspace.accountType==='company'){
      companyPersonnel.forEach(function(item){
        if(!item||typeof item!=='object'||!validUuid(item.atsrsId)){
          skipped.push({entity:'personnel',reason:'missing_stable_id'});return;
        }
        var personId=String(item.atsrsId).toLowerCase();
        personnel.push({id:personId,canonical:personnelCanonical(item,workspace)});
        (Array.isArray(item.atsrsProjectIds)?item.atsrsProjectIds:[]).forEach(function(projectId){
          if(!validUuid(projectId)){
            skipped.push({entity:'assignment',reason:'invalid_project_id'});return;
          }
          assignments.push({
            id:personId+':'+String(projectId).toLowerCase(),
            canonical:{
              workspace_user_id:workspace.userId,
              workspace_account_type:workspace.accountType,
              personnel_source_entity_id:personId,
              project_source_entity_id:String(projectId).toLowerCase()
            }
          });
        });
      });
    }
    projectRows.forEach(function(item){
      if(!item||typeof item!=='object'||!validUuid(item.atsrsId)){
        skipped.push({entity:'project',reason:'missing_stable_id'});return;
      }
      projects.push({
        id:String(item.atsrsId).toLowerCase(),
        canonical:projectCanonical(item,workspace)
      });
    });
    certificateRows.forEach(function(item){
      if(!item||typeof item!=='object'||!validUuid(item.atsrsId)){
        skipped.push({entity:'certificate',reason:'missing_stable_id'});return;
      }
      var personnelId=validUuid(item.atsrsPersonnelId)
        ?String(item.atsrsPersonnelId).toLowerCase():null;
      if(!personnelId){
        skipped.push({entity:'certificate',reason:'missing_personnel_id'});return;
      }
      certificates.push({
        id:String(item.atsrsId).toLowerCase(),
        canonical:certificateCanonical(item,workspace,personnelId)
      });
    });
    return {personnel:personnel,certificates:certificates,projects:projects,assignments:assignments,skipped:skipped};
  }
  function buildTarget(rows){
    rows=rows||{};
    var personnelById=new Map();
    (rows.personnel||[]).forEach(function(item){personnelById.set(String(item.id),item);});
    var projectsById=new Map();
    (rows.projects||[]).forEach(function(item){projectsById.set(String(item.id),item);});
    return {
      personnel:(rows.personnel||[]).map(function(item){
        return {id:String(item.source_entity_id).toLowerCase(),canonical:targetPersonnelCanonical(item)};
      }),
      certificates:(rows.certificates||[]).map(function(item){
        return {
          id:String(item.source_entity_id).toLowerCase(),
          canonical:targetCertificateCanonical(item,personnelById)
        };
      }),
      projects:(rows.projects||[]).map(function(item){
        return {id:String(item.source_entity_id).toLowerCase(),canonical:targetProjectCanonical(item)};
      }),
      assignments:(rows.assignments||[]).map(function(item){
        var person=personnelById.get(String(item.personnel_id));
        var project=projectsById.get(String(item.project_id));
        var personSource=person&&String(person.source_entity_id).toLowerCase();
        var projectSource=project&&String(project.source_entity_id).toLowerCase();
        return {
          id:(personSource||'missing')+':'+(projectSource||'missing'),
          canonical:{
            workspace_user_id:item.workspace_user_id,
            workspace_account_type:item.workspace_account_type,
            personnel_source_entity_id:personSource||null,
            project_source_entity_id:projectSource||null
          }
        };
      })
    };
  }
  async function compareEntity(entity,sourceRows,targetRows){
    var source=new Map(sourceRows.map(function(item){return [item.id,item.canonical];}));
    var target=new Map(targetRows.map(function(item){return [item.id,item.canonical];}));
    var ids=Array.from(new Set(Array.from(source.keys()).concat(Array.from(target.keys())))).sort();
    var mismatches=[];
    for(var index=0;index<ids.length;index++){
      var id=ids[index];
      var left=source.get(id);
      var right=target.get(id);
      if(!left||!right){
        mismatches.push({
          entity:entity,
          category:left?'missing_target':'missing_source',
          fields:[],
          source_hash:left?await sha256(stableStringify(left)):null,
          target_hash:right?await sha256(stableStringify(right)):null
        });
        continue;
      }
      var leftText=stableStringify(left);
      var rightText=stableStringify(right);
      if(leftText===rightText)continue;
      var fields=Array.from(new Set(Object.keys(left).concat(Object.keys(right))))
        .filter(function(field){return stableStringify(left[field])!==stableStringify(right[field]);})
        .sort();
      mismatches.push({
        entity:entity,
        category:'field_mismatch',
        fields:fields,
        source_hash:await sha256(leftText),
        target_hash:await sha256(rightText)
      });
    }
    return {
      entity:entity,
      source_count:sourceRows.length,
      target_count:targetRows.length,
      source_hash:await sha256(stableStringify(sourceRows.slice().sort(function(a,b){return a.id.localeCompare(b.id);}))),
      target_hash:await sha256(stableStringify(targetRows.slice().sort(function(a,b){return a.id.localeCompare(b.id);}))),
      mismatch_count:mismatches.length,
      mismatches:mismatches
    };
  }
  async function compare(input){
    var source=buildSource(input.legacy,input.workspace,input.email);
    var target=buildTarget(input.normalized);
    var entities={};
    for(var entity of ['personnel','certificates','projects','assignments']){
      entities[entity]=await compareEntity(entity,source[entity],target[entity]);
    }
    var mismatchCount=Object.keys(entities).reduce(function(total,key){
      return total+entities[key].mismatch_count;
    },0);
    return {
      status:mismatchCount||source.skipped.length?'mismatch':'match',
      mismatch_count:mismatchCount,
      skipped_count:source.skipped.length,
      skipped:source.skipped,
      entities:entities
    };
  }
  function legacyForWorkspace(userId,accountType){
    var prefix='atsrs_'+userId+'_';
    return {
      profile:parseLegacy(localStorage.getItem(prefix+'personal_profile'),null),
      personnel:parseLegacy(localStorage.getItem(prefix+'company_personnel'),[]),
      certificates:parseLegacy(localStorage.getItem(prefix+accountType+'_certs'),[]),
      projects:parseLegacy(localStorage.getItem(prefix+accountType+'_projects'),[])
    };
  }
  async function queryNormalized(client,userId,accountType){
    var definitions=[
      ['personnel','atsrs_workspace_personnel','id,workspace_user_id,workspace_account_type,linked_user_id,first_name,last_name,position,company_name,email,phone,whatsapp,nationality,employee_id,source,access_status,linked_status,tracker_status,phone_verified,whatsapp_verified,metadata,source_entity_id'],
      ['certificates','atsrs_personnel_certificates','id,workspace_user_id,workspace_account_type,personnel_id,file_id,certificate_type,provider_name,document_number,issuing_country,issue_date,expiry_date,metadata,source_entity_id'],
      ['projects','atsrs_workspace_projects','id,workspace_user_id,workspace_account_type,project_name,vessel_name,client_name,team_name,metadata,source_entity_id'],
      ['assignments','atsrs_project_personnel','id,workspace_user_id,workspace_account_type,project_id,personnel_id,source_entity_id']
    ];
    var output={};
    for(var definition of definitions){
      var result=await client.from(definition[1]).select(definition[2])
        .eq('workspace_user_id',userId)
        .eq('workspace_account_type',accountType);
      if(result.error){
        var error=new Error('Normalized shadow read failed');
        error.code=String(result.error.code||result.error.status||'READ_FAILED');
        error.stage=definition[0];
        throw error;
      }
      output[definition[0]]=result.data||[];
    }
    return output;
  }
  async function runBrowserAudit(){
    if(typeof window==='undefined')return null;
    if(activeRun)return activeRun;
    var sequence=++runSequence;
    activeRun=(async function(){
      var client=window.supabaseClient;
      var user=window.currentUser;
      if(!client||!user||!user.id||user.id==='local_test_user')return null;
      if(!window.atsrsCloudData||!window.atsrsCloudData.isLoaded())return null;
      var accountType='';
      try{accountType=localStorage.getItem('atsrs_use_mode')||window.useMode||'';}catch(error){}
      accountType=accountType==='company'?'company':'personal';
      var workspace={userId:String(user.id),accountType:accountType};
      var scopeHash=(await sha256(workspace.userId+'::'+workspace.accountType)).slice(0,16);
      try{
        var normalized=await queryNormalized(client,workspace.userId,workspace.accountType);
        var report=await compare({
          workspace:workspace,
          email:user.email||'',
          legacy:legacyForWorkspace(workspace.userId,workspace.accountType),
          normalized:normalized
        });
        if(sequence!==runSequence)return null;
        lastReport={
          build:'V393',
          mode:'shadow-read',
          authoritative_source:'legacy_json',
          scope_hash:scopeHash,
          status:report.status,
          mismatch_count:report.mismatch_count,
          skipped_count:report.skipped_count,
          entities:report.entities,
          checked_at:new Date().toISOString()
        };
        publishStatus(lastReport);
        if(report.status!=='match'){
          console.warn('ATSRS normalized shadow mismatch',{
            scopeHash:scopeHash,
            mismatchCount:report.mismatch_count,
            skippedCount:report.skipped_count,
            fields:Object.keys(report.entities).reduce(function(output,key){
              output[key]=report.entities[key].mismatches.map(function(item){return item.fields;});
              return output;
            },{})
          });
        }
        window.dispatchEvent(new CustomEvent('atsrs:shadow-read-complete',{
          detail:{status:report.status,mismatchCount:report.mismatch_count,scopeHash:scopeHash}
        }));
        return lastReport;
      }catch(error){
        lastReport={
          build:'V393',
          mode:'shadow-read',
          authoritative_source:'legacy_json',
          scope_hash:scopeHash,
          status:'unavailable',
          stage:String(error&&error.stage||'runtime'),
          code:String(error&&error.code||'READ_FAILED'),
          checked_at:new Date().toISOString()
        };
        publishStatus(lastReport);
        console.warn('ATSRS normalized shadow read unavailable',{
          scopeHash:scopeHash,
          stage:lastReport.stage,
          code:lastReport.code
        });
        return lastReport;
      }
    })();
    try{return await activeRun;}finally{activeRun=null;}
  }
  function install(){
    if(typeof window==='undefined')return;
    publishStatus({status:'idle',mismatch_count:0});
    window.addEventListener('atsrs:data-hydrated',function(){runBrowserAudit();});
    window.addEventListener('online',function(){
      if(window.atsrsCloudData&&window.atsrsCloudData.isLoaded())runBrowserAudit();
    });
    setTimeout(function(){
      if(window.atsrsCloudData&&window.atsrsCloudData.isLoaded())runBrowserAudit();
    },0);
  }
  install();

  return {
    compare:compare,
    buildSource:buildSource,
    buildTarget:buildTarget,
    stableStringify:stableStringify,
    canonicalMetadata:canonicalMetadata,
    hydrateStableValue:hydrateStableValue,
    run:runBrowserAudit,
    lastReport:function(){return lastReport;},
    specification:{
      authority:'legacy_json',
      read_only:true,
      null_empty:'trimmed empty strings normalize to null except required names',
      dates:'YYYY-MM-DD; N/A and NA normalize to null',
      ordering:'entities sort by stable source ID; object keys sort lexically',
      stable_ids:'UUID source_entity_id only; no name or ordinal guessing',
      arrays:'entity arrays are order-independent; semantic nested arrays retain order',
      excluded_volatile_fields:Array.from(VOLATILE_FIELDS).sort(),
      conflict_rule:'report mismatch; never overwrite either source'
    }
  };
});
