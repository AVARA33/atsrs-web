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
  var loadedScope='';
  var loadingPromise=null;
  var writeQueue=Promise.resolve();
  var pendingWrites=0;
  var lastWriteError=null;
  var failedOperations=[];
  var fileRenderTimer=0;

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
  function enqueue(operation,onFailure){
    pendingWrites++;
    writeQueue=writeQueue
      .then(operation)
      .then(function(){
        pendingWrites=Math.max(0,pendingWrites-1);
        return true;
      })
      .catch(function(error){
        pendingWrites=Math.max(0,pendingWrites-1);
        lastWriteError=error;
        if(typeof onFailure==='function')onFailure();
        failedOperations.push({run:operation,onFailure:onFailure});
        console.error('ATSRS cloud save failed',error);
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
    warning.textContent='Data was not saved to the ATSRS server. Check the connection and try again.';
    warning.style.display='block';
    clearTimeout(window.__atsrsCloudWarningTimer);
    window.__atsrsCloudWarningTimer=setTimeout(function(){warning.style.display='none';},7000);
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
  async function upsertStorageValue(key,value,context){
    if(!context)return;
    var result=await client().from(DATA_TABLE).upsert(
      rowForStorage(key,value,context),
      {onConflict:'user_id,account_type,data_key'}
    );
    if(result.error)throw result.error;
  }
  async function deleteStorageValue(key,context){
    if(!context)return;
    var result=await client().from(DATA_TABLE).upsert({
      user_id:context.user_id,
      account_type:context.account_type,
      data_key:String(key),
      payload:{deleted:true},
      updated_at:new Date().toISOString()
    },{onConflict:'user_id,account_type,data_key'});
    if(result.error)throw result.error;
  }
  function readBusinessValue(key){
    if(!isCloudSession()||!isManagedBusinessKey(key))return null;
    return memoryStore.has(String(key))?memoryStore.get(String(key)):null;
  }
  function writeBusinessValue(key,value){
    if(!shouldSyncKey(key))return false;
    key=String(key);
    value=String(value);
    var context=writeContext();
    var hadPrevious=memoryStore.has(key);
    var previousValue=hadPrevious?memoryStore.get(key):null;
    var version=(writeVersions.get(key)||0)+1;
    writeVersions.set(key,version);
    memoryStore.set(key,value);
    enqueue(
      async function(){
        await upsertStorageValue(key,value,context);
        if(writeVersions.get(key)===version)memoryStore.set(key,value);
      },
      function(){
        if(writeVersions.get(key)!==version)return;
        if(hadPrevious)memoryStore.set(key,previousValue);
        else memoryStore.delete(key);
        if(typeof window.renderAll==='function')setTimeout(window.renderAll,0);
      }
    );
    return true;
  }
  function removeBusinessValue(key){
    if(!shouldSyncKey(key))return false;
    key=String(key);
    var context=writeContext();
    var hadPrevious=memoryStore.has(key);
    var previousValue=hadPrevious?memoryStore.get(key):null;
    var version=(writeVersions.get(key)||0)+1;
    writeVersions.set(key,version);
    memoryStore.delete(key);
    enqueue(
      async function(){
        await deleteStorageValue(key,context);
        if(writeVersions.get(key)===version)memoryStore.delete(key);
      },
      function(){
        if(writeVersions.get(key)!==version)return;
        if(hadPrevious)memoryStore.set(key,previousValue);
        if(typeof window.renderAll==='function')setTimeout(window.renderAll,0);
      }
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
  async function flushWrites(){
    await writeQueue;
    if(!failedOperations.length)return true;
    var retry=failedOperations.splice(0);
    for(var i=0;i<retry.length;i++){
      var entry=retry[i];
      var operation=typeof entry==='function'?entry:entry.run;
      try{
        await operation();
      }catch(error){
        lastWriteError=error;
        if(entry&&typeof entry.onFailure==='function')entry.onFailure();
        failedOperations.push(entry);
      }
    }
    if(!failedOperations.length){
      lastWriteError=null;
      return true;
    }
    showSaveWarning();
    return false;
  }

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
  function canonicalBusinessKey(key){
    var valueUser=user();
    if(!valueUser)return '';
    key=String(key||'');
    var currentPrefix='atsrs_'+valueUser.id+'_';
    var currentMode=accountType();
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
  async function loadWorkspaceRows(){
    var valueUser=user();
    var result=await client().from(DATA_TABLE)
      .select('data_key,payload,updated_at')
      .eq('user_id',valueUser.id)
      .eq('account_type',accountType());
    if(result.error)throw result.error;
    return result.data||[];
  }
  async function migrateLegacyStorage(serverRows){
    var valueUser=user();
    var canonicalRows=new Map();
    var deletedKeys=new Set();
    var obsoleteServerKeys=[];
    (serverRows||[]).forEach(function(row){
      if(!row||!row.data_key||String(row.data_key).indexOf('__cloud_')===0)return;
      var canonical=canonicalBusinessKey(row.data_key);
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
      var key=canonicalBusinessKey(oldKey);
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
      return rowForStorage(entry[0],entry[1]);
    });
    deletedKeys.forEach(function(key){
      rows.push({
        user_id:valueUser.id,
        account_type:accountType(),
        data_key:key,
        payload:{deleted:true},
        updated_at:new Date().toISOString()
      });
    });
    rows.push({
      user_id:valueUser.id,
      account_type:accountType(),
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
        .eq('user_id',valueUser.id)
        .eq('account_type',accountType())
        .in('data_key',Array.from(new Set(obsoleteServerKeys)));
      if(cleanup.error)throw cleanup.error;
    }
    return loadWorkspaceRows();
  }
  function restoreServerRows(rows){
    var prefix=managedPrefix();
    Array.from(memoryStore.keys()).forEach(function(key){
      if(prefix&&key.indexOf(prefix)===0)memoryStore.delete(key);
    });
    (rows||[]).forEach(function(row){
      if(!row||!row.data_key||String(row.data_key).indexOf('__cloud_')===0)return;
      if(!isManagedBusinessKey(row.data_key))return;
      var payload=row.payload||{};
      if(typeof payload.value==='string')memoryStore.set(String(row.data_key),payload.value);
    });
  }
  function clearNativeBusinessData(){
    allLocalKeys().forEach(function(key){
      if(canonicalBusinessKey(key))nativeRemove.call(localStorage,key);
    });
  }
  async function ensureWorkspaceData(){
    if(!isCloudSession())throw new Error('No active Supabase session.');
    var wantedScope=scope();
    if(loadedScope===wantedScope)return true;
    if(loadingPromise&&loadingPromise.scope===wantedScope)return loadingPromise;
    var promise=(async function(){
      var rows=await loadWorkspaceRows();
      var dataMigrationDone=rows.some(function(row){return row&&row.data_key===DATA_MIGRATION_KEY;});
      var fileMigrationDone=rows.some(function(row){return row&&row.data_key===FILE_MIGRATION_KEY;});
      if(!dataMigrationDone)rows=await migrateLegacyStorage(rows);
      restoreServerRows(rows);
      if(!fileMigrationDone)await migrateLegacyFiles(rows);
      clearNativeBusinessData();
      loadedScope=wantedScope;
      window.dispatchEvent(new CustomEvent('atsrs:data-hydrated',{
        detail:{scope:wantedScope,accountType:accountType()}
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
    return insert.data;
  }
  async function listFiles(){
    if(!isCloudSession())return [];
    var wantedScope=scope();
    var operation=async function(){
      var valueUser=user();
      var result=await client().from(FILE_TABLE)
        .select('id,category,file_name,mime_type,size_bytes,storage_path,metadata,created_at,updated_at')
        .eq('user_id',valueUser.id)
        .eq('account_type',accountType())
        .order('created_at',{ascending:false});
      if(result.error)throw result.error;
      return result.data||[];
    };
    if(typeof window.atsrsSingleFlight==='function'){
      return window.atsrsSingleFlight('files:list:'+wantedScope,operation);
    }
    return operation();
  }
  async function findFile(id){
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
    return '<div class="atsrs-v134-row"><div><b title="'+escapeHtml(row.file_name)+'">📄 '+escapeHtml(row.file_name||'File')+'</b><span>'+Math.round((row.size_bytes||0)/1024)+' KB</span></div>'+
      '<div class="atsrs-v134-actions"><button class="secondary" onclick="atsrsCloudPreview(\''+row.id+'\')">Preview</button>'+
      '<button class="secondary" onclick="atsrsCloudDownload(\''+row.id+'\')">Download</button>'+
      '<button class="action" onclick="atsrsCloudDelete(\''+row.id+'\')">Delete</button></div></div>';
  }
  function renderReferenceKind(kind,rows){
    var values=rows.filter(function(row){return row.category===kind;});
    var status=document.getElementById('v134_'+kind+'_status');
    var list=document.getElementById('v134_'+kind+'_list');
    var filter=document.getElementById('v134_'+kind+'_filter');
    var managedStatus=document.getElementById(kind+'StatusBadge');
    var managedCount=document.getElementById(kind+'Count');
    var managedList=document.getElementById(kind+'RecordList');
    if(status){
      status.textContent=values.length?(values.length+' File'+(values.length>1?'s':'')):'No File';
      status.className='atsrs-v134-status '+(values.length?'ready':'empty');
    }
    if(filter)filter.classList.toggle('active',values.length>0);
    if(list)list.innerHTML=values.length?values.map(function(row){return referenceRow(kind,row);}).join(''):'<div class="atsrs-v134-empty">No files uploaded yet.</div>';
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
  }
  function renderCv(rows){
    var cv=rows.filter(function(row){return row.category==='cv';})[0]||null;
    var info=document.getElementById('cvFileInfo');
    var badge=document.getElementById('cvStatusBadge');
    var dash=document.getElementById('cvStatusDash');
    var upload=document.getElementById('uploadCVBtn');
    var input=document.getElementById('cvUploadInput');
    if(info){
      info.className='preview-box atsrs-v156-cv-area';
      info.innerHTML='<div class="atsrs-v156-main-box"><span class="atsrs-v156-box-title">Main CV</span>'+
        (cv?'<div class="atsrs-v156-main-row"><div class="atsrs-v156-main-name"><b title="'+escapeHtml(cv.file_name)+'">📄 '+escapeHtml(cv.file_name)+' <span class="atsrs-v153-main-badge">MAIN</span></b><span>'+Math.round((cv.size_bytes||0)/1024)+' KB</span></div><div class="atsrs-v156-actions"><button class="secondary" onclick="atsrsCloudPreview(\''+cv.id+'\')">Preview</button><button class="secondary" onclick="atsrsCloudDownload(\''+cv.id+'\')">Download</button><button class="action" onclick="atsrsCloudDelete(\''+cv.id+'\')">Delete</button></div></div>':'<div class="atsrs-v156-empty">No Main CV uploaded yet.</div>')+
        '</div><div class="atsrs-v156-slots-box"><span class="atsrs-v156-box-title">Additional CV Slots</span><div class="atsrs-v156-slot-list"><div class="atsrs-v156-slot-chip"><b>🔒 Additional CV Slot 1</b><span>PRO</span></div><div class="atsrs-v156-slot-chip"><b>🔒 Additional CV Slot 2</b><span>Premium</span></div><div class="atsrs-v156-slot-chip"><b>🔒 Additional CV Slot 3</b><span>Premium</span></div></div></div>';
    }
    if(badge){badge.textContent=cv?'Main CV':'No CV Uploaded';badge.className='badge '+(cv?'badge-ready':'badge-missing');}
    if(dash){dash.textContent=cv?'Available ✓':'Missing ⚠';dash.className='stat '+(cv?'good':'missing');}
    if(upload)upload.textContent=cv?'Replace Main CV':'Upload Main CV';
    if(input)input.removeAttribute('multiple');
  }
  async function renderCloudFiles(){
    if(!isCloudSession()||loadedScope!==scope())return;
    try{
      var rows=await listFiles();
      var uploadDates={};
      rows.filter(function(row){return row.category==='document';}).forEach(function(row){uploadDates[row.id]=row.created_at||'';});
      window.atsrsDocumentUploadDates=uploadDates;
      document.dispatchEvent(new CustomEvent('atsrs-document-files-updated'));
      ['appraisal','reference','recommendation','coverLetter'].forEach(function(kind){renderReferenceKind(kind,rows);});
      renderCv(rows);
    }catch(error){console.error('ATSRS cloud file render failed',error);}
  }
  function scheduleFileRender(delay){
    clearTimeout(fileRenderTimer);
    fileRenderTimer=setTimeout(renderCloudFiles,typeof delay==='number'?delay:650);
  }
  async function replaceCv(file){
    var rows=await listFiles();
    var old=rows.filter(function(row){return row.category==='cv';});
    for(var i=0;i<old.length;i++)await deleteCloudFile(old[i].id);
    await uploadFile('cv',file);
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
    await renderCloudFiles();
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
    window.atsrsCloudDelete=async function(id){
      try{await deleteCloudFile(id);await renderCloudFiles();}
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
      var rows=await listFiles(),cv=rows.find(function(row){return row.category==='cv';});
      if(!cv){alert('No Main CV uploaded yet.');return;}
      return openCloudFile(cv.id,false);
    };
    window.downloadCV=async function(){
      var rows=await listFiles(),cv=rows.find(function(row){return row.category==='cv';});
      if(!cv){alert('No Main CV uploaded yet.');return;}
      return openCloudFile(cv.id,true);
    };
    window.deleteCV=async function(){
      var rows=await listFiles(),cv=rows.find(function(row){return row.category==='cv';});
      if(!cv){alert('No Main CV uploaded yet.');return;}
      await deleteCloudFile(cv.id);await renderCloudFiles();
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
      var rows=await listFiles(),file=rows.find(function(row){return row.category==='coverLetter';});
      if(!file){alert('No cover letter uploaded yet.');return;}
      return openCloudFile(file.id,false);
    };
    window.downloadCoverLetter=async function(){
      var rows=await listFiles(),file=rows.find(function(row){return row.category==='coverLetter';});
      if(!file){alert('No cover letter uploaded yet.');return;}
      return openCloudFile(file.id,true);
    };
    window.deleteCoverLetter=async function(){
      var rows=await listFiles(),files=rows.filter(function(row){return row.category==='coverLetter';});
      for(var i=0;i<files.length;i++)await deleteCloudFile(files[i].id);
      await renderCloudFiles();
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

  window.atsrsCloudData={
    ensureLoaded:ensureWorkspaceData,
    isLoaded:function(){return loadedScope===scope();},
    isManagedKey:isManagedBusinessKey,
    read:readBusinessValue,
    write:writeBusinessValue,
    remove:removeBusinessValue,
    isSynced:function(){return pendingWrites===0&&!lastWriteError&&!failedOperations.length;},
    clearSession:function(){
      memoryStore.clear();
      writeVersions.clear();
      loadedScope='';
      loadingPromise=null;
      lastWriteError=null;
      failedOperations=[];
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
      await ensureWorkspaceData();
      if(typeof window.renderAll==='function')window.renderAll();
      await renderCloudFiles();
    },
    renderFiles:renderCloudFiles,
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
      return result.data;
    },
    openDocument:function(id,download){
      return openCloudFile(id,!!download);
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
