/* ATSRS cloud data layer.
   Supabase is the source of truth. Business data is held only in RAM while the
   signed-in app is open; localStorage is reserved for non-authoritative UI and
   authentication preferences. */
(function(){
  'use strict';

  var DATA_TABLE='atsrs_workspace_data';
  var FILE_TABLE='atsrs_files';
  var FILE_BUCKET='atsrs-user-files';
  var DATA_MIGRATION_KEY='__cloud_data_migration_v2';
  var FILE_MIGRATION_KEY='__cloud_file_migration_v2';
  var nativeSet=Storage.prototype.setItem;
  var nativeRemove=Storage.prototype.removeItem;
  var nativeGet=Storage.prototype.getItem;
  var memoryStore=new Map();
  var writeVersions=new Map();
  var persistedWriteVersions=new Map();
  var rowVersions=new Map();
  var serverValues=new Map();
  var commandRevisions=new Map();
  var normalizedWriteScopeCache=new Map();
  var stableCompatibilityCache=new Map();
  var loadedScope='';
  var loadingPromise=null;
  var writeQueue=Promise.resolve();
  var flushPromise=null;
  var retryFailedPromise=null;
  var pendingWrites=0;
  var lastWriteError=null;
  var failedOperations=[];
  var fileRenderTimer=0;
  var FILE_LIST_CACHE_TTL=30000;
  var FILE_PAGE_SIZE=30;
  var fileListCache=new Map();
  var filePageState=new Map();
  var STABLE_ID_NAMESPACE='9fe1439e-5b5a-5c86-9d7c-28a67036e814';
  var UUID_PATTERN=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  var commandRevisionChannel=null;
  var commandCircuitChannel=null;
  var commandCircuits=new Map();
  try{
    if(typeof BroadcastChannel==='function'){
      commandRevisionChannel=new BroadcastChannel('atsrs-normalized-write-revisions-v1');
      commandRevisionChannel.addEventListener('message',function(event){
        var detail=event&&event.data||{};
        var revision=Number(detail.revision);
        if(!detail.scope||!Number.isSafeInteger(revision)||revision<0)return;
        commandRevisions.set(String(detail.scope),Math.max(
          commandRevisions.get(String(detail.scope))||0,
          revision
        ));
      });
    }
  }catch(_channelError){commandRevisionChannel=null;}
  try{
    if(typeof BroadcastChannel==='function'){
      commandCircuitChannel=new BroadcastChannel('atsrs-normalized-write-circuit-v1');
      commandCircuitChannel.addEventListener('message',function(event){
        var detail=event&&event.data||{};
        var openUntil=Number(detail.openUntil);
        if(!detail.scope||!Number.isFinite(openUntil))return;
        commandCircuits.set(String(detail.scope),{
          failures:Number(detail.failures)||0,
          openUntil:Math.max(0,openUntil),
          code:String(detail.code||'ATSRS_CIRCUIT_OPEN')
        });
      });
    }
  }catch(_circuitChannelError){commandCircuitChannel=null;}

  function validUuid(value){
    return UUID_PATTERN.test(String(value||''));
  }
  function uuidBytes(value){
    return String(value).replace(/-/g,'').match(/.{2}/g).map(function(part){return parseInt(part,16);});
  }
  function formatUuid(bytes){
    var hex=Array.from(bytes,function(value){return value.toString(16).padStart(2,'0');}).join('');
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
  function randomUuid(){
    if(crypto&&typeof crypto.randomUUID==='function')return crypto.randomUUID();
    var bytes=new Uint8Array(16);crypto.getRandomValues(bytes);
    bytes[6]=(bytes[6]&0x0f)|0x40;bytes[8]=(bytes[8]&0x3f)|0x80;
    return formatUuid(bytes);
  }
  function stableDataKind(key){
    var text=String(key||'');
    if(/_personal_profile$/.test(text))return 'profile';
    if(/_company_personnel$/.test(text))return 'personnel';
    if(/_(personal|company)_certs$/.test(text))return 'certificates';
    if(/_(personal|company)_projects$/.test(text))return 'projects';
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
      if(!validUuid(decoded.atsrsId))decoded.atsrsId=await deterministicUuid(legacyEntityKey(key,null));
      return JSON.stringify(decoded);
    }
    if(!Array.isArray(decoded))return String(value);
    for(var index=0;index<decoded.length;index++){
      var item=decoded[index];
      if(!item||typeof item!=='object'||Array.isArray(item))continue;
      if(!validUuid(item.atsrsId))item.atsrsId=await deterministicUuid(legacyEntityKey(key,index));
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
  async function hydrateStableRows(rows){
    for(var index=0;index<(rows||[]).length;index++){
      var row=rows[index];
      if(!row||!row.data_key||!row.payload||typeof row.payload.value!=='string')continue;
      var enriched=await hydrateStableValue(row.data_key,row.payload.value);
      if(enriched!==row.payload.value)row.payload=Object.assign({},row.payload,{value:enriched});
    }
  }
  function normalizeStableValue(key,value){
    var kind=stableDataKind(key);
    if(!kind)return String(value);
    var decoded;
    try{decoded=JSON.parse(String(value));}catch(error){return String(value);}
    if(kind==='profile'&&decoded&&typeof decoded==='object'&&!Array.isArray(decoded)){
      if(!validUuid(decoded.atsrsId))decoded.atsrsId=randomUuid();
      return JSON.stringify(decoded);
    }
    if(!Array.isArray(decoded))return String(value);
    var personalCertificateOwnerId='';
    if(kind==='certificates'&&/_personal_certs$/.test(String(key))){
      var profileKey=String(key).replace(/_personal_certs$/,'_personal_profile');
      var profileValue=memoryStore.has(profileKey)
        ?memoryStore.get(profileKey):serverValues.get(profileKey);
      try{
        var profile=JSON.parse(String(profileValue||''));
        if(profile&&validUuid(profile.atsrsId))personalCertificateOwnerId=profile.atsrsId;
      }catch(_profileError){}
    }
    decoded.forEach(function(item){
      if(!item||typeof item!=='object'||Array.isArray(item))return;
      if(!validUuid(item.atsrsId))item.atsrsId=randomUuid();
      if(kind==='personnel'){
        item.atsrsProjectIds=Array.isArray(item.atsrsProjectIds)
          ?item.atsrsProjectIds.filter(validUuid):[];
      }
      if(personalCertificateOwnerId&&!validUuid(item.atsrsPersonnelId)){
        item.atsrsPersonnelId=personalCertificateOwnerId;
      }
    });
    return JSON.stringify(decoded);
  }

  function client(){return window.supabaseClient||null;}
  function user(){
    var value=window.currentUser;
    try{
      if((!value||!value.id)&&typeof currentUser!=='undefined')value=currentUser;
    }catch(e){}
    return value&&value.id?value:null;
  }
  function accountType(){
    var value='';
    try{value=nativeGet.call(localStorage,'atsrs_use_mode')||window.useMode||'';}catch(e){}
    return value==='company'?'company':'personal';
  }
  function scope(){
    var value=user();
    return value?value.id+'::'+accountType():'';
  }
  function localPrefix(){
    var value=user();
    return value?'atsrs_'+value.id+'_':'';
  }
  function managedPrefix(){
    var prefix=localPrefix();
    return prefix?prefix+accountType()+'_':'';
  }
  function isCloudSession(){
    var value=user();
    return !!(value&&value.id&&value.id!=='local_test_user'&&client());
  }
  function isFileLikeKey(key){
    var text=String(key||'');
    return /(^|_)(file|files|upload|uploads|documentblob|attachment|attachments)(_|$)/i.test(text)
      || /(File|Files|Upload|Uploads|DocumentBlob|Attachment|Attachments)$/.test(text);
  }
  function isManagedBusinessKey(key){
    var prefix=managedPrefix();
    return !!(prefix&&String(key||'').indexOf(prefix)===0&&!isFileLikeKey(key));
  }
  function shouldSyncKey(key){
    return isCloudSession()&&isManagedBusinessKey(key);
  }
  async function sha256Hex(value){
    var bytes=new TextEncoder().encode(String(value));
    var digest=await crypto.subtle.digest('SHA-256',bytes);
    return Array.from(new Uint8Array(digest),function(byte){
      return byte.toString(16).padStart(2,'0');
    }).join('');
  }
  function normalizedWriteCanaryRequested(){
    try{
      return new URLSearchParams(window.location.search)
        .get('atsrsNormalizedWrite')==='canary';
    }catch(_error){return false;}
  }
  async function normalizedPrimaryWriteEnabled(context,key){
    if(!context||!stableDataKind(key))return false;
    var config=window.__ATSRS_NORMALIZED_WRITE_CANARY__||{};
    if(!config.enabled)return false;
    if(config.primaryWrite&&config.allowAllScopes)return true;
    if(!config.primaryWrite&&!normalizedWriteCanaryRequested())return false;
    var scopeKey=context.user_id+'::'+context.account_type;
    var scopeHash=normalizedWriteScopeCache.get(scopeKey);
    if(!scopeHash){
      scopeHash=await sha256Hex(scopeKey);
      normalizedWriteScopeCache.set(scopeKey,scopeHash);
    }
    return Array.isArray(config.scopeHashes)
      &&config.scopeHashes.indexOf(scopeHash)!==-1;
  }
  function cloudErrorMessage(error){
    return 'ATSRS server data could not be loaded. Please check the connection and try again.';
  }
  function showCloudError(error){
    console.error('ATSRS cloud data error',error);
    var auth=document.getElementById('auth');
    var app=document.getElementById('app');
    var msg=document.getElementById('loginMsg');
    if(app)app.classList.add('hidden');
    if(auth)auth.classList.remove('hidden');
    if(msg){msg.style.whiteSpace='pre-line';msg.textContent=cloudErrorMessage(error);}
    if(typeof window.atsrsFinishBoot==='function')window.atsrsFinishBoot();
    else{
      document.body.classList.remove('atsrs-session-pending');
      document.body.classList.remove('atsrs-booting');
    }
  }
  function workspaceCommandPolicy(){
    var policy=window.ATSRSWorkspaceCommandPolicy;
    if(!policy)throw new Error('ATSRS workspace command policy is unavailable.');
    return policy;
  }
  function writeErrorCode(error){
    return workspaceCommandPolicy().errorCode(error);
  }
  function isWriteConflict(error){
    return workspaceCommandPolicy().isWriteConflict(error);
  }
  function isStaleRevision(error){
    return workspaceCommandPolicy().isStaleRevision(error);
  }
  function isStableCompatibilityRefresh(error){
    return workspaceCommandPolicy().isStableCompatibilityRefresh(error);
  }
  function isDuplicateInsert(error){
    return workspaceCommandPolicy().isDuplicateInsert(error);
  }
  function isRetryableWriteError(error){
    return workspaceCommandPolicy().isRetryable(error);
  }
  function attachWriteContext(error,meta,phase){
    if(!(error instanceof Error)){
      var original=error;
      error=new Error(String(original&&original.message||original||'Unknown write error'));
      ['code','status','details','hint'].forEach(function(field){
        if(original&&original[field]!==undefined)error[field]=original[field];
      });
    }
    if(meta&&meta.key&&!error.dataKey)error.dataKey=String(meta.key);
    if(phase&&!error.phase)error.phase=String(phase);
    return error;
  }
  function logWriteDelay(error,entry){
    console.warn('ATSRS cloud save delayed; the pending user change is retained.',{
      dataKey:entry&&entry.key||error&&error.dataKey||'',
      code:writeErrorCode(error)||'UNKNOWN',
      phase:error&&error.phase||''
    });
  }
  function logWriteConflict(error,entry){
    console.warn('ATSRS cloud save conflict; newer server data was preserved.',{
      dataKey:entry&&entry.key||error&&error.dataKey||'',
      field:error&&error.field||'',
      phase:error&&error.phase||''
    });
  }
  function logWriteRejected(error,entry){
    var dataKey=entry&&entry.key||error&&error.dataKey||'';
    var code=writeErrorCode(error)||'UNKNOWN';
    var phase=error&&error.phase||'';
    var message=String(error&&error.message||'');
    console.error(
      'ATSRS cloud save was rejected.'+
      ' dataKey='+dataKey+
      ' code='+code+
      ' phase='+phase+
      ' message='+message
    );
  }
  function classifyFailedEntry(entry,error){
    error=attachWriteContext(error,entry,'queue');
    entry.lastError=error;
    entry.retryable=isRetryableWriteError(error);
    entry.attempts=(entry.attempts||0)+1;
    entry.autoRetry=entry.retryable
      &&entry.attempts===1
      &&String(error.phase||'').indexOf('normalized_')!==0;
    entry.nextRetryAt=entry.retryable
      ?(entry.autoRetry?0:Date.now()
        +Math.min(30000,1000*Math.pow(2,Math.min(entry.attempts-1,4))))
      :0;
    if(!entry.retryable&&typeof entry.onFailure==='function')entry.onFailure();
    return error;
  }
  function enqueue(operation,onFailure,meta){
    var entry={
      run:operation,
      onFailure:onFailure,
      key:meta&&meta.key||'',
      scope:meta&&meta.scope||'',
      version:meta&&meta.version||0,
      retryable:true,
      lastError:null,
      attempts:0,
      nextRetryAt:0,
      autoRetry:false
    };
    pendingWrites++;
    writeQueue=writeQueue
      .then(operation)
      .then(function(){
        pendingWrites=Math.max(0,pendingWrites-1);
        window.dispatchEvent(new CustomEvent('atsrs:cloud-write-complete',{
          detail:{
            scope:entry.scope,
            accountType:String(entry.scope||'').split('::')[1]||'',
            dataKey:entry.key
          }
        }));
        return true;
      })
      .catch(function(error){
        pendingWrites=Math.max(0,pendingWrites-1);
        error=classifyFailedEntry(entry,error);
        lastWriteError=error;
        failedOperations=failedOperations.filter(function(existing){
          return !(existing&&existing.key===entry.key
            &&existing.scope===entry.scope
            &&Number(existing.version||0)<=Number(entry.version||0));
        });
        failedOperations.push(entry);
        if(entry.retryable)logWriteDelay(error,entry);
        else if(isWriteConflict(error))logWriteConflict(error,entry);
        else logWriteRejected(error,entry);
        showSaveWarning();
        return false;
      });
    return writeQueue;
  }
  function showSaveWarning(){
    var id='atsrsCloudSaveWarning';
    var warning=document.getElementById(id);
    if(!warning){
      warning=document.createElement('div');
      warning.id=id;
      warning.setAttribute('role','alert');
      warning.style.cssText='position:fixed;left:50%;bottom:22px;transform:translateX(-50%);z-index:99999;max-width:620px;padding:12px 16px;border:1px solid #ef4444;border-radius:10px;background:#2b1014;color:#fff;font:600 14px/1.35 Arial,sans-serif;box-shadow:0 12px 30px rgba(0,0,0,.35)';
      document.body.appendChild(warning);
    }
    warning.textContent=isStableCompatibilityRefresh(lastWriteError)
      ?'ATSRS was updated. This change was not sent, and existing server data is safe. Refresh the page before trying again.'
      :'Data was not saved to the ATSRS server. Check the connection and try again.';
    warning.style.display='block';
    clearTimeout(window.__atsrsCloudWarningTimer);
    window.__atsrsCloudWarningTimer=setTimeout(function(){warning.style.display='none';},7000);
  }
  function stableJson(value){
    if(Array.isArray(value))return '['+value.map(stableJson).join(',')+']';
    if(value&&typeof value==='object'){
      return '{'+Object.keys(value).sort().map(function(key){
        return JSON.stringify(key)+':'+stableJson(value[key]);
      }).join(',')+'}';
    }
    return JSON.stringify(value);
  }
  function sameValue(left,right){
    if(left===right)return true;
    try{return stableJson(JSON.parse(String(left)))===stableJson(JSON.parse(String(right)));}
    catch(error){return String(left)===String(right);}
  }
  var BUSINESS_VOLATILE_FIELDS=new Set([
    'capturedAt','recoveredAt','updated_at','created_at','updatedAt',
    'createdAt','uploadedAt','client_build','clientBuild','audit_metadata',
    'auditMetadata'
  ]);
  var BUSINESS_TRIM_FIELDS=new Set([
    'name','surname','position','company','phone','whatsapp','country',
    'nationality','email','employeeId','source','accessStatus','linkedStatus',
    'trackerStatus','type','provider','docNo','issue','expiry','project',
    'vessel','client','team','cloudFileId','fileName','mimeType','person'
  ]);
  function semanticBusinessNode(value,key,path){
    if(Array.isArray(value)){
      var output=value.map(function(item){
        return semanticBusinessNode(item,key,path);
      });
      if(path==='atsrsProjectIds'){
        return Array.from(new Set(output.map(function(item){
          return String(item||'').toLowerCase();
        }).filter(Boolean))).sort();
      }
      if(path===''&&stableDataKind(key)!=='profile'
        &&output.every(function(item){
          return item&&typeof item==='object'&&!Array.isArray(item)
            &&validUuid(item.atsrsId);
        })){
        output.sort(function(left,right){
          return String(left.atsrsId).toLowerCase()
            .localeCompare(String(right.atsrsId).toLowerCase());
        });
      }
      return output;
    }
    if(value&&typeof value==='object'){
      var result={};
      Object.keys(value).sort().forEach(function(field){
        if(BUSINESS_VOLATILE_FIELDS.has(field))return;
        var fieldValue=value[field];
        if(BUSINESS_TRIM_FIELDS.has(field)&&typeof fieldValue==='string'){
          fieldValue=fieldValue.trim();
          if((field==='issue'||field==='expiry')
            &&(!fieldValue||/^(N\/A|NA)$/i.test(fieldValue))){
            fieldValue=null;
          }else if(!fieldValue){
            fieldValue=null;
          }
        }
        if((field==='phoneVerified'||field==='whatsappVerified')
          &&(fieldValue===undefined||fieldValue===null)){
          fieldValue=false;
        }
        if(field==='person'&&stableDataKind(key)==='certificates')return;
        if(field==='fileSize'&&(!value.cloudFileId||Number(fieldValue)===0))return;
        if((field==='cloudFileId'||field==='fileName'||field==='mimeType')
          &&(fieldValue===null||fieldValue===''))return;
        result[field]=semanticBusinessNode(fieldValue,key,field);
      });
      return result;
    }
    return value;
  }
  function semanticBusinessValue(key,value){
    try{
      return stableJson(semanticBusinessNode(JSON.parse(String(value)),key,''));
    }catch(error){
      return String(value);
    }
  }
  function sameBusinessValue(key,left,right){
    if(left===right)return true;
    return semanticBusinessValue(key,left)===semanticBusinessValue(key,right);
  }
  function plainObject(value){
    return !!(value&&typeof value==='object'&&!Array.isArray(value));
  }
  function conflictError(key,field){
    var error=new Error('ATSRS_WRITE_CONFLICT: newer server data overlaps this change.');
    error.code='ATSRS_WRITE_CONFLICT';
    error.dataKey=String(key);
    error.field=String(field||'');
    return error;
  }
  function mergeObjectFields(key,server,base,local,path){
    var merged=Object.assign({},server);
    var keys=new Set(Object.keys(base||{}).concat(Object.keys(local||{})));
    keys.forEach(function(field){
      var fieldPath=path?path+'.'+field:field;
      var baseHas=Object.prototype.hasOwnProperty.call(base||{},field);
      var localHas=Object.prototype.hasOwnProperty.call(local||{},field);
      var serverHas=Object.prototype.hasOwnProperty.call(server||{},field);
      var baseValue=baseHas?base[field]:undefined;
      var localValue=localHas?local[field]:undefined;
      var serverValue=serverHas?server[field]:undefined;
      if(stableJson(localValue)===stableJson(baseValue)&&localHas===baseHas)return;
      var serverChanged=stableJson(serverValue)!==stableJson(baseValue)||serverHas!==baseHas;
      if(serverChanged&&(
        stableJson(serverValue)!==stableJson(localValue)||serverHas!==localHas
      )){
        if(plainObject(serverValue)&&plainObject(baseValue)&&plainObject(localValue)){
          merged[field]=mergeObjectFields(key,serverValue,baseValue,localValue,fieldPath);
          return;
        }
        throw conflictError(key,fieldPath);
      }
      if(localHas)merged[field]=localValue;
      else delete merged[field];
    });
    return merged;
  }
  function entityId(item,index){
    if(item&&validUuid(item.atsrsId))return 'id:'+String(item.atsrsId);
    return 'legacy:'+index+':'+stableJson(item);
  }
  function mergeEntityArrays(key,server,base,local){
    var serverPositions=new Map();
    var basePositions=new Map();
    server.forEach(function(item,index){serverPositions.set(entityId(item,index),index);});
    base.forEach(function(item,index){basePositions.set(entityId(item,index),index);});
    var merged=server.slice();
    local.forEach(function(item,index){
      var id=entityId(item,index);
      var baseIndex=basePositions.get(id);
      var serverIndex=serverPositions.get(id);
      if(baseIndex===undefined){
        if(serverIndex===undefined){
          serverPositions.set(id,merged.length);
          merged.push(item);
        }else if(stableJson(merged[serverIndex])!==stableJson(item)){
          throw conflictError(key,id);
        }
        return;
      }
      if(stableJson(item)===stableJson(base[baseIndex]))return;
      if(serverIndex===undefined)throw conflictError(key,id);
      merged[serverIndex]=mergeObjectFields(key,merged[serverIndex],base[baseIndex],item,id);
    });
    base.forEach(function(item,index){
      var id=entityId(item,index);
      if(local.some(function(candidate,localIndex){return entityId(candidate,localIndex)===id;}))return;
      var serverIndex=serverPositions.get(id);
      if(serverIndex===undefined)return;
      if(stableJson(merged[serverIndex])!==stableJson(item))throw conflictError(key,id);
      merged[serverIndex]=null;
    });
    return merged.filter(function(item){return item!==null;});
  }
  function rebaseBusinessValue(key,serverValue,baseValue,localValue){
    if(sameValue(serverValue,baseValue))return String(localValue);
    if(sameValue(localValue,baseValue))return String(serverValue);
    var server;
    var base;
    var local;
    try{
      server=JSON.parse(String(serverValue));
      base=JSON.parse(String(baseValue));
      local=JSON.parse(String(localValue));
    }catch(error){
      throw conflictError(key,'value');
    }
    if(plainObject(server)&&plainObject(base)&&plainObject(local)){
      return JSON.stringify(mergeObjectFields(key,server,base,local,''));
    }
    if(Array.isArray(server)&&Array.isArray(base)&&Array.isArray(local)){
      return JSON.stringify(mergeEntityArrays(key,server,base,local));
    }
    throw conflictError(key,'value');
  }
  function emptyMergeBase(value){
    try{
      var decoded=JSON.parse(String(value));
      if(Array.isArray(decoded))return '[]';
      if(plainObject(decoded))return '{}';
    }catch(error){}
    return '';
  }
  function writeContext(){
    var valueUser=user();
    return valueUser?{user_id:valueUser.id,account_type:accountType()}:null;
  }
  function rowForStorage(key,value,context){
    context=context||writeContext();
    return {
      user_id:context.user_id,
      account_type:context.account_type,
      data_key:String(key),
      payload:{value:String(value)},
      updated_at:new Date().toISOString()
    };
  }
  async function loadStorageRow(key,context){
    var result=await client().from(DATA_TABLE)
      .select('payload,updated_at')
      .eq('user_id',context.user_id)
      .eq('account_type',context.account_type)
      .eq('data_key',String(key))
      .maybeSingle();
    if(result.error)throw result.error;
    return result.data||null;
  }
  function commandScope(context){
    return context.user_id+'::'+context.account_type;
  }
  function currentRevisionFromError(error){
    var detail=error&&error.details;
    if(detail&&typeof detail==='object'){
      var objectRevision=Number(detail.current_revision);
      return Number.isSafeInteger(objectRevision)&&objectRevision>=0
        ?objectRevision:null;
    }
    try{
      var decoded=JSON.parse(String(detail||''));
      var revision=Number(decoded.current_revision);
      return Number.isSafeInteger(revision)&&revision>=0?revision:null;
    }catch(_error){return null;}
  }
  function publishCommandRevision(context,revision){
    var scopeKey=commandScope(context);
    commandRevisions.set(scopeKey,revision);
    try{
      if(commandRevisionChannel){
        commandRevisionChannel.postMessage({scope:scopeKey,revision:revision});
      }
    }catch(_error){}
  }
  function commandClientBuild(){
    return String(
      window.ATSRS_CLIENT_BUILD
        ||document.documentElement.dataset.atsrsBuild
        ||'V407'
    ).slice(0,64);
  }
  async function commandAuditMetadata(){
    var instance='';
    try{
      instance=sessionStorage.getItem('atsrs_client_instance_v1')||'';
      if(!instance){
        instance=randomUuid();
        sessionStorage.setItem('atsrs_client_instance_v1',instance);
      }
    }catch(_error){instance=randomUuid();}
    return {
      channel:'browser',
      rollout_stage:normalizedWriteCanaryRequested()?'canary':'default',
      client_instance_hash:await sha256Hex(instance)
    };
  }
  function commandRequestTimeoutMs(){
    var config=window.__ATSRS_NORMALIZED_WRITE_CANARY__||{};
    return workspaceCommandPolicy().requestTimeoutMs(config);
  }
  function commandCircuitConfig(){
    var config=window.__ATSRS_NORMALIZED_WRITE_CANARY__||{};
    return workspaceCommandPolicy().circuitConfig(config);
  }
  function commandCircuitState(context){
    var scopeKey=commandScope(context);
    var state=commandCircuits.get(scopeKey);
    if(!state){
      state={failures:0,openUntil:0,code:''};
      commandCircuits.set(scopeKey,state);
    }
    return {scopeKey:scopeKey,state:state};
  }
  function publishCommandCircuit(scopeKey,state){
    try{
      if(commandCircuitChannel){
        commandCircuitChannel.postMessage({
          scope:scopeKey,
          failures:Number(state.failures)||0,
          openUntil:Number(state.openUntil)||0,
          code:String(state.code||'')
        });
      }
    }catch(_error){}
  }
  function openCommandCircuit(context,error,duration){
    var entry=commandCircuitState(context);
    entry.state.openUntil=Math.max(entry.state.openUntil,Date.now()+duration);
    entry.state.code=writeErrorCode(error)||'ATSRS_CIRCUIT_OPEN';
    commandCircuits.set(entry.scopeKey,entry.state);
    publishCommandCircuit(entry.scopeKey,entry.state);
  }
  function commandCircuitError(context,key){
    var entry=commandCircuitState(context);
    if(entry.state.openUntil<=Date.now())return null;
    var error=new Error('ATSRS normalized write circuit is temporarily open.');
    error.code='ATSRS_CIRCUIT_OPEN';
    error.retryAfterMs=Math.max(0,entry.state.openUntil-Date.now());
    return attachWriteContext(error,{key:key},'normalized_circuit');
  }
  function assertCommandCircuitClosed(context,key){
    var error=commandCircuitError(context,key);
    if(error)throw error;
  }
  function recordCommandSuccess(context){
    var entry=commandCircuitState(context);
    if(!entry.state.failures&&!entry.state.openUntil)return;
    entry.state={failures:0,openUntil:0,code:''};
    commandCircuits.set(entry.scopeKey,entry.state);
    publishCommandCircuit(entry.scopeKey,entry.state);
  }
  function recordCommandFailure(context,error){
    var entry=commandCircuitState(context);
    var config=commandCircuitConfig();
    if(isStaleRevision(error)){
      entry.state.failures=config.failureThreshold;
      commandCircuits.set(entry.scopeKey,entry.state);
      openCommandCircuit(context,error,config.staleOpenMs);
      return;
    }
    if(isWorkspaceBusy(error)){
      entry.state.failures=config.failureThreshold;
      commandCircuits.set(entry.scopeKey,entry.state);
      openCommandCircuit(context,error,config.busyOpenMs);
      return;
    }
    if(isRateLimited(error)){
      entry.state.failures=config.failureThreshold;
      commandCircuits.set(entry.scopeKey,entry.state);
      openCommandCircuit(context,error,config.rateLimitOpenMs);
      return;
    }
    if(!isRetryableWriteError(error))return;
    entry.state.failures=(entry.state.failures||0)+1;
    commandCircuits.set(entry.scopeKey,entry.state);
    if(entry.state.failures>=config.failureThreshold){
      openCommandCircuit(context,error,config.transientOpenMs);
    }else{
      publishCommandCircuit(entry.scopeKey,entry.state);
    }
  }
  function transientRetryDelay(attempt){
    return workspaceCommandPolicy().transientRetryDelay(attempt,Math.random);
  }
  function waitForTransientRetry(attempt){
    return new Promise(function(resolve){
      setTimeout(resolve,transientRetryDelay(attempt));
    });
  }
  function isWorkspaceBusy(error){
    return workspaceCommandPolicy().isWorkspaceBusy(error);
  }
  function isRateLimited(error){
    return workspaceCommandPolicy().isRateLimited(error);
  }
  function commandLockName(context){
    return 'atsrs-workspace-command-v1:'
      +String(context&&context.user_id||'unknown')+':'
      +String(context&&context.account_type||'personal');
  }
  async function withWorkspaceCommandLock(context,key,task){
    var locks=window.navigator&&window.navigator.locks;
    if(!locks||typeof locks.request!=='function')return task();
    var controller=typeof AbortController==='function'?new AbortController():null;
    var timer=0;
    if(controller){
      timer=setTimeout(function(){controller.abort();},commandRequestTimeoutMs()+3000);
    }
    try{
      return await locks.request(
        commandLockName(context),
        controller?{mode:'exclusive',signal:controller.signal}:{mode:'exclusive'},
        task
      );
    }catch(error){
      if(String(error&&error.name||'')==='AbortError'){
        var lockError=new Error('ATSRS workspace command coordination timed out.');
        lockError.code='ATSRS_COMMAND_LOCK_TIMEOUT';
        throw attachWriteContext(lockError,{key:key},'normalized_command_lock');
      }
      throw error;
    }finally{
      clearTimeout(timer);
    }
  }
  async function executeRpcAttempt(functionName,args,key,phase,timeoutCode){
    var controller=typeof AbortController==='function'?new AbortController():null;
    var timedOut=false;
    var timer=0;
    var timeout=new Promise(function(_resolve,reject){
      timer=setTimeout(function(){
        timedOut=true;
        if(controller)controller.abort();
        var error=new Error('ATSRS normalized command transport timed out.');
        error.code=timeoutCode;
        reject(attachWriteContext(error,{key:key},phase));
      },commandRequestTimeoutMs());
    });
    try{
      var request=client().rpc(functionName,args);
      if(request&&typeof request.retry==='function')request=request.retry(false);
      if(controller&&request&&typeof request.abortSignal==='function'){
        request=request.abortSignal(controller.signal);
      }
      var result=await Promise.race([Promise.resolve(request),timeout]);
      if(result&&result.error){
        result.error=attachWriteContext(result.error,{key:key},phase);
        if(result.error.status===undefined&&result.status!==undefined){
          result.error.status=result.status;
        }
      }
      return result;
    }catch(error){
      if(timedOut||String(error&&error.name||'')==='AbortError'){
        var timeoutError=new Error('ATSRS normalized command transport timed out.');
        timeoutError.code=timeoutCode;
        throw attachWriteContext(timeoutError,{key:key},phase);
      }
      throw error;
    }finally{
      clearTimeout(timer);
    }
  }
  async function executeRpcWithTransientRetry(
    functionName,args,key,context,phase,timeoutCode
  ){
    assertCommandCircuitClosed(context,key);
    var retries=commandCircuitConfig().transientRetries;
    var lastError=null;
    for(var attempt=0;attempt<=retries;attempt++){
      try{
        var result=await executeRpcAttempt(
          functionName,args,key,phase,timeoutCode
        );
        if(!result||!result.error){
          recordCommandSuccess(context);
          return result;
        }
        lastError=result.error;
        if(!isRetryableWriteError(lastError)||attempt>=retries){
          recordCommandFailure(context,lastError);
          return result;
        }
      }catch(error){
        lastError=attachWriteContext(error,{key:key},phase);
        if(!isRetryableWriteError(lastError)||attempt>=retries){
          recordCommandFailure(context,lastError);
          throw lastError;
        }
      }
      await waitForTransientRetry(attempt);
    }
    recordCommandFailure(context,lastError);
    throw lastError;
  }
  async function executeCommandRpc(args,key,context){
    return executeRpcWithTransientRetry(
      'atsrs_apply_workspace_command',
      args,
      key,
      context,
      'normalized_transport',
      'ATSRS_TRANSPORT_TIMEOUT'
    );
  }
  function stableCompatibilityRuntime(){
    var runtime=window.ATSRSStableIdCompatibilityRuntime;
    if(!runtime||typeof runtime.requested!=='function'
      ||typeof runtime.config!=='function'
      ||typeof runtime.cacheMs!=='function'
      ||typeof runtime.refreshRequired!=='function'){
      var error=new Error('ATSRS_COMPATIBILITY_RUNTIME_MISSING');
      error.code='ATSRS_COMPATIBILITY_RUNTIME_MISSING';
      throw error;
    }
    return runtime;
  }
  function stableCompatibilityConfig(){
    return stableCompatibilityRuntime().config(window);
  }
  async function stableCompatibilityRequested(context){
    var runtime=stableCompatibilityRuntime();
    var config=stableCompatibilityConfig();
    return runtime.requested({
      config:config,
      context:context,
      locationSearch:window.location.search,
      getScopeHash:function(){
        return sha256Hex(commandScope(context));
      }
    });
  }
  async function assertStableCompatibility(context,key){
    var config=stableCompatibilityConfig();
    if(!context||!stableDataKind(key)
      ||!await stableCompatibilityRequested(context))return true;
    var scopeKey=commandScope(context);
    var cached=stableCompatibilityCache.get(scopeKey);
    var runtime=stableCompatibilityRuntime();
    var cacheMs=runtime.cacheMs(config);
    if(cached&&cached.expiresAt>Date.now()){
      if(cached.refreshRequired)throw cached.error;
      return true;
    }
    var result=await executeRpcWithTransientRetry(
      'atsrs_get_stable_id_compatibility',
      {
        p_account_type:context.account_type,
        p_client_build:commandClientBuild()
      },
      key,
      context,
      'stable_id_compatibility',
      'ATSRS_COMPATIBILITY_TIMEOUT'
    );
    if(result.error)throw result.error;
    var state=result.data||{};
    if(runtime.refreshRequired(state)){
      var refreshError=new Error('ATSRS_STABLE_ID_REFRESH_REQUIRED');
      refreshError.code='ATSRS_STABLE_ID_REFRESH_REQUIRED';
      refreshError.minimumClientBuild=String(
        state.minimum_client_build||''
      );
      refreshError=attachWriteContext(
        refreshError,{key:key},'stable_id_compatibility'
      );
      stableCompatibilityCache.set(scopeKey,{
        refreshRequired:true,
        error:refreshError,
        expiresAt:Date.now()+cacheMs
      });
      window.dispatchEvent(new CustomEvent(
        'atsrs:stable-id-refresh-required',
        {detail:{
          accountType:context.account_type,
          minimumClientBuild:refreshError.minimumClientBuild,
          code:refreshError.code
        }}
      ));
      throw refreshError;
    }
    stableCompatibilityCache.set(scopeKey,{
      refreshRequired:false,
      expiresAt:Date.now()+cacheMs
    });
    return true;
  }
  async function loadFreshCommandRevision(context,key){
    var result=await executeRpcWithTransientRetry(
      'atsrs_get_workspace_command_revision',
      {p_account_type:context.account_type},
      key,
      context,
      'normalized_revision',
      'ATSRS_REVISION_TIMEOUT'
    );
    if(result.error)throw result.error;
    var revision=Number(result.data);
    if(!Number.isSafeInteger(revision)||revision<0){
      var revisionError=new Error('ATSRS_INVALID_REVISION_RESULT');
      revisionError.code='ATSRS_INVALID_REVISION_RESULT';
      throw attachWriteContext(
        revisionError,{key:key},'normalized_revision'
      );
    }
    publishCommandRevision(context,revision);
    return revision;
  }
  async function applyNormalizedCommandUnlocked(
    key,value,deleted,context,baseValue,operationId
  ){
    var scopeKey=commandScope(context);
    var expected=commandRevisions.get(scopeKey)||0;
    var candidate=deleted?null:String(value);
    var mergeBase=baseValue===null||baseValue===undefined
      ?emptyMergeBase(candidate):String(baseValue);
    var freshRevision=await loadFreshCommandRevision(context,key);
    if(freshRevision!==expected){
      var freshRow=await loadStorageRow(key,context);
      if(deleted){
        if(!freshRow||!freshRow.payload
          ||freshRow.payload.deleted===true
          ||typeof freshRow.payload.value!=='string'){
          serverValues.delete(String(key));
          if(freshRow&&freshRow.updated_at){
            rowVersions.set(String(key),freshRow.updated_at);
          }
          return null;
        }
        var freshDeleteValue=String(freshRow.payload.value);
        rowVersions.set(String(key),freshRow.updated_at);
        serverValues.set(String(key),freshDeleteValue);
        if(!sameValue(freshDeleteValue,mergeBase)){
          throw conflictError(key,'normalized_delete');
        }
        mergeBase=freshDeleteValue;
      }else{
        if(!freshRow||!freshRow.payload
          ||typeof freshRow.payload.value!=='string'){
          throw conflictError(key,'normalized_row');
        }
        var freshValue=await hydrateStableValue(key,String(freshRow.payload.value));
        rowVersions.set(String(key),freshRow.updated_at);
        serverValues.set(String(key),freshValue);
        candidate=rebaseBusinessValue(key,freshValue,mergeBase,candidate);
        mergeBase=freshValue;
        if(sameValue(candidate,freshValue))return freshValue;
      }
      expected=freshRevision;
    }
    var auditMetadata=await commandAuditMetadata();
    var operation={data_key:String(key)};
    if(deleted)operation.deleted=true;
    else{
      try{operation.value=JSON.parse(candidate);}
      catch(error){
        error.code='ATSRS_INVALID_CLIENT_GRAPH';
        throw attachWriteContext(error,{key:key},'normalized_parse');
      }
    }
    var result=await executeCommandRpc({
      p_operation_id:operationId,
      p_expected_revision:expected,
      p_account_type:context.account_type,
      p_client_build:commandClientBuild(),
      p_operations:[operation],
      p_audit_metadata:auditMetadata
    },key,context);
    if(result.error){
      throw attachWriteContext(
        result.error,{key:key},'normalized_command'
      );
    }
    var response=result.data||{};
    var committedRevision=Number(response.committed_revision);
    if(!Number.isSafeInteger(committedRevision)||committedRevision<0){
      var revisionError=new Error('ATSRS_INVALID_COMMAND_RESULT');
      revisionError.code='ATSRS_INVALID_COMMAND_RESULT';
      throw attachWriteContext(revisionError,{key:key},'normalized_result');
    }
    publishCommandRevision(context,committedRevision);
    var committedRow=await loadStorageRow(key,context);
    if(committedRow&&committedRow.updated_at){
      rowVersions.set(String(key),committedRow.updated_at);
    }
    if(deleted){
      serverValues.delete(String(key));
      return null;
    }
    var committedValue=committedRow&&committedRow.payload
      &&typeof committedRow.payload.value==='string'
      ?String(committedRow.payload.value):candidate;
    serverValues.set(String(key),committedValue);
    return committedValue;
  }
  async function applyNormalizedCommand(
    key,value,deleted,context,baseValue,operationId
  ){
    return withWorkspaceCommandLock(context,key,function(){
      return applyNormalizedCommandUnlocked(
        key,value,deleted,context,baseValue,operationId
      );
    });
  }
  async function upsertStorageValue(key,value,context,baseValue){
    if(!context)return String(value);
    var candidate=String(value);
    var mergeBase=baseValue===null||baseValue===undefined?emptyMergeBase(candidate):String(baseValue);
    for(var attempt=0;attempt<3;attempt++){
      var row=rowForStorage(key,candidate,context);
      var expected=rowVersions.get(String(key));
      var query=expected
        ?client().from(DATA_TABLE)
          .update(row)
          .eq('user_id',context.user_id)
          .eq('account_type',context.account_type)
          .eq('data_key',String(key))
          .eq('updated_at',expected)
          .select('updated_at')
          .maybeSingle()
        :client().from(DATA_TABLE)
          .insert(row)
          .select('updated_at')
          .single();
      var result=await query;
      if(result.error){
        var insertError=attachWriteContext(result.error,{key:key},expected?'cas_update':'insert');
        if(!expected&&isDuplicateInsert(insertError)){
          var duplicateLatest=await loadStorageRow(key,context);
          if(!duplicateLatest||!duplicateLatest.payload||typeof duplicateLatest.payload.value!=='string'){
            throw insertError;
          }
          var duplicateValue=String(duplicateLatest.payload.value);
          rowVersions.set(String(key),duplicateLatest.updated_at);
          serverValues.set(String(key),duplicateValue);
          candidate=rebaseBusinessValue(key,duplicateValue,mergeBase,candidate);
          mergeBase=duplicateValue;
          if(sameValue(candidate,duplicateValue))return duplicateValue;
          continue;
        }
        throw insertError;
      }
      if(result.data){
        rowVersions.set(String(key),result.data.updated_at);
        serverValues.set(String(key),candidate);
        return candidate;
      }
      var latest=await loadStorageRow(key,context);
      if(!latest||!latest.payload||typeof latest.payload.value!=='string'){
        throw conflictError(key,'row');
      }
      var latestValue=String(latest.payload.value);
      rowVersions.set(String(key),latest.updated_at);
      serverValues.set(String(key),latestValue);
      candidate=rebaseBusinessValue(key,latestValue,mergeBase,candidate);
      mergeBase=latestValue;
      if(sameValue(candidate,latestValue))return latestValue;
    }
    throw conflictError(key,'retry_limit');
  }
  async function deleteStorageValue(key,context,baseValue){
    if(!context)return;
    for(var attempt=0;attempt<3;attempt++){
      var row={
        user_id:context.user_id,
        account_type:context.account_type,
        data_key:String(key),
        payload:{deleted:true},
        updated_at:new Date().toISOString()
      };
      var expected=rowVersions.get(String(key));
      var query=expected
        ?client().from(DATA_TABLE)
          .update(row)
          .eq('user_id',context.user_id)
          .eq('account_type',context.account_type)
          .eq('data_key',String(key))
          .eq('updated_at',expected)
          .select('updated_at')
          .maybeSingle()
        :client().from(DATA_TABLE)
          .insert(row)
          .select('updated_at')
          .single();
      var result=await query;
      if(result.error){
        var deleteError=attachWriteContext(result.error,{key:key},expected?'delete_cas':'delete_insert');
        if(!expected&&isDuplicateInsert(deleteError)){
          var duplicateDeleteLatest=await loadStorageRow(key,context);
          if(!duplicateDeleteLatest||!duplicateDeleteLatest.payload||typeof duplicateDeleteLatest.payload.value!=='string'){
            throw deleteError;
          }
          if(!sameValue(duplicateDeleteLatest.payload.value,baseValue))throw conflictError(key,'delete');
          rowVersions.set(String(key),duplicateDeleteLatest.updated_at);
          serverValues.set(String(key),String(duplicateDeleteLatest.payload.value));
          continue;
        }
        throw deleteError;
      }
      if(result.data){
        rowVersions.set(String(key),result.data.updated_at);
        serverValues.delete(String(key));
        return;
      }
      var latest=await loadStorageRow(key,context);
      if(!latest||!latest.payload||typeof latest.payload.value!=='string'){
        throw conflictError(key,'delete');
      }
      if(!sameValue(latest.payload.value,baseValue))throw conflictError(key,'delete');
      rowVersions.set(String(key),latest.updated_at);
    }
    throw conflictError(key,'delete_retry_limit');
  }
  function readBusinessValue(key){
    if(!isCloudSession()||!isManagedBusinessKey(key))return null;
    var legacyValue=memoryStore.has(String(key))?memoryStore.get(String(key)):null;
    var runtime=window.atsrsNormalizedReadRuntime;
    return runtime&&typeof runtime.read==='function'
      ?runtime.read(key,legacyValue)
      :legacyValue;
  }
  function writeBusinessValue(key,value){
    if(!shouldSyncKey(key))return false;
    key=String(key);
    value=normalizeStableValue(key,value);
    if(memoryStore.has(key)&&sameBusinessValue(key,memoryStore.get(key),value))return true;
    if(window.atsrsNormalizedReadRuntime
      &&typeof window.atsrsNormalizedReadRuntime.invalidate==='function'){
      window.atsrsNormalizedReadRuntime.invalidate(key);
    }
    failedOperations=failedOperations.filter(function(entry){
      return !(entry&&entry.retryable===false&&entry.key===key);
    });
    if(!failedOperations.length)lastWriteError=null;
    var context=writeContext();
    var hadPrevious=memoryStore.has(key);
    var previousValue=hadPrevious?memoryStore.get(key):null;
    var baseValue=serverValues.has(key)?serverValues.get(key):previousValue;
    var version=(writeVersions.get(key)||0)+1;
    var operationId=randomUuid();
    writeVersions.set(key,version);
    memoryStore.set(key,value);
    enqueue(
      async function(){
        if(writeVersions.get(key)!==version)return;
        await assertStableCompatibility(context,key);
        var operationBase=persistedWriteVersions.get(key)===version-1
          ?previousValue
          :baseValue;
        var candidate=serverValues.has(key)
          ?rebaseBusinessValue(key,serverValues.get(key),operationBase,value)
          :value;
        var useNormalized=await normalizedPrimaryWriteEnabled(context,key);
        var persisted=useNormalized
          ?await applyNormalizedCommand(
            key,candidate,false,context,serverValues.get(key),operationId
          )
          :await upsertStorageValue(key,candidate,context,serverValues.get(key));
        persistedWriteVersions.set(key,version);
        if(writeVersions.get(key)===version)memoryStore.set(key,persisted);
      },
      function(){
        if(writeVersions.get(key)!==version)return;
        if(serverValues.has(key))memoryStore.set(key,serverValues.get(key));
        else if(hadPrevious)memoryStore.set(key,previousValue);
        else memoryStore.delete(key);
        if(typeof window.renderAll==='function')setTimeout(window.renderAll,0);
      },
      {key:key,scope:context.user_id+'::'+context.account_type,version:version}
    );
    return true;
  }
  function removeBusinessValue(key){
    if(!shouldSyncKey(key))return false;
    key=String(key);
    if(window.atsrsNormalizedReadRuntime
      &&typeof window.atsrsNormalizedReadRuntime.invalidate==='function'){
      window.atsrsNormalizedReadRuntime.invalidate(key);
    }
    failedOperations=failedOperations.filter(function(entry){
      return !(entry&&entry.retryable===false&&entry.key===key);
    });
    if(!failedOperations.length)lastWriteError=null;
    var context=writeContext();
    var hadPrevious=memoryStore.has(key);
    var previousValue=hadPrevious?memoryStore.get(key):null;
    var baseValue=serverValues.has(key)?serverValues.get(key):previousValue;
    var version=(writeVersions.get(key)||0)+1;
    var operationId=randomUuid();
    writeVersions.set(key,version);
    memoryStore.delete(key);
    enqueue(
      async function(){
        if(writeVersions.get(key)!==version)return;
        await assertStableCompatibility(context,key);
        var useNormalized=await normalizedPrimaryWriteEnabled(context,key);
        if(useNormalized){
          await applyNormalizedCommand(
            key,null,true,context,baseValue,operationId
          );
        }else{
          await deleteStorageValue(key,context,baseValue);
        }
        persistedWriteVersions.set(key,version);
        if(writeVersions.get(key)===version)memoryStore.delete(key);
      },
      function(){
        if(writeVersions.get(key)!==version)return;
        if(serverValues.has(key))memoryStore.set(key,serverValues.get(key));
        else if(hadPrevious)memoryStore.set(key,previousValue);
        if(typeof window.renderAll==='function')setTimeout(window.renderAll,0);
      },
      {key:key,scope:context.user_id+'::'+context.account_type,version:version}
    );
    return true;
  }

  Storage.prototype.getItem=function(key){
    if(this===localStorage&&isCloudSession()&&isManagedBusinessKey(key)){
      return readBusinessValue(key);
    }
    if(this===localStorage&&isCloudSession()&&isLegacyFileKeyForCurrentScope(key)){
      return null;
    }
    return nativeGet.call(this,key);
  };
  Storage.prototype.setItem=function(key,value){
    if(this===localStorage&&writeBusinessValue(key,value))return;
    if(this===localStorage&&isCloudSession()&&isLegacyFileKeyForCurrentScope(key)){
      return;
    }
    nativeSet.call(this,key,value);
  };
  Storage.prototype.removeItem=function(key){
    if(this===localStorage&&removeBusinessValue(key))return;
    if(this===localStorage&&isCloudSession()&&isLegacyFileKeyForCurrentScope(key)){
      nativeRemove.call(this,key);
      return;
    }
    nativeRemove.call(this,key);
  };

  window.addEventListener('beforeunload',function(event){
    if(!pendingWrites&&!failedOperations.length)return;
    event.preventDefault();
    event.returnValue='';
  });
  async function flushWritesOnce(){
    var passes=0;
    while(passes<4){
      passes++;
      var observedQueue=writeQueue;
      await observedQueue;
      var legacyRetry=[];
      failedOperations=failedOperations.filter(function(entry){
        if(entry&&entry.autoRetry===true){
          entry.autoRetry=false;
          legacyRetry.push(entry);
          return false;
        }
        return true;
      });
      for(var retryIndex=0;retryIndex<legacyRetry.length;retryIndex++){
        var retryEntry=legacyRetry[retryIndex];
        try{
          await retryEntry.run();
        }catch(error){
          error=classifyFailedEntry(retryEntry,error);
          lastWriteError=error;
          if(retryEntry.retryable)logWriteDelay(error,retryEntry);
          else if(isWriteConflict(error))logWriteConflict(error,retryEntry);
          else logWriteRejected(error,retryEntry);
          failedOperations.push(retryEntry);
        }
      }
      if(writeQueue===observedQueue&&pendingWrites===0&&!failedOperations.length){
        lastWriteError=null;
        return true;
      }
      if(writeQueue===observedQueue&&pendingWrites===0&&failedOperations.length){
        showSaveWarning();
        return false;
      }
    }
    if(lastWriteError){
      console.warn('ATSRS cloud save remains pending after a bounded drain.',{
        dataKey:lastWriteError.dataKey||'',
        code:writeErrorCode(lastWriteError)||'UNKNOWN',
        phase:lastWriteError.phase||''
      });
    }
    showSaveWarning();
    return false;
  }
  function flushWrites(){
    if(flushPromise)return flushPromise;
    flushPromise=flushWritesOnce().finally(function(){flushPromise=null;});
    return flushPromise;
  }
  function failedEntryCircuitOpen(entry){
    var state=commandCircuits.get(String(entry&&entry.scope||''));
    return !!(state&&Number(state.openUntil)>Date.now());
  }
  function retryFailedOperations(){
    if(retryFailedPromise)return retryFailedPromise;
    retryFailedPromise=(async function(){
      var now=Date.now();
      var retry=[];
      failedOperations=failedOperations.filter(function(entry){
        if(!entry||entry.retryable!==true)return true;
        if(Number(entry.nextRetryAt||0)>now||failedEntryCircuitOpen(entry))return true;
        retry.push(entry);
        return false;
      });
      for(var i=0;i<retry.length;i++){
        var entry=retry[i];
        try{
          await entry.run();
        }catch(error){
          error=classifyFailedEntry(entry,error);
          lastWriteError=error;
          if(entry.retryable)logWriteDelay(error,entry);
          else if(isWriteConflict(error))logWriteConflict(error,entry);
          else logWriteRejected(error,entry);
          failedOperations.push(entry);
        }
      }
      if(!failedOperations.length)lastWriteError=null;
      return !failedOperations.length;
    })().finally(function(){retryFailedPromise=null;});
    return retryFailedPromise;
  }
  window.addEventListener('online',function(){
    if(!pendingWrites&&!failedOperations.length)return;
    retryFailedOperations().then(flushWrites).catch(function(error){
      console.warn('ATSRS reconnect save is still pending.',{
        dataKey:error&&error.dataKey||'',
        code:writeErrorCode(error)||'UNKNOWN'
      });
    });
  });

  function allLocalKeys(){
    var keys=[];
    try{
      for(var i=0;i<localStorage.length;i++){
        var key=localStorage.key(i);
        if(key)keys.push(key);
      }
    }catch(e){}
    return keys;
  }
  function canonicalBusinessKey(key,context){
    var valueUser=user();
    if(!valueUser)return '';
    key=String(key||'');
    var currentPrefix='atsrs_'+valueUser.id+'_';
    var currentMode=context&&context.account_type?context.account_type:accountType();
    var currentScopePrefix=currentPrefix+currentMode+'_';
    if(key.indexOf(currentScopePrefix)===0)return isFileLikeKey(key)?'':key;
    if(key.indexOf(currentPrefix+'personal_')===0||key.indexOf(currentPrefix+'company_')===0){
      return '';
    }
    if(key.indexOf(currentPrefix)===0){
      var currentSuffix=key.slice(currentPrefix.length);
      if(!currentSuffix||/^(auth|workspace|last_workspace|pending|google|remember|saved_login|current_page|use_mode)/i.test(currentSuffix))return '';
      return isFileLikeKey(key)?'':currentScopePrefix+currentSuffix;
    }
    var legacyPrefix='atsrs_local_test_user_';
    if(key.indexOf(legacyPrefix)!==0)return '';
    var suffix=key.slice(legacyPrefix.length);
    if(suffix.indexOf(currentMode+'_')===0){
      return isFileLikeKey(key)?'':currentPrefix+suffix;
    }
    if(suffix.indexOf('personal_')===0||suffix.indexOf('company_')===0)return '';
    return isFileLikeKey(key)?'':currentScopePrefix+suffix;
  }
  function certificateIdentity(item,index){
    item=item&&typeof item==='object'?item:{};
    if(item.cloudFileId)return 'file:'+String(item.cloudFileId);
    if(item.docNo){
      return 'doc:'+[
        item.docNo,item.type,item.provider,item.person
      ].map(function(value){return String(value||'').trim().toLowerCase();}).join('|');
    }
    var fallback=[
      item.type,item.provider,item.person,item.fileName,item.issue
    ].map(function(value){return String(value||'').trim().toLowerCase();}).join('|');
    return fallback.replace(/\|/g,'')?'fields:'+fallback:'row:'+index+':'+JSON.stringify(item);
  }
  function mergeCertificateValues(serverValue,localValue){
    try{
      var serverRows=JSON.parse(serverValue);
      var localRows=JSON.parse(localValue);
      if(!Array.isArray(serverRows)||!Array.isArray(localRows))return serverValue;
      var merged=serverRows.slice();
      var positions=new Map();
      merged.forEach(function(item,index){
        positions.set(certificateIdentity(item,index),index);
      });
      localRows.forEach(function(item,index){
        var identity=certificateIdentity(item,index);
        if(positions.has(identity)){
          merged[positions.get(identity)]=item;
        }else{
          positions.set(identity,merged.length);
          merged.push(item);
        }
      });
      return JSON.stringify(merged);
    }catch(error){
      console.warn('ATSRS certificate migration merge failed',error);
      return serverValue;
    }
  }
  function usefulProfileValue(value){
    if(Array.isArray(value))return value.length>0;
    if(value&&typeof value==='object')return Object.keys(value).length>0;
    return value!==null&&value!==undefined&&String(value).trim()!=='';
  }
  function mergeProfileValues(serverValue,localValue){
    try{
      var serverProfile=JSON.parse(serverValue);
      var localProfile=JSON.parse(localValue);
      if(!serverProfile||typeof serverProfile!=='object'||Array.isArray(serverProfile))return localValue;
      if(!localProfile||typeof localProfile!=='object'||Array.isArray(localProfile))return serverValue;
      var merged=Object.assign({},serverProfile);
      var serverSaved=Date.parse(serverProfile.savedAt||serverProfile.updatedAt||'')||0;
      var localSaved=Date.parse(localProfile.savedAt||localProfile.updatedAt||'')||0;
      Object.keys(localProfile).forEach(function(field){
        var localValue=localProfile[field];
        if(!usefulProfileValue(localValue))return;
        if(!usefulProfileValue(merged[field])||localSaved>serverSaved)merged[field]=localValue;
      });
      return JSON.stringify(merged);
    }catch(error){
      console.warn('ATSRS profile migration merge failed',error);
      return serverValue;
    }
  }
  async function loadWorkspaceRows(context){
    context=context||writeContext();
    var result=await client().from(DATA_TABLE)
      .select('data_key,payload,updated_at')
      .eq('user_id',context.user_id)
      .eq('account_type',context.account_type);
    if(result.error)throw result.error;
    return result.data||[];
  }
  async function migrateLegacyStorage(serverRows,context){
    context=context||writeContext();
    var canonicalRows=new Map();
    var deletedKeys=new Set();
    var obsoleteServerKeys=[];
    (serverRows||[]).forEach(function(row){
      if(!row||!row.data_key||String(row.data_key).indexOf('__cloud_')===0)return;
      var canonical=canonicalBusinessKey(row.data_key,context);
      if(!canonical)return;
      var payload=row.payload||{};
      if(payload.deleted===true){
        deletedKeys.add(canonical);
        canonicalRows.delete(canonical);
        if(canonical!==row.data_key)obsoleteServerKeys.push(row.data_key);
        return;
      }
      if(deletedKeys.has(canonical))return;
      if(!canonicalRows.has(canonical)&&typeof payload.value==='string'){
        canonicalRows.set(canonical,payload.value);
      }
      if(canonical!==row.data_key)obsoleteServerKeys.push(row.data_key);
    });
    allLocalKeys().forEach(function(oldKey){
      var key=canonicalBusinessKey(oldKey,context);
      if(!key||deletedKeys.has(key))return;
      var value=nativeGet.call(localStorage,oldKey);
      if(value===null)return;
      if(canonicalRows.has(key)){
        if(/_certs$/.test(key)){
          canonicalRows.set(key,mergeCertificateValues(canonicalRows.get(key),value));
        }else if(/_profile$/.test(key)){
          canonicalRows.set(key,mergeProfileValues(canonicalRows.get(key),value));
        }
        return;
      }
      canonicalRows.set(key,value);
    });
    var rows=Array.from(canonicalRows.entries()).map(function(entry){
      return rowForStorage(entry[0],entry[1],context);
    });
    deletedKeys.forEach(function(key){
      rows.push({
        user_id:context.user_id,
        account_type:context.account_type,
        data_key:key,
        payload:{deleted:true},
        updated_at:new Date().toISOString()
      });
    });
    rows.push({
      user_id:context.user_id,
      account_type:context.account_type,
      data_key:DATA_MIGRATION_KEY,
      payload:{completed_at:new Date().toISOString()},
      updated_at:new Date().toISOString()
    });
    var result=await client().from(DATA_TABLE).upsert(
      rows,
      {onConflict:'user_id,account_type,data_key'}
    );
    if(result.error)throw result.error;
    if(obsoleteServerKeys.length){
      var cleanup=await client().from(DATA_TABLE)
        .delete()
        .eq('user_id',context.user_id)
        .eq('account_type',context.account_type)
        .in('data_key',Array.from(new Set(obsoleteServerKeys)));
      if(cleanup.error)throw cleanup.error;
    }
    return loadWorkspaceRows(context);
  }
  function restoreServerRows(rows,context){
    var prefix=context?'atsrs_'+context.user_id+'_'+context.account_type+'_':managedPrefix();
    Array.from(memoryStore.keys()).forEach(function(key){
      if(prefix&&key.indexOf(prefix)===0)memoryStore.delete(key);
    });
    Array.from(rowVersions.keys()).forEach(function(key){
      if(prefix&&key.indexOf(prefix)===0)rowVersions.delete(key);
    });
    Array.from(persistedWriteVersions.keys()).forEach(function(key){
      if(prefix&&key.indexOf(prefix)===0)persistedWriteVersions.delete(key);
    });
    Array.from(serverValues.keys()).forEach(function(key){
      if(prefix&&key.indexOf(prefix)===0)serverValues.delete(key);
    });
    (rows||[]).forEach(function(row){
      if(!row||!row.data_key||String(row.data_key).indexOf('__cloud_')===0)return;
      if(!isManagedBusinessKey(row.data_key))return;
      var payload=row.payload||{};
      if(typeof payload.value==='string'){
        memoryStore.set(String(row.data_key),payload.value);
        serverValues.set(String(row.data_key),payload.value);
      }
      if(row.updated_at)rowVersions.set(String(row.data_key),row.updated_at);
    });
  }
  function clearNativeBusinessData(){
    allLocalKeys().forEach(function(key){
      if(canonicalBusinessKey(key))nativeRemove.call(localStorage,key);
    });
  }
  async function ensureWorkspaceData(){
    if(!isCloudSession())throw new Error('No active Supabase session.');
    var context=writeContext();
    var wantedScope=context.user_id+'::'+context.account_type;
    if(loadedScope===wantedScope)return true;
    if(loadingPromise&&loadingPromise.scope===wantedScope)return loadingPromise;
    if(window.atsrsReferenceFilterState){
      window.atsrsReferenceFilterState.begin({scope:wantedScope,source:'cloud'});
    }
    var promise=(async function(){
      var rows=await loadWorkspaceRows(context);
      if(scope()!==wantedScope)return ensureWorkspaceData();
      var dataMigrationDone=rows.some(function(row){return row&&row.data_key===DATA_MIGRATION_KEY;});
      var fileMigrationDone=rows.some(function(row){return row&&row.data_key===FILE_MIGRATION_KEY;});
      if(!dataMigrationDone)rows=await migrateLegacyStorage(rows,context);
      if(scope()!==wantedScope)return ensureWorkspaceData();
      await hydrateStableRows(rows);
      if(scope()!==wantedScope)return ensureWorkspaceData();
      restoreServerRows(rows,context);
      if(!fileMigrationDone)await migrateLegacyFiles(rows);
      clearNativeBusinessData();
      var normalizedRuntime=window.atsrsNormalizedReadRuntime;
      if(normalizedRuntime
        &&typeof normalizedRuntime.shouldBlockForPrimary==='function'
        &&await normalizedRuntime.shouldBlockForPrimary(wantedScope)
        &&typeof normalizedRuntime.prepare==='function'){
        await normalizedRuntime.prepare({
          scope:wantedScope,
          accountType:context.account_type
        });
        if(scope()!==wantedScope)return ensureWorkspaceData();
      }
      loadedScope=wantedScope;
      window.dispatchEvent(new CustomEvent('atsrs:data-hydrated',{
        detail:{scope:wantedScope,accountType:context.account_type}
      }));
      scheduleFileRender(0);
      return true;
    })();
    promise.scope=wantedScope;
    loadingPromise=promise;
    try{return await promise;}
    finally{if(loadingPromise===promise)loadingPromise=null;}
  }

  function safeName(name){
    return String(name||'file')
      .replace(/[^\w.\-() ]+/g,'_')
      .replace(/\s+/g,' ')
      .slice(0,140)||'file';
  }
  function uniqueId(){
    if(window.crypto&&typeof window.crypto.randomUUID==='function')return window.crypto.randomUUID();
    return Date.now().toString(36)+'-'+Math.random().toString(36).slice(2);
  }
  function dataUrlToBlob(data){
    var text=String(data||'');
    var parts=text.split(',');
    if(parts.length<2)return null;
    var mime=((parts[0].match(/data:([^;]+)/)||[])[1])||'application/octet-stream';
    var binary=atob(parts.slice(1).join(','));
    var bytes=new Uint8Array(binary.length);
    for(var i=0;i<binary.length;i++)bytes[i]=binary.charCodeAt(i);
    return new Blob([bytes],{type:mime});
  }
  async function uploadFile(category,file,details){
    if(!isCloudSession())throw new Error('No active Supabase session.');
    var valueUser=user();
    var mode=accountType();
    var id=uniqueId();
    var fileName=safeName((details&&details.name)||file.name||'file');
    var storagePath=valueUser.id+'/'+mode+'/'+category+'/'+id+'-'+fileName;
    var upload=await client().storage.from(FILE_BUCKET).upload(storagePath,file,{
      cacheControl:'3600',
      contentType:(details&&details.type)||file.type||'application/octet-stream',
      upsert:false
    });
    if(upload.error)throw upload.error;
    var insert=await client().from(FILE_TABLE).insert({
      user_id:valueUser.id,
      account_type:mode,
      category:category,
      file_name:fileName,
      mime_type:(details&&details.type)||file.type||'application/octet-stream',
      size_bytes:(details&&details.size)||file.size||0,
      storage_path:storagePath,
      metadata:(details&&details.metadata)||{}
    }).select().single();
    if(insert.error){
      await client().storage.from(FILE_BUCKET).remove([storagePath]);
      throw insert.error;
    }
    invalidateFileMetadata(scope());
    return insert.data;
  }
  function cvIsMain(row,rows){
    if(row&&row.metadata&&row.metadata.is_main===true)return true;
    var explicit=(rows||[]).some(function(item){return item&&item.metadata&&item.metadata.is_main===true;});
    if(explicit)return false;
    var legacy=(rows||[]).filter(function(item){
      var metadata=item&&item.metadata||{};
      return metadata.is_main!==false&&metadata.source!=='ai-generated';
    }).sort(function(left,right){return String(left.created_at||'').localeCompare(String(right.created_at||''));});
    return row===legacy[0];
  }
  function mainCvRow(rows){return (rows||[]).find(function(row){return cvIsMain(row,rows);})||null;}
  async function updateFileMetadata(row,metadata){
    var valueUser=user();
    var result=await client().from(FILE_TABLE).update({metadata:Object.assign({},row.metadata||{},metadata||{})})
      .eq('user_id',valueUser.id).eq('account_type',accountType()).eq('id',row.id).select('id,metadata').maybeSingle();
    if(result.error)throw result.error;
    if(!result.data)throw new Error('The CV update was not confirmed by the server.');
    invalidateFileMetadata(scope());
    return result.data;
  }
  async function uploadAiCvSource(file){
    if(!isCloudSession())throw new Error('No active Supabase session.');
    var valueUser=user(),id=uniqueId(),name=safeName(file&&file.name||'cv'),path=valueUser.id+'/personal/ai-cv-source/'+id+'-'+name;
    var upload=await client().storage.from(FILE_BUCKET).upload(path,file,{cacheControl:'60',contentType:file.type||'application/octet-stream',upsert:false});
    if(upload.error)throw upload.error;
    return path;
  }
  async function deleteAiCvSource(path){
    var prefix=user().id+'/personal/ai-cv-source/';
    if(String(path||'').indexOf(prefix)!==0)throw new Error('Temporary CV path is not owned by this account.');
    var removed=await client().storage.from(FILE_BUCKET).remove([path]);
    if(removed.error)throw removed.error;
  }
  async function saveGeneratedCv(file,options){
    var created=await uploadFile('cv',file,{metadata:{is_main:false,source:'ai-generated',source_cv_name:String(options&&options.sourceName||'').slice(0,240),ownership_verification:String(options&&options.ownershipVerification||'').slice(0,40),generated_at:new Date().toISOString()}});
    invalidateFileMetadata(scope());
    return created;
  }
  async function setMainCv(id){
    var rows=await listFiles({categories:['cv'],bypassCache:true}),target=rows.find(function(row){return row.id===id&&row.category==='cv';}),oldMain=mainCvRow(rows);
    if(!target)throw new Error('The selected CV was not found.');
    if(oldMain&&oldMain.id===target.id)return target;
    await updateFileMetadata(target,{is_main:true});
    if(oldMain){
      try{await updateFileMetadata(oldMain,{is_main:false});}
      catch(error){try{await updateFileMetadata(target,{is_main:false});}catch(_rollbackError){}throw error;}
    }
    invalidateFileMetadata(scope());
    await renderCloudFiles({categories:['cv'],force:true});
    return target;
  }
  function activeFilePage(){
    var visible=document.querySelector('main > section:not(.hidden)');
    if(visible&&visible.id)return String(visible.id).replace(/Page$/,'');
    try{return String(localStorage.getItem('atsrs_current_page')||'');}
    catch(error){return '';}
  }
  function fileCategoriesForPage(page){
    page=String(page||activeFilePage());
    if(page==='certificates')return ['document'];
    if(page==='refs')return ['appraisal','reference','recommendation','coverLetter','cv'];
    return [];
  }
  function copyFileRows(rows){
    return (rows||[]).map(function(row){
      return Object.assign({},row,{
        metadata:row&&row.metadata&&typeof row.metadata==='object'
          ?Object.assign({},row.metadata)
          :row&&row.metadata
      });
    });
  }
  function normalizedFileCategories(categories){
    return (categories||[]).map(String).filter(Boolean).sort();
  }
  function fileListCacheKey(valueScope,categories,offset,limit){
    return [valueScope,normalizedFileCategories(categories).join(','),offset,limit].join(':');
  }
  function filePageKey(valueScope,categories){
    return valueScope+':'+normalizedFileCategories(categories).join(',');
  }
  function invalidateFileMetadata(valueScope){
    var prefix=String(valueScope||scope())+':';
    Array.from(fileListCache.keys()).forEach(function(key){
      if(key.indexOf(prefix)===0)fileListCache.delete(key);
    });
    Array.from(filePageState.keys()).forEach(function(key){
      if(key.indexOf(prefix)===0)filePageState.delete(key);
    });
  }
  async function listFiles(options){
    if(!isCloudSession())return [];
    options=options&&typeof options==='object'?options:{};
    var categories=Array.isArray(options.categories)
      ?options.categories.map(String).filter(Boolean)
      :[];
    var offset=Math.max(0,Number(options.offset)||0);
    var limit=Math.max(0,Number(options.limit)||0);
    var wantedScope=scope();
    var cacheKey=fileListCacheKey(wantedScope,categories,offset,limit);
    var cached=fileListCache.get(cacheKey);
    if(!options.bypassCache&&cached&&cached.expiresAt>Date.now()){
      return copyFileRows(cached.rows);
    }
    var operation=async function(){
      var valueUser=user();
      var query=client().from(FILE_TABLE)
        .select('id,category,file_name,mime_type,size_bytes,storage_path,metadata,created_at,updated_at')
        .eq('user_id',valueUser.id)
        .eq('account_type',accountType())
        .order('created_at',{ascending:false});
      if(categories.length)query=query.in('category',categories);
      if(limit)query=query.range(offset,offset+limit-1);
      var result=await query;
      if(result.error)throw result.error;
      var rows=result.data||[];
      fileListCache.set(cacheKey,{
        expiresAt:Date.now()+FILE_LIST_CACHE_TTL,
        rows:copyFileRows(rows)
      });
      return copyFileRows(rows);
    };
    if(typeof window.atsrsSingleFlight==='function'){
      return window.atsrsSingleFlight(
        'files:list:'+wantedScope+':'+categories.join(',')+':'+offset+':'+limit,
        operation
      );
    }
    return operation();
  }
  async function fileMetadataPage(categories,loadMore){
    var wantedScope=scope();
    var key=filePageKey(wantedScope,categories);
    var state=filePageState.get(key);
    if(!loadMore&&state&&state.expiresAt>Date.now())return state;
    if(!loadMore||!state)state={rows:[],nextOffset:0,hasMore:true,expiresAt:0};
    if(loadMore&&!state.hasMore)return state;
    var page=await listFiles({
      categories:categories,
      offset:state.nextOffset,
      limit:FILE_PAGE_SIZE+1
    });
    var visible=page.slice(0,FILE_PAGE_SIZE);
    var known=new Set(state.rows.map(function(row){return row.id;}));
    visible.forEach(function(row){
      if(!known.has(row.id)){state.rows.push(row);known.add(row.id);}
    });
    state.nextOffset+=visible.length;
    state.hasMore=page.length>FILE_PAGE_SIZE;
    state.expiresAt=Date.now()+FILE_LIST_CACHE_TTL;
    filePageState.set(key,state);
    return state;
  }
  function cachedFileById(id){
    var prefix=scope()+':';
    var now=Date.now();
    for(var entry of fileListCache.entries()){
      if(entry[0].indexOf(prefix)!==0||entry[1].expiresAt<=now)continue;
      var row=entry[1].rows.find(function(candidate){return candidate.id===id;});
      if(row)return copyFileRows([row])[0];
    }
    return null;
  }
  async function findFile(id){
    var cached=cachedFileById(id);
    if(cached)return cached;
    var valueUser=user();
    var result=await client().from(FILE_TABLE)
      .select('id,category,file_name,mime_type,size_bytes,storage_path,metadata')
      .eq('user_id',valueUser.id)
      .eq('account_type',accountType())
      .eq('id',id)
      .maybeSingle();
    if(result.error)throw result.error;
    return result.data||null;
  }
  async function deleteCloudFile(id){
    var row=await findFile(id);
    if(!row)return;
    var removed=await client().storage.from(FILE_BUCKET).remove([row.storage_path]);
    if(removed.error)throw removed.error;
    var result=await client().from(FILE_TABLE).delete().eq('id',row.id);
    if(result.error)throw result.error;
    invalidateFileMetadata(scope());
  }
  async function signedFileUrl(row,download){
    var result=await client().storage.from(FILE_BUCKET).createSignedUrl(
      row.storage_path,
      300,
      download?{download:row.file_name}:undefined
    );
    if(result.error)throw result.error;
    return result.data.signedUrl;
  }
  async function downloadCloudFile(id){
    var row=await findFile(id);
    if(!row)throw new Error('Document file was not found on the ATSRS server.');
    var result=await client().storage.from(FILE_BUCKET).download(row.storage_path);
    if(result.error)throw result.error;
    return new File([result.data],row.file_name||'ATSRS-document',{
      type:row.mime_type||result.data.type||'application/octet-stream',
      lastModified:Date.now()
    });
  }
  async function openCloudFile(id,download){
    try{
      var row=await findFile(id);
      if(!row){alert('File was not found on the ATSRS server.');return;}
      var url=await signedFileUrl(row,download);
      if(download){
        var a=document.createElement('a');
        a.href=url;a.download=row.file_name||'ATSRS-file';
        document.body.appendChild(a);a.click();a.remove();
      }else{
        if(typeof window.atsrsOpenFilePreview!=='function'){
          throw new Error('ATSRS preview is not available');
        }
        window.atsrsOpenFilePreview({
          url:url,
          title:row.file_name||'ATSRS document',
          mimeType:row.mime_type||'',
          onDownload:function(){return openCloudFile(id,true);}
        });
      }
    }catch(error){console.error(error);alert('File could not be opened from the ATSRS server.');}
  }
  function escapeHtml(value){
    return String(value||'').replace(/[&<>"']/g,function(char){
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char];
    });
  }
  function referenceRow(kind,row){
    var categoryLabels={appraisal:'Annual Appraisal',reference:'Reference Letter',recommendation:'Recommendation',coverLetter:'Cover Letter'};
    var date=String(row.created_at||'').slice(0,10);
    var size=Math.round((row.size_bytes||0)/1024)+' KB';
    return '<div class="atsrs-v134-row" data-ref-name="'+escapeHtml(row.file_name||'File')+'" data-ref-category="'+escapeHtml(categoryLabels[kind]||'Document')+'" data-ref-date="'+escapeHtml(date)+'" data-ref-size="'+escapeHtml(size)+'"><div class="atsrs-ref-document"><i class="ph ph-file-text" aria-hidden="true"></i><div><b title="'+escapeHtml(row.file_name)+'">'+escapeHtml(row.file_name||'File')+'</b><span>Uploaded '+escapeHtml(date||'—')+'</span></div></div>'+
      '<span class="atsrs-ref-category">'+escapeHtml(categoryLabels[kind]||'Document')+'</span><span class="atsrs-ref-date">'+escapeHtml(date||'—')+'</span><span class="atsrs-ref-size">'+escapeHtml(size)+'</span>'+
      '<div class="atsrs-v134-actions"><button class="secondary" onclick="atsrsCloudPreview(\''+row.id+'\')">Preview</button>'+
      '<button class="secondary" onclick="atsrsCloudDownload(\''+row.id+'\')">Download</button>'+
      '<button class="action" onclick="atsrsCloudDelete(\''+row.id+'\')">Delete</button></div></div>';
  }
  function renderReferenceKind(kind,rows,filterToken){
    var values=rows.filter(function(row){return row.category===kind;});
    if(window.atsrsReferenceFilterState
      &&!window.atsrsReferenceFilterState.settle(kind,values.length,filterToken)){
      return false;
    }
    var status=document.getElementById('v134_'+kind+'_status');
    var list=document.getElementById('v134_'+kind+'_list');
    var managedStatus=document.getElementById(kind+'StatusBadge');
    var managedCount=document.getElementById(kind+'Count');
    var managedList=document.getElementById(kind+'RecordList');
    if(status){
      status.textContent=values.length?(values.length+' File'+(values.length>1?'s':'')):'No File';
      status.className='atsrs-v134-status '+(values.length?'ready':'empty');
    }
    if(list){
      var nextListHtml=values.length?values.map(function(row){return referenceRow(kind,row);}).join(''):'<div class="atsrs-v134-empty">No files uploaded yet.</div>';
      if(list.innerHTML!==nextListHtml)list.innerHTML=nextListHtml;
    }
    if(managedStatus){
      managedStatus.textContent=values.length?(values.length+' File'+(values.length>1?'s':'')):'No File';
      managedStatus.className='badge '+(values.length?'badge-ready':'badge-missing');
    }
    if(managedCount)managedCount.textContent=values.length?(values.length+' File'+(values.length>1?'s':'')+' • Newest first'):'No File';
    if(managedList){
      managedList.innerHTML=values.length?values.map(function(row){
        var signed=(row.metadata&&row.metadata.signed_date)||String(row.created_at||'').slice(0,10);
        return '<div class="career-record-row"><div class="career-record-name"><b title="'+escapeHtml(row.file_name)+'">'+escapeHtml(row.file_name||'File')+'</b><span>'+Math.round((row.size_bytes||0)/1024)+' KB</span></div>'+
          '<div class="career-record-date"><input type="date" value="'+escapeHtml(signed)+'" onchange="atsrsCloudUpdateDate(\''+row.id+'\',this.value)"></div>'+
          '<div class="career-record-actions"><button class="secondary" onclick="atsrsCloudPreview(\''+row.id+'\')">Preview</button><button class="secondary" onclick="atsrsCloudDownload(\''+row.id+'\')">Download</button><button class="action" onclick="atsrsCloudDelete(\''+row.id+'\')">Delete</button></div></div>';
      }).join(''):'<div class="preview-box">No records yet.</div>';
    }
    if(kind==='coverLetter'){
      var coverBadge=document.getElementById('coverLetterStatusBadge');
      var coverInfo=document.getElementById('coverLetterFileInfo');
      if(coverBadge){
        coverBadge.textContent=values.length?(values.length+' file'+(values.length>1?'s':'')):'No File';
        coverBadge.className='badge '+(values.length?'badge-ready':'badge-missing');
      }
      if(coverInfo){
        coverInfo.innerHTML=values.length?values.slice(0,5).map(function(row){
          return '<div>'+escapeHtml(row.file_name||'File')+' • '+Math.round((row.size_bytes||0)/1024)+' KB</div>';
        }).join(''):'No cover letter uploaded yet.';
      }
    }
    return true;
  }
  function renderCv(rows){
    var cvs=rows.filter(function(row){return row.category==='cv';});
    var cv=mainCvRow(cvs);
    var additional=cvs.filter(function(row){return !cv||row.id!==cv.id;});
    var info=document.getElementById('cvFileInfo');
    var badge=document.getElementById('cvStatusBadge');
    var dash=document.getElementById('cvStatusDash');
    var upload=document.getElementById('uploadCVBtn');
    var input=document.getElementById('cvUploadInput');
    if(info){
      info.className='preview-box atsrs-v156-cv-area';
      info.innerHTML='<div class="atsrs-v156-main-box">'+
        (cv?'<div class="atsrs-v156-main-row"><div class="atsrs-v156-main-name"><div class="atsrs-v156-main-identity"><b title="'+escapeHtml(cv.file_name)+'">'+escapeHtml(cv.file_name)+'</b></div><span>'+Math.round((cv.size_bytes||0)/1024)+' KB</span></div><div class="atsrs-v156-actions"><button class="secondary" onclick="replaceCV()">Replace</button><button class="secondary" onclick="atsrsCloudPreview(\''+cv.id+'\')">Preview</button><button class="secondary" onclick="atsrsCloudDownload(\''+cv.id+'\')">Download</button><button class="secondary" onclick="atsrsCloudDelete(\''+cv.id+'\')">Delete</button></div></div>':'<div class="atsrs-v156-empty">No Main CV uploaded yet.</div>')+
        '</div><div class="atsrs-v156-slots-box"><span class="atsrs-v156-box-title">Additional Profile CVs</span><div class="atsrs-v156-additional-list">'+
        (additional.length?additional.map(function(row){return'<div class="atsrs-v156-main-row atsrs-v156-additional-row"><div class="atsrs-v156-main-name"><b title="'+escapeHtml(row.file_name)+'">'+escapeHtml(row.file_name)+'</b><span>'+Math.round((row.size_bytes||0)/1024)+' KB</span></div><div class="atsrs-v156-actions"><button class="secondary" onclick="atsrsCloudPreview(\''+row.id+'\')">Preview</button><button class="secondary" onclick="atsrsCloudDownload(\''+row.id+'\')">Download</button><button class="secondary" onclick="atsrsCloudSetMainCv(\''+row.id+'\')">Set as Main</button><button class="secondary" onclick="atsrsCloudDelete(\''+row.id+'\')">Delete</button></div></div>'}).join(''):'<div class="atsrs-v156-empty">No additional CVs.</div>')+
        '</div></div>';
    }
    if(badge){badge.textContent=cv?'Main CV':'No CV Uploaded';badge.className='badge '+(cv?'badge-ready':'badge-missing');}
    if(dash){dash.textContent=cv?'Available ✓':'Missing ⚠';dash.className='stat '+(cv?'good':'missing');}
    if(upload){upload.textContent='Upload Main CV';upload.hidden=!!cv;if(upload.parentElement)upload.parentElement.hidden=!!cv;}
    if(input)input.removeAttribute('multiple');
    document.dispatchEvent(new CustomEvent('atsrs:cv-state',{detail:{available:!!cv,name:cv&&cv.file_name||'',size:cv&&cv.size_bytes||0,source:'cloud'}}));
  }
  function renderFilePaginationControl(pageName,categories,hasMore){
    var page=document.getElementById(pageName+'Page');
    if(!page)return;
    var control=page.querySelector('.atsrs-cloud-file-pagination');
    if(pageName==='certificates'){if(control)control.remove();return;}
    if(!hasMore){if(control)control.remove();return;}
    if(!control){
      control=document.createElement('div');
      control.className='atsrs-cloud-file-pagination';
      control.style.cssText='display:flex;justify-content:center;padding:20px 0 8px;';
      control.innerHTML='<button type="button" class="secondary">Load more files</button>';
      page.appendChild(control);
    }
    var button=control.querySelector('button');
    button.onclick=function(){
      button.disabled=true;
      button.textContent='Loading…';
      renderCloudFiles({page:pageName,categories:categories,force:true,loadMore:true})
        .catch(function(error){console.error(error);})
        .finally(function(){button.disabled=false;button.textContent='Load more files';});
    };
  }
  async function renderCloudFiles(options){
    if(!isCloudSession()||loadedScope!==scope())return;
    options=options&&typeof options==='object'?options:{};
    var pageName=String(options.page||activeFilePage());
    var categories=Array.isArray(options.categories)
      ?options.categories.map(String).filter(Boolean)
      :fileCategoriesForPage(pageName);
    if(!categories.length&&!options.force)return;
    var filterToken=window.atsrsReferenceFilterState
      ?window.atsrsReferenceFilterState.begin({scope:scope(),source:'cloud'})
      :null;
    try{
      var pageState=await fileMetadataPage(categories,!!options.loadMore);
      var rows=pageState.rows;
      if(!categories.length||categories.indexOf('document')>=0){
        var uploadDates={};
        rows.filter(function(row){return row.category==='document';}).forEach(function(row){uploadDates[row.id]=row.created_at||'';});
        window.atsrsDocumentUploadDates=uploadDates;
        document.dispatchEvent(new CustomEvent('atsrs-document-files-updated'));
      }
      ['appraisal','reference','recommendation','coverLetter'].forEach(function(kind){
        if(!categories.length||categories.indexOf(kind)>=0)renderReferenceKind(kind,rows,filterToken);
      });
      if(!categories.length||categories.indexOf('cv')>=0)renderCv(rows);
      renderFilePaginationControl(pageName,categories,pageState.hasMore);
    }catch(error){console.error('ATSRS cloud file render failed',error);}
  }
  function scheduleFileRender(delay){
    clearTimeout(fileRenderTimer);
    fileRenderTimer=setTimeout(renderCloudFiles,typeof delay==='number'?delay:650);
  }
  async function replaceCv(file){
    var rows=await listFiles({categories:['cv'],bypassCache:true}),oldMain=mainCvRow(rows);
    var created=await uploadFile('cv',file,{metadata:{is_main:true,source:'profile-upload'}});
    if(oldMain){try{await deleteCloudFile(oldMain.id);}catch(error){await deleteCloudFile(created.id);throw error;}}
    return created;
  }
  async function handleCloudUpload(kind,files){
    files=Array.prototype.slice.call(files||[]);
    if(!files.length)return;
    if(kind==='cv'){
      await replaceCv(files[0]);
      if(files.length>1)alert('Free plan allows one Main CV.');
    }else{
      for(var i=0;i<files.length;i++)await uploadFile(kind,files[i]);
    }
    await renderCloudFiles({categories:[kind],force:true});
    if(kind==='cv')document.dispatchEvent(new CustomEvent('atsrs:cv-uploaded',{detail:{source:'cloud',name:files[0]&&files[0].name||'',size:files[0]&&files[0].size||0}}));
  }
  function installFileHandlers(){
    if(window.__atsrsCloudFileHandlersInstalled)return;
    window.__atsrsCloudFileHandlersInstalled=true;
    document.addEventListener('change',function(event){
      var input=event.target;
      if(!input||!input.id||!isCloudSession())return;
      var match=input.id.match(/^v134_(appraisal|reference|recommendation|coverLetter)_input$/);
      var managedMatch=input.id.match(/^(appraisal|reference|recommendation)UploadInput$/);
      var kind=match?match[1]:(managedMatch?managedMatch[1]:(input.id==='coverLetterUploadInput'?'coverLetter':(input.id==='cvUploadInput'?'cv':'')));
      if(!kind)return;
      event.preventDefault();
      event.stopImmediatePropagation();
      var files=input.files;
      handleCloudUpload(kind,files)
        .then(function(){input.value='';})
        .catch(function(error){console.error(error);alert('File could not be saved to the ATSRS server.');});
    },true);
    window.atsrsCloudPreview=function(id){return openCloudFile(id,false);};
    window.atsrsCloudDownload=function(id){return openCloudFile(id,true);};
    window.atsrsCloudSetMainCv=async function(id){
      try{await setMainCv(id);}
      catch(error){console.error(error);alert('The selected CV could not be set as Main CV.');}
    };
    window.atsrsCloudDelete=async function(id){
      try{await deleteCloudFile(id);await renderCloudFiles({page:activeFilePage()});}
      catch(error){console.error(error);alert('File could not be deleted from the ATSRS server.');}
    };
    window.atsrsCloudUpdateDate=async function(id,value){
      try{
        var row=await findFile(id);
        if(!row)return;
        var metadata=row.metadata||{};
        metadata.signed_date=value||'';
        var valueUser=user();
        var result=await client().from(FILE_TABLE)
          .update({metadata:metadata,updated_at:new Date().toISOString()})
          .eq('user_id',valueUser.id)
          .eq('account_type',accountType())
          .eq('id',id)
          .select('id,updated_at')
          .maybeSingle();
        if(result.error)throw result.error;
        if(!result.data)throw new Error('The file date update was not confirmed by the server.');
        invalidateFileMetadata(scope());
      }catch(error){console.error(error);alert('The date could not be saved to the ATSRS server.');}
    };
    window.atsrsV134Preview=function(kind,id){return window.atsrsCloudPreview(id);};
    window.atsrsV134Download=function(kind,id){return window.atsrsCloudDownload(id);};
    window.atsrsV134Delete=function(kind,id){return window.atsrsCloudDelete(id);};
    window.atsrsV152Preview=function(kind,id){return window.atsrsCloudPreview(id);};
    window.atsrsV152Download=function(kind,id){return window.atsrsCloudDownload(id);};
    window.atsrsV152Delete=function(kind,id){return window.atsrsCloudDelete(id);};
    window.atsrsV151Preview=window.atsrsV152Preview;
    window.atsrsV151Download=window.atsrsV152Download;
    window.atsrsV151Delete=window.atsrsV152Delete;
    window.handleCVUpload=function(event){
      var files=event&&event.target&&event.target.files;
      return handleCloudUpload('cv',files).catch(function(error){console.error(error);alert('CV could not be saved to the ATSRS server.');});
    };
    window.previewCV=async function(){
      var rows=await listFiles({categories:['cv']}),cv=mainCvRow(rows);
      if(!cv){alert('No Main CV uploaded yet.');return;}
      return openCloudFile(cv.id,false);
    };
    window.downloadCV=async function(){
      var rows=await listFiles({categories:['cv']}),cv=mainCvRow(rows);
      if(!cv){alert('No Main CV uploaded yet.');return;}
      return openCloudFile(cv.id,true);
    };
    window.deleteCV=async function(){
      var rows=await listFiles({categories:['cv']}),cv=mainCvRow(rows);
      if(!cv){alert('No Main CV uploaded yet.');return;}
      await deleteCloudFile(cv.id);await renderCloudFiles({categories:['cv'],force:true});
    };
    window.handleManagedUpload=function(kind,event){
      var files=event&&event.target&&event.target.files;
      return handleCloudUpload(kind,files).catch(function(error){console.error(error);alert('File could not be saved to the ATSRS server.');});
    };
    window.previewManagedFile=function(kind,id){return id?openCloudFile(id,false):Promise.resolve();};
    window.downloadManagedFile=function(kind,id){return id?openCloudFile(id,true):Promise.resolve();};
    window.deleteManagedFile=function(kind,id){return id?window.atsrsCloudDelete(id):Promise.resolve();};
    window.updateManagedDate=function(kind,id,value){return window.atsrsCloudUpdateDate(id,value);};
    window.handleCoverLetterUpload=function(event){
      var files=event&&event.target&&event.target.files;
      return handleCloudUpload('coverLetter',files).catch(function(error){console.error(error);alert('Cover Letter could not be saved to the ATSRS server.');});
    };
    window.previewCoverLetter=async function(){
      var rows=await listFiles({categories:['coverLetter']}),file=rows.find(function(row){return row.category==='coverLetter';});
      if(!file){alert('No cover letter uploaded yet.');return;}
      return openCloudFile(file.id,false);
    };
    window.downloadCoverLetter=async function(){
      var rows=await listFiles({categories:['coverLetter']}),file=rows.find(function(row){return row.category==='coverLetter';});
      if(!file){alert('No cover letter uploaded yet.');return;}
      return openCloudFile(file.id,true);
    };
    window.deleteCoverLetter=async function(){
      var rows=await listFiles({categories:['coverLetter']}),files=rows.filter(function(row){return row.category==='coverLetter';});
      for(var i=0;i<files.length;i++)await deleteCloudFile(files[i].id);
      await renderCloudFiles({categories:['coverLetter'],force:true});
    };
    ['renderAll','showPage','applyLanguage'].forEach(function(name){
      var original=window[name];
      if(typeof original!=='function'||original.__atsrsCloudWrapped)return;
      var wrapped=function(){
        var result=original.apply(this,arguments);
        scheduleFileRender(700);
        return result;
      };
      wrapped.__atsrsCloudWrapped=true;
      window[name]=wrapped;
    });
  }

  function legacyCategory(key,row){
    var text=(String(key||'')+' '+String(row&&row.kind||'')).toLowerCase();
    if(text.indexOf('cover')>=0)return 'coverLetter';
    if(text.indexOf('appraisal')>=0)return 'appraisal';
    if(text.indexOf('recommend')>=0)return 'recommendation';
    if(text.indexOf('reference')>=0)return 'reference';
    if(text.indexOf('cv')>=0)return 'cv';
    return 'document';
  }
  async function indexedDbRows(){
    if(!window.indexedDB)return [];
    var names=['ATSRS_FILE_DB_MAIN','ATSRS_FILE_DB_V151'];
    if(typeof indexedDB.databases==='function'){
      try{
        var existing=await indexedDB.databases();
        var allowed=new Set(existing.map(function(item){return item.name;}));
        names=names.filter(function(name){return allowed.has(name);});
      }catch(e){}
    }
    var rows=[];
    for(var i=0;i<names.length;i++){
      var dbRows=await new Promise(function(resolve){
        var request=indexedDB.open(names[i]);
        request.onerror=function(){resolve([]);};
        request.onsuccess=function(){
          var db=request.result;
          var stores=Array.from(db.objectStoreNames);
          if(!stores.length){db.close();resolve([]);return;}
          var output=[],pending=stores.length;
          stores.forEach(function(storeName){
            try{
              var tx=db.transaction(storeName,'readonly');
              var get=tx.objectStore(storeName).getAll();
              get.onsuccess=function(){
                output=output.concat((get.result||[]).map(function(row){
                  return Object.assign({},row,{__atsrsDbName:names[i],__atsrsStoreName:storeName});
                }));
              };
              tx.oncomplete=function(){if(--pending===0){db.close();resolve(output);}};
              tx.onerror=function(){if(--pending===0){db.close();resolve(output);}};
            }catch(e){if(--pending===0){db.close();resolve(output);}}
          });
        };
      });
      rows=rows.concat(dbRows);
    }
    return rows;
  }
  function legacyRowBelongsToCurrentUser(row){
    var valueUser=user();
    if(!valueUser||!row)return false;
    var candidates=[String(valueUser.id||''),String(valueUser.email||'')];
    try{candidates.push(String(nativeGet.call(localStorage,'atsrs_saved_login_email')||''));}catch(e){}
    candidates=candidates.filter(Boolean);
    var rowUser=String(row.userId||'');
    var scopeKind=String(row.scopeKind||'');
    if(rowUser==='local_test_user'||scopeKind.indexOf('local_test_user::')===0)return true;
    return candidates.some(function(candidate){
      return rowUser===candidate||scopeKind.indexOf(candidate+'::')===0;
    });
  }
  function isLegacyFileKeyForCurrentScope(key){
    var valueUser=user();
    if(!valueUser)return false;
    key=String(key||'');
    var mode=accountType();
    var userPrefix='atsrs_'+valueUser.id+'_';
    var scopePrefix=userPrefix+mode+'_';
    if(key.indexOf(scopePrefix)===0)return isFileLikeKey(key);
    if(key.indexOf(userPrefix+'personal_')===0||key.indexOf(userPrefix+'company_')===0)return false;
    if(key.indexOf(userPrefix)===0&&isFileLikeKey(key))return true;
    if(key.indexOf('atsrs_file_meta_'+valueUser.id+'_')===0)return true;
    if(key.indexOf('atsrs_local_test_user_'+mode+'_')===0&&isFileLikeKey(key))return true;
    if(key.indexOf('atsrs_local_test_user_personal_')===0||key.indexOf('atsrs_local_test_user_company_')===0)return false;
    if(key.indexOf('atsrs_local_test_user_')===0&&isFileLikeKey(key))return true;
    return /^(cvFiles|appraisalFiles|referenceFiles|recommendationFiles|coverLetterFiles|atsrs_v105_(appraisal|reference)_files)$/i.test(key);
  }
  function localFileRows(){
    var output=[];
    allLocalKeys().forEach(function(key){
      if(!isLegacyFileKeyForCurrentScope(key))return;
      try{
        var value=JSON.parse(nativeGet.call(localStorage,key)||'null');
        if(Array.isArray(value)){
          value.forEach(function(row){if(row&&(row.data||row.blob))output.push({key:key,row:row});});
        }
      }catch(e){}
    });
    return output;
  }
  function metadataOnlyLocalFileKeys(){
    var output=[];
    allLocalKeys().forEach(function(key){
      if(!isLegacyFileKeyForCurrentScope(key))return;
      try{
        var value=JSON.parse(nativeGet.call(localStorage,key)||'null');
        if(Array.isArray(value)&&value.every(function(row){return !row||(!row.data&&!row.blob);})){
          output.push(key);
        }
      }catch(e){}
    });
    return output;
  }
  async function migrateOneLegacyFile(category,row,key,known){
    var blob=row.blob instanceof Blob?row.blob:dataUrlToBlob(row.data);
    if(!blob||!blob.size)return false;
    var name=safeName(row.name||'Legacy file');
    var signature=category+'::'+name+'::'+(row.size||blob.size);
    if(known.has(signature))return true;
    if(category==='cv'&&Array.from(known).some(function(value){return value.indexOf('cv::')===0;}))return true;
    await uploadFile(category,blob,{name:name,type:row.type||blob.type,size:row.size||blob.size,metadata:{migrated_from:key||'indexeddb'}});
    known.add(signature);
    return true;
  }
  async function clearMigratedIndexedDbRows(rows){
    var groups=new Map();
    (rows||[]).forEach(function(row){
      if(!row||!row.id||!row.__atsrsDbName||!row.__atsrsStoreName)return;
      var key=row.__atsrsDbName+'::'+row.__atsrsStoreName;
      if(!groups.has(key))groups.set(key,[]);
      groups.get(key).push(row.id);
    });
    for(var entry of groups.entries()){
      var split=entry[0].split('::');
      var dbName=split.shift();
      var storeName=split.join('::');
      var ids=entry[1];
      await new Promise(function(resolve){
        var request=indexedDB.open(dbName);
        request.onerror=function(){resolve();};
        request.onsuccess=function(){
          var db=request.result;
          if(!db.objectStoreNames.contains(storeName)){db.close();resolve();return;}
          try{
            var tx=db.transaction(storeName,'readwrite');
            var store=tx.objectStore(storeName);
            ids.forEach(function(id){store.delete(id);});
            tx.oncomplete=function(){db.close();resolve();};
            tx.onerror=function(){db.close();resolve();};
          }catch(e){db.close();resolve();}
        };
      });
    }
  }
  function clearMigratedLocalFileRows(keys){
    (keys||[]).forEach(function(key){
      if(isLegacyFileKeyForCurrentScope(key))nativeRemove.call(localStorage,key);
    });
  }
  async function migrateLegacyFiles(serverRows){
    var existing=await listFiles();
    var known=new Set(existing.map(function(row){return row.category+'::'+row.file_name+'::'+row.size_bytes;}));
    var idb=(await indexedDbRows()).filter(legacyRowBelongsToCurrentUser);
    var migratedIdb=[];
    for(var i=0;i<idb.length;i++){
      var record=idb[i]||{};
      if(await migrateOneLegacyFile(legacyCategory(record.scopeKind,record),record,'indexeddb',known)){
        migratedIdb.push(record);
      }
    }
    var local=localFileRows();
    var safeLocalKeys=new Set(metadataOnlyLocalFileKeys());
    var unsafeLocalKeys=new Set();
    for(var j=0;j<local.length;j++){
      if(await migrateOneLegacyFile(legacyCategory(local[j].key,local[j].row),local[j].row,local[j].key,known)){
        safeLocalKeys.add(local[j].key);
      }else{
        unsafeLocalKeys.add(local[j].key);
      }
    }
    var result=await client().from(DATA_TABLE).upsert({
      user_id:user().id,
      account_type:accountType(),
      data_key:FILE_MIGRATION_KEY,
      payload:{completed_at:new Date().toISOString()},
      updated_at:new Date().toISOString()
    },{onConflict:'user_id,account_type,data_key'});
    if(result.error)throw result.error;
    await clearMigratedIndexedDbRows(migratedIdb);
    unsafeLocalKeys.forEach(function(key){safeLocalKeys.delete(key);});
    clearMigratedLocalFileRows(Array.from(safeLocalKeys));
  }

  window.atsrsStableIds={
    isValid:validUuid,
    create:randomUuid
  };

  window.atsrsCloudData={
    ensureLoaded:ensureWorkspaceData,
    isLoaded:function(){return loadedScope===scope();},
    isManagedKey:isManagedBusinessKey,
    read:readBusinessValue,
    write:writeBusinessValue,
    remove:removeBusinessValue,
    isSynced:function(){return pendingWrites===0&&!lastWriteError&&!failedOperations.length;},
    pendingState:function(){
      return {
        pendingWrites:pendingWrites,
        failedOperations:failedOperations.map(function(entry){
          return {
            dataKey:entry&&entry.key||'',
            scope:entry&&entry.scope||'',
            version:entry&&entry.version||0,
            retryable:!!(entry&&entry.retryable),
            code:writeErrorCode(entry&&entry.lastError),
            message:String(entry&&entry.lastError&&entry.lastError.message||'')
          };
        }),
        circuits:Array.from(commandCircuits.entries()).map(function(entry){
          return {
            scope:entry[0],
            code:String(entry[1]&&entry[1].code||''),
            openUntil:Number(entry[1]&&entry[1].openUntil||0)
          };
        }),
        loadedScope:loadedScope
      };
    },
    clearSession:function(){
      memoryStore.clear();
      writeVersions.clear();
      persistedWriteVersions.clear();
      rowVersions.clear();
      serverValues.clear();
      commandRevisions.clear();
      commandCircuits.clear();
      normalizedWriteScopeCache.clear();
      stableCompatibilityCache.clear();
      fileListCache.clear();
      filePageState.clear();
      loadedScope='';
      loadingPromise=null;
      lastWriteError=null;
      failedOperations=[];
      flushPromise=null;
      retryFailedPromise=null;
    },
    openApp:async function(openLocalApp){
      try{
        await ensureWorkspaceData();
        return openLocalApp();
      }catch(error){
        showCloudError(error);
        return false;
      }
    },
    flush:flushWrites,
    refresh:async function(){
      loadedScope='';
      fileListCache.clear();
      filePageState.clear();
      await ensureWorkspaceData();
      if(typeof window.renderAll==='function')window.renderAll();
      await renderCloudFiles();
    },
    renderFiles:renderCloudFiles,
    uploadAiCvSource:uploadAiCvSource,
    deleteAiCvSource:deleteAiCvSource,
    saveGeneratedCv:saveGeneratedCv,
    setMainCv:setMainCv,
    uploadDocument:function(file,metadata){
      return uploadFile('document',file,{metadata:metadata||{}});
    },
    updateDocumentMetadata:async function(id,metadata){
      var row=await findFile(id);
      if(!row)throw new Error('Document file was not found on the ATSRS server.');
      var valueUser=user();
      var result=await client().from(FILE_TABLE)
        .update({metadata:Object.assign({},row.metadata||{},metadata||{})})
        .eq('user_id',valueUser.id)
        .eq('account_type',accountType())
        .eq('id',id)
        .select('id,metadata,updated_at')
        .maybeSingle();
      if(result.error)throw result.error;
      if(!result.data)throw new Error('The document update was not confirmed by the server.');
      invalidateFileMetadata(scope());
      return result.data;
    },
    openDocument:function(id,download){
      return openCloudFile(id,!!download);
    },
    downloadDocumentFile:function(id){
      return downloadCloudFile(id);
    },
    deleteDocument:function(id){
      return deleteCloudFile(id);
    }
  };

  function finalInstall(){
    installFileHandlers();
    if(isCloudSession()){
      ensureWorkspaceData()
        .catch(showCloudError);
    }
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',finalInstall);
  else finalInstall();
  window.addEventListener('load',function(){installFileHandlers();scheduleFileRender(700);});
})();
