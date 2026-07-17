/* ATSRS cloud data layer.
   Supabase is the source of truth. localStorage is only a compatibility cache
   for the existing synchronous UI code and is repopulated after every login. */
(function(){
  'use strict';

  var DATA_TABLE='atsrs_workspace_data';
  var FILE_TABLE='atsrs_files';
  var FILE_BUCKET='atsrs-user-files';
  var DATA_MIGRATION_KEY='__cloud_data_migration_v1';
  var FILE_MIGRATION_KEY='__cloud_file_migration_v1';
  var nativeSet=Storage.prototype.setItem;
  var nativeRemove=Storage.prototype.removeItem;
  var nativeGet=Storage.prototype.getItem;
  var suppressSync=false;
  var loadedScope='';
  var loadingPromise=null;
  var writeQueue=Promise.resolve();
  var fileRenderTimer=0;

  function client(){return window.supabaseClient||null;}
  function user(){
    var value=window.currentUser;
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
  function isCloudSession(){
    var value=user();
    return !!(value&&value.id&&value.id!=='local_test_user'&&client());
  }
  function isFileLikeKey(key){
    return /file|upload|documentblob|attachment/i.test(String(key||''));
  }
  function shouldSyncKey(key){
    var prefix=localPrefix();
    return !!(prefix&&String(key||'').indexOf(prefix)===0&&!isFileLikeKey(key));
  }
  function cloudErrorMessage(error){
    var detail=error&&error.message?'\n\n'+error.message:'';
    return 'ATSRS server data could not be loaded. Please check the connection and try again.'+detail;
  }
  function showCloudError(error){
    console.error('ATSRS cloud data error',error);
    var auth=document.getElementById('auth');
    var app=document.getElementById('app');
    var msg=document.getElementById('loginMsg');
    if(app)app.classList.add('hidden');
    if(auth)auth.classList.remove('hidden');
    if(msg){msg.style.whiteSpace='pre-line';msg.textContent=cloudErrorMessage(error);}
    document.body.classList.remove('atsrs-booting');
  }
  function enqueue(operation){
    writeQueue=writeQueue
      .then(operation)
      .catch(function(error){
        console.error('ATSRS cloud save failed',error);
        showSaveWarning();
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
  function rowForStorage(key,value){
    var valueUser=user();
    return {
      user_id:valueUser.id,
      account_type:accountType(),
      data_key:String(key),
      payload:{value:String(value)}
    };
  }
  async function upsertStorageValue(key,value){
    if(!isCloudSession()||!shouldSyncKey(key))return;
    var result=await client().from(DATA_TABLE).upsert(
      rowForStorage(key,value),
      {onConflict:'user_id,account_type,data_key'}
    );
    if(result.error)throw result.error;
  }
  async function deleteStorageValue(key){
    if(!isCloudSession()||!shouldSyncKey(key))return;
    var valueUser=user();
    var result=await client().from(DATA_TABLE)
      .delete()
      .eq('user_id',valueUser.id)
      .eq('account_type',accountType())
      .eq('data_key',String(key));
    if(result.error)throw result.error;
  }

  Storage.prototype.setItem=function(key,value){
    nativeSet.call(this,key,value);
    if(this===localStorage&&!suppressSync&&shouldSyncKey(key)){
      enqueue(function(){return upsertStorageValue(key,value);});
    }
  };
  Storage.prototype.removeItem=function(key){
    nativeRemove.call(this,key);
    if(this===localStorage&&!suppressSync&&shouldSyncKey(key)){
      enqueue(function(){return deleteStorageValue(key);});
    }
  };

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
  function mappedLegacyKey(key){
    var valueUser=user();
    if(!valueUser)return '';
    var currentPrefix='atsrs_'+valueUser.id+'_';
    if(key.indexOf(currentPrefix)===0)return key;
    var legacyPrefix='atsrs_local_test_user_';
    if(key.indexOf(legacyPrefix)!==0)return '';
    var suffix=key.slice(legacyPrefix.length);
    if(suffix.indexOf('personal_')===0||suffix.indexOf('company_')===0){
      return currentPrefix+suffix;
    }
    return currentPrefix+accountType()+'_'+suffix;
  }
  async function loadWorkspaceRows(){
    var valueUser=user();
    var result=await client().from(DATA_TABLE)
      .select('data_key,payload')
      .eq('user_id',valueUser.id)
      .eq('account_type',accountType());
    if(result.error)throw result.error;
    return result.data||[];
  }
  async function migrateLegacyStorage(serverRows){
    var serverKeys=new Set((serverRows||[]).map(function(row){return row.data_key;}));
    if(serverKeys.has(DATA_MIGRATION_KEY))return;
    var rows=[];
    allLocalKeys().forEach(function(oldKey){
      var key=mappedLegacyKey(oldKey);
      if(!key||serverKeys.has(key)||isFileLikeKey(key))return;
      var value=nativeGet.call(localStorage,oldKey);
      if(value===null)return;
      rows.push(rowForStorage(key,value));
      if(key!==oldKey){
        suppressSync=true;
        try{nativeSet.call(localStorage,key,value);}finally{suppressSync=false;}
      }
    });
    rows.push({
      user_id:user().id,
      account_type:accountType(),
      data_key:DATA_MIGRATION_KEY,
      payload:{completed_at:new Date().toISOString()}
    });
    var result=await client().from(DATA_TABLE).upsert(
      rows,
      {onConflict:'user_id,account_type,data_key'}
    );
    if(result.error)throw result.error;
  }
  function restoreServerRows(rows){
    suppressSync=true;
    try{
      (rows||[]).forEach(function(row){
        if(!row||!row.data_key||String(row.data_key).indexOf('__cloud_')===0)return;
        var payload=row.payload||{};
        if(typeof payload.value==='string'){
          nativeSet.call(localStorage,row.data_key,payload.value);
        }
      });
    }finally{suppressSync=false;}
  }
  async function ensureWorkspaceData(){
    if(!isCloudSession())throw new Error('No active Supabase session.');
    var wantedScope=scope();
    if(loadedScope===wantedScope)return true;
    if(loadingPromise&&loadingPromise.scope===wantedScope)return loadingPromise;
    var promise=(async function(){
      var rows=await loadWorkspaceRows();
      restoreServerRows(rows);
      await migrateLegacyStorage(rows);
      await migrateLegacyFiles(rows);
      loadedScope=wantedScope;
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
    var id=uniqueId();
    var fileName=safeName((details&&details.name)||file.name||'file');
    var storagePath=valueUser.id+'/'+accountType()+'/'+category+'/'+id+'-'+fileName;
    var upload=await client().storage.from(FILE_BUCKET).upload(storagePath,file,{
      cacheControl:'3600',
      contentType:(details&&details.type)||file.type||'application/octet-stream',
      upsert:false
    });
    if(upload.error)throw upload.error;
    var insert=await client().from(FILE_TABLE).insert({
      user_id:valueUser.id,
      account_type:accountType(),
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
    var valueUser=user();
    var result=await client().from(FILE_TABLE)
      .select('id,category,file_name,mime_type,size_bytes,storage_path,metadata,created_at,updated_at')
      .eq('user_id',valueUser.id)
      .eq('account_type',accountType())
      .order('created_at',{ascending:false});
    if(result.error)throw result.error;
    return result.data||[];
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
        var opened=window.open(url,'_blank','noopener');
        if(!opened)window.location.href=url;
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
      managedStatus.className='badge '+(values.length?'badge-ready':'badge-blocked');
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
        coverBadge.className='badge '+(values.length?'badge-ready':'badge-blocked');
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
    if(badge){badge.textContent=cv?'Main CV':'No CV Uploaded';badge.className='badge '+(cv?'badge-ready':'badge-blocked');}
    if(dash){dash.textContent=cv?'Available ✓':'Missing ⚠';dash.className='stat '+(cv?'good':'missing');}
    if(upload)upload.textContent=cv?'Replace Main CV':'Upload Main CV';
    if(input)input.removeAttribute('multiple');
  }
  async function renderCloudFiles(){
    if(!isCloudSession()||loadedScope!==scope())return;
    try{
      var rows=await listFiles();
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
        var result=await client().from(FILE_TABLE).update({metadata:metadata,updated_at:new Date().toISOString()}).eq('id',id);
        if(result.error)throw result.error;
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
              get.onsuccess=function(){output=output.concat(get.result||[]);};
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
  function localFileRows(){
    var output=[];
    allLocalKeys().forEach(function(key){
      if(!isFileLikeKey(key))return;
      try{
        var value=JSON.parse(nativeGet.call(localStorage,key)||'null');
        if(Array.isArray(value)){
          value.forEach(function(row){if(row&&(row.data||row.blob))output.push({key:key,row:row});});
        }
      }catch(e){}
    });
    return output;
  }
  async function migrateOneLegacyFile(category,row,key,known){
    var blob=row.blob instanceof Blob?row.blob:dataUrlToBlob(row.data);
    if(!blob||!blob.size)return;
    var name=safeName(row.name||'Legacy file');
    var signature=category+'::'+name+'::'+(row.size||blob.size);
    if(known.has(signature))return;
    if(category==='cv'&&Array.from(known).some(function(value){return value.indexOf('cv::')===0;}))return;
    await uploadFile(category,blob,{name:name,type:row.type||blob.type,size:row.size||blob.size,metadata:{migrated_from:key||'indexeddb'}});
    known.add(signature);
  }
  async function migrateLegacyFiles(serverRows){
    if((serverRows||[]).some(function(row){return row.data_key===FILE_MIGRATION_KEY;}))return;
    var existing=await listFiles();
    var known=new Set(existing.map(function(row){return row.category+'::'+row.file_name+'::'+row.size_bytes;}));
    var idb=await indexedDbRows();
    for(var i=0;i<idb.length;i++){
      var record=idb[i]||{};
      await migrateOneLegacyFile(legacyCategory(record.scopeKind,record),record,'indexeddb',known);
    }
    var local=localFileRows();
    for(var j=0;j<local.length;j++){
      await migrateOneLegacyFile(legacyCategory(local[j].key,local[j].row),local[j].row,local[j].key,known);
    }
    var result=await client().from(DATA_TABLE).upsert({
      user_id:user().id,
      account_type:accountType(),
      data_key:FILE_MIGRATION_KEY,
      payload:{completed_at:new Date().toISOString()}
    },{onConflict:'user_id,account_type,data_key'});
    if(result.error)throw result.error;
  }

  window.atsrsCloudData={
    ensureLoaded:ensureWorkspaceData,
    isLoaded:function(){return loadedScope===scope();},
    openApp:async function(openLocalApp){
      try{
        await ensureWorkspaceData();
        return openLocalApp();
      }catch(error){
        showCloudError(error);
        return false;
      }
    },
    flush:function(){return writeQueue;},
    refresh:async function(){
      loadedScope='';
      await ensureWorkspaceData();
      if(typeof window.renderAll==='function')window.renderAll();
      await renderCloudFiles();
    },
    renderFiles:renderCloudFiles
  };

  function finalInstall(){
    installFileHandlers();
    if(isCloudSession()){
      ensureWorkspaceData()
        .then(function(){if(typeof window.renderAll==='function')window.renderAll();})
        .catch(showCloudError);
    }
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',finalInstall);
  else finalInstall();
  window.addEventListener('load',function(){installFileHandlers();scheduleFileRender(700);});
})();
