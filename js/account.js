/* ATSRS V178 extracted JavaScript batch: account.js. Loaded in original V178 execution order. No placeholder code. */
/* ===== extracted from inline script id=ATSRS_V148_BUILD_LABEL_SCRIPT ===== */
(function(){
  function qa(s,r){return Array.from((r||document).querySelectorAll(s));}
  function setBuild(){qa('.build-badge').forEach(function(b){var d=b.querySelectorAll('div');if(d[0])d[0].textContent='ATSRS V299';if(d[1])d[1].textContent='Last Update: 23 Jul 2026';});}
  setBuild();document.addEventListener('DOMContentLoaded',setBuild);setTimeout(setBuild,300);setTimeout(setBuild,900);
})();

/* ===== extracted from inline script id=ATSRS_V150_OLD_LOCK_REMOVED_COMPACT_ROWS_JS ===== */
(function(){
  var BUILD='ATSRS V299';
  function qa(s,r){return Array.from((r||document).querySelectorAll(s));}
  function setBuild(){
    qa('.build-badge').forEach(function(b){
      var d=b.querySelectorAll('div');
      if(d[0])d[0].textContent=BUILD;
      if(d[1])d[1].textContent='Last Update: 23 Jul 2026';
    });
  }
  function compactRows(){
    setBuild();
    qa('#refsPage .career-record-list, #refsPage .atsrs-v134-list, #refsPage #cvFileInfo.atsrs-v146-list, #refsPage #coverLetterFileInfo.atsrs-v146-list').forEach(function(list){
      list.style.setProperty('max-height', window.innerWidth<=760?'216px':'196px','important');
      list.style.setProperty('min-height','0','important');
      list.style.setProperty('height','auto','important');
      list.style.setProperty('overflow-y','auto','important');
      list.style.setProperty('overflow-x','hidden','important');
      list.style.setProperty('padding','0 4px 0 0','important');
      list.style.setProperty('margin','6px 0 4px','important');
    });
    qa('#refsPage .career-record-row, #refsPage .atsrs-v134-row, #refsPage .atsrs-v146-row').forEach(function(row){
      var h=window.innerWidth<=760?'42px':'38px';
      row.style.setProperty('display','grid','important');
      row.style.setProperty('grid-template-columns','minmax(0,1fr) auto','important');
      row.style.setProperty('align-items','center','important');
      row.style.setProperty('min-height',h,'important');
      row.style.setProperty('height',h,'important');
      row.style.setProperty('max-height',h,'important');
      row.style.setProperty('padding','0 8px','important');
      row.style.setProperty('margin','0','important');
      row.style.setProperty('gap','10px','important');
      row.style.setProperty('border-radius','0','important');
      row.style.setProperty('background','transparent','important');
      row.style.setProperty('box-shadow','none','important');
      row.style.setProperty('overflow','hidden','important');
    });
  }
  window.atsrsV150CompactRows=compactRows;
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',compactRows);else compactRows();
  window.addEventListener('load',function(){compactRows();setTimeout(compactRows,100);setTimeout(compactRows,500);setTimeout(compactRows,1200);});
  ['renderManagedFiles','renderAll','showPage','applyLanguage'].forEach(function(name){
    var old=window[name];
    if(typeof old==='function'&&!old.__atsrsV150Compact){
      var wrapped=function(){var r=old.apply(this,arguments);setTimeout(compactRows,0);setTimeout(compactRows,120);return r;};
      wrapped.__atsrsV150Compact=true;window[name]=wrapped;
    }
  });
  atsrsStableInterval(compactRows,250);
})();

/* ===== extracted from inline script id=ATSRS_V151_INDEXEDDB_REFERENCES_UPLOAD_FIX_JS ===== */
(function(){
  'use strict';
  var BUILD='ATSRS V299';
  var UPDATE='Last Update: 23 Jul 2026';
  var KINDS=['appraisal','reference','recommendation','coverLetter'];
  var DB_NAME='ATSRS_FILE_DB_V151';
  var STORE='files';
  var dbPromise=null;
  function byId(id){return document.getElementById(id);} 
  function qa(s,r){return Array.from((r||document).querySelectorAll(s));}
  function esc(s){return String(s||'').replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
  function uid(){try{return (window.currentUser&&window.currentUser.id)||localStorage.getItem('atsrs_saved_login_email')||'local_test_user';}catch(e){return 'local_test_user';}}
  function scoped(kind){return uid()+'::'+kind;}
  function openDB(){
    if(dbPromise)return dbPromise;
    dbPromise=new Promise(function(resolve,reject){
      if(!window.indexedDB){reject(new Error('IndexedDB not available'));return;}
      var req=indexedDB.open(DB_NAME,1);
      req.onupgradeneeded=function(){var db=req.result;if(!db.objectStoreNames.contains(STORE)){var st=db.createObjectStore(STORE,{keyPath:'id'});st.createIndex('scopeKind','scopeKind',{unique:false});}};
      req.onsuccess=function(){resolve(req.result);}; req.onerror=function(){reject(req.error||new Error('IndexedDB open failed'));};
    });
    return dbPromise;
  }
  async function tx(mode,fn){var db=await openDB();return new Promise(function(resolve,reject){var t=db.transaction(STORE,mode);var st=t.objectStore(STORE);var val; t.oncomplete=function(){resolve(val);}; t.onerror=function(){reject(t.error);}; val=fn(st);});}
  async function getAll(kind){
    var key=scoped(kind); var db=await openDB();
    return new Promise(function(resolve,reject){
      var t=db.transaction(STORE,'readonly'); var idx=t.objectStore(STORE).index('scopeKind'); var req=idx.getAll(key);
      req.onsuccess=function(){resolve((req.result||[]).sort(function(a,b){return String(b.updated||'').localeCompare(String(a.updated||''));}));};
      req.onerror=function(){reject(req.error);};
    });
  }
  async function putFiles(kind,fileList){
    var files=Array.from(fileList||[]); if(!files.length)return;
    await tx('readwrite',function(st){files.forEach(function(file){st.put({id:Date.now()+'_'+Math.random().toString(36).slice(2),scopeKind:scoped(kind),userId:uid(),kind:kind,name:file.name,type:file.type||'application/octet-stream',size:file.size||0,updated:new Date().toISOString(),blob:file});});});
  }
  async function del(kind,id){await tx('readwrite',function(st){st.delete(id);});}
  async function getOne(kind,id){var arr=await getAll(kind);return arr.find(function(x){return x.id===id;});}
  function setBuild(){qa('.build-badge').forEach(function(b){var d=b.querySelectorAll('div'); if(d[0])d[0].textContent=BUILD; if(d[1])d[1].textContent=UPDATE; if(d[2])d[2].textContent='TEST BUILD';});}
  function label(n){return n>0?(n+' File'+(n>1?'s':'')):'No File';}
  function row(kind,f){return '<div class="atsrs-v134-row"><div><b title="'+esc(f.name)+'">📄 '+esc(f.name||'File')+'</b><span>'+Math.round((f.size||0)/1024)+' KB</span></div><div class="atsrs-v134-actions"><button class="secondary" onclick="atsrsV151Preview(\''+kind+'\',\''+esc(f.id)+'\')">Preview</button><button class="secondary" onclick="atsrsV151Download(\''+kind+'\',\''+esc(f.id)+'\')">Download</button><button class="action" onclick="atsrsV151Delete(\''+kind+'\',\''+esc(f.id)+'\')">Delete</button></div></div>';}
  async function renderKind(kind){
    var arr=[]; try{arr=await getAll(kind);}catch(e){console.warn(e);} 
    var status=byId('v134_'+kind+'_status'), list=byId('v134_'+kind+'_list'), filter=byId('v134_'+kind+'_filter');
    if(status){status.textContent=label(arr.length);status.className='atsrs-v134-status '+(arr.length?'ready':'empty');}
    if(filter){filter.classList.toggle('active',arr.length>0);} 
    if(list){list.innerHTML=arr.length?arr.map(function(f){return row(kind,f);}).join(''):'<div class="atsrs-v134-empty">No files uploaded yet.</div>';}
  }
  async function renderAllV151(){setBuild(); for(var i=0;i<KINDS.length;i++) await renderKind(KINDS[i]);}
  function bindInputs(){KINDS.forEach(function(kind){var inp=byId('v134_'+kind+'_input'); if(inp && !inp.__v151Bound){inp.__v151Bound=true; inp.onchange=async function(e){try{await putFiles(kind,e.target.files); e.target.value=''; await renderAllV151();}catch(err){alert('Upload could not be saved. Browser storage may be blocked or full.'); console.error(err);}};}});}
  window.atsrsV151Preview=async function(kind,id){var f=await getOne(kind,id); if(!f||!f.blob){alert('File preview is not available.');return;} var url=URL.createObjectURL(f.blob); var w=window.open('','_blank'); if(w){w.document.write('<title>'+esc(f.name||'File')+'</title><iframe src="'+url+'" style="border:0;width:100%;height:100vh"></iframe>');w.document.close();} setTimeout(function(){URL.revokeObjectURL(url);},60000);};
  window.atsrsV151Download=async function(kind,id){var f=await getOne(kind,id); if(!f||!f.blob){alert('File download is not available.');return;} var url=URL.createObjectURL(f.blob); var a=document.createElement('a'); a.href=url; a.download=f.name||('ATSRS-'+kind); document.body.appendChild(a); a.click(); a.remove(); setTimeout(function(){URL.revokeObjectURL(url);},30000);};
  window.atsrsV151Delete=async function(kind,id){await del(kind,id); await renderAllV151();};
  function run(){setBuild(); bindInputs(); renderAllV151();}
  ['renderAll','showPage','applyLanguage'].forEach(function(name){var old=window[name]; if(typeof old==='function'&&!old.__atsrsV151){var wrapped=function(){var r=old.apply(this,arguments);setTimeout(run,80);setTimeout(run,350);return r;}; wrapped.__atsrsV151=true; window[name]=wrapped;}});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run); else run();
  window.addEventListener('load',function(){run();setTimeout(run,700);}); setTimeout(run,1100);
})();

/* ===== extracted from inline script id=ATSRS_V152_REFERENCES_PERSISTENCE_HARD_FIX_JS ===== */
(function(){
  'use strict';
  var BUILD='ATSRS V299';
  var UPDATE='Last Update: 23 Jul 2026';
  var KINDS=['appraisal','reference','recommendation','coverLetter'];
  var DB_NAME='ATSRS_FILE_DB_MAIN';
  var STORE='referenceFiles';
  var dbp=null;
  function byId(id){return document.getElementById(id);} 
  function qa(s,r){return Array.prototype.slice.call((r||document).querySelectorAll(s));}
  function esc(s){return String(s||'').replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
  function uid(){try{return (window.currentUser&&window.currentUser.id)||localStorage.getItem('atsrs_saved_login_email')||localStorage.getItem('atsrs_local_uid')||'local_test_user';}catch(e){return 'local_test_user';}}
  function scope(kind){return uid()+'::'+kind;}
  function setBuild(){qa('.build-badge').forEach(function(b){var d=b.querySelectorAll('div');if(d[0])d[0].textContent=BUILD;if(d[1])d[1].textContent=UPDATE;if(d[2])d[2].textContent='TEST BUILD';});}
  function openDB(){
    if(dbp)return dbp;
    dbp=new Promise(function(resolve,reject){
      if(!window.indexedDB){reject(new Error('IndexedDB is blocked'));return;}
      var req=indexedDB.open(DB_NAME,1);
      req.onupgradeneeded=function(){var db=req.result;if(!db.objectStoreNames.contains(STORE)){var st=db.createObjectStore(STORE,{keyPath:'id'});st.createIndex('scopeKind','scopeKind',{unique:false});}};
      req.onsuccess=function(){resolve(req.result);};
      req.onerror=function(){reject(req.error||new Error('IndexedDB open failed'));};
    });
    return dbp;
  }
  function asDataURL(file){return new Promise(function(resolve,reject){var r=new FileReader();r.onload=function(){resolve(r.result);};r.onerror=function(){reject(r.error||new Error('File read failed'));};r.readAsDataURL(file);});}
  async function all(kind){
    var db=await openDB(); var key=scope(kind);
    return new Promise(function(resolve,reject){var t=db.transaction(STORE,'readonly');var st=t.objectStore(STORE);var idx=st.index('scopeKind');var req=idx.getAll(key);req.onsuccess=function(){resolve((req.result||[]).sort(function(a,b){return String(b.updated||'').localeCompare(String(a.updated||''));}));};req.onerror=function(){reject(req.error);};});
  }
  async function put(kind,files){
    files=Array.from(files||[]); if(!files.length)return;
    var rows=[];
    for(var i=0;i<files.length;i++){var f=files[i];rows.push({id:Date.now()+'_'+i+'_'+Math.random().toString(36).slice(2),scopeKind:scope(kind),userId:uid(),kind:kind,name:f.name,type:f.type||'application/octet-stream',size:f.size||0,updated:new Date().toISOString(),data:await asDataURL(f)});} 
    var db=await openDB();
    await new Promise(function(resolve,reject){var t=db.transaction(STORE,'readwrite');var st=t.objectStore(STORE);rows.forEach(function(x){st.put(x);});t.oncomplete=resolve;t.onerror=function(){reject(t.error);};});
    mirrorMeta(kind, await all(kind));
  }
  async function del(kind,id){var db=await openDB();await new Promise(function(resolve,reject){var t=db.transaction(STORE,'readwrite');t.objectStore(STORE).delete(id);t.oncomplete=resolve;t.onerror=function(){reject(t.error);};});mirrorMeta(kind, await all(kind));}
  async function one(kind,id){return (await all(kind)).find(function(x){return x.id===id;});}
  function mirrorKey(kind){return 'atsrs_file_meta_'+uid()+'_'+kind;}
  function mirrorMeta(kind,arr){try{localStorage.setItem(mirrorKey(kind),JSON.stringify((arr||[]).map(function(x){return {id:x.id,name:x.name,size:x.size,type:x.type,updated:x.updated};})));}catch(e){}}
  function oldKeys(kind){return ['atsrs_'+uid()+'_v134_'+kind+'Files','atsrs_'+uid()+'_'+kind+'Files','atsrs_'+uid()+'_coverLetterFiles','atsrs_local_test_user_v134_'+kind+'Files','atsrs_local_test_user_'+kind+'Files'];}
  async function migrate(kind){
    if((await all(kind)).length)return;
    var found=[];
    oldKeys(kind).forEach(function(k){try{var a=JSON.parse(localStorage.getItem(k)||'[]');if(Array.isArray(a))a.forEach(function(x){if(x&&x.data)found.push(x);});}catch(e){}});
    if(!found.length)return;
    var db=await openDB();
    await new Promise(function(resolve,reject){var t=db.transaction(STORE,'readwrite'), st=t.objectStore(STORE);found.forEach(function(x,i){st.put({id:x.id||Date.now()+'_'+i,scopeKind:scope(kind),userId:uid(),kind:kind,name:x.name||'File',type:x.type||'application/octet-stream',size:x.size||0,updated:x.updated||new Date().toISOString(),data:x.data});});t.oncomplete=resolve;t.onerror=function(){reject(t.error);};});
  }
  function label(n){return n?(n+' File'+(n>1?'s':'')):'No File';}
  function row(kind,f){return '<div class="atsrs-v134-row"><div><b title="'+esc(f.name)+'">📄 '+esc(f.name||'File')+'</b><span>'+Math.round((f.size||0)/1024)+' KB</span></div><div class="atsrs-v134-actions"><button class="secondary" onclick="atsrsV152Preview(\''+kind+'\',\''+esc(f.id)+'\')">Preview</button><button class="secondary" onclick="atsrsV152Download(\''+kind+'\',\''+esc(f.id)+'\')">Download</button><button class="action" onclick="atsrsV152Delete(\''+kind+'\',\''+esc(f.id)+'\')">Delete</button></div></div>';}
  async function renderKind(kind){
    await migrate(kind);
    var arr=[];try{arr=await all(kind);}catch(e){console.warn('ATSRS V168 read failed',e);}mirrorMeta(kind,arr);
    var st=byId('v134_'+kind+'_status'), list=byId('v134_'+kind+'_list'), filter=byId('v134_'+kind+'_filter');
    if(st){st.textContent=label(arr.length);st.className='atsrs-v134-status '+(arr.length?'ready':'empty');}
    if(filter)filter.classList.toggle('active',arr.length>0);
    if(list)list.innerHTML=arr.length?arr.map(function(f){return row(kind,f);}).join(''):'<div class="atsrs-v134-empty">No files uploaded yet.</div>';
  }
  async function render(){setBuild();for(var i=0;i<KINDS.length;i++)await renderKind(KINDS[i]);bind();}
  function bind(){KINDS.forEach(function(kind){var inp=byId('v134_'+kind+'_input');if(inp){inp.onchange=async function(e){try{await put(kind,e.target.files);e.target.value='';await render();}catch(err){console.error(err);alert('Upload could not be saved. Storage is blocked/full. Try Chrome and keep the same file location, or connect backend storage.');}};}});}
  window.atsrsV152Preview=async function(kind,id){var f=await one(kind,id);if(!f||!f.data){alert('File preview is not available.');return;}var w=window.open('','_blank');if(w){w.document.write('<title>'+esc(f.name||'File')+'</title><iframe src="'+f.data+'" style="border:0;width:100%;height:100vh"></iframe>');w.document.close();}};
  window.atsrsV152Download=async function(kind,id){var f=await one(kind,id);if(!f||!f.data){alert('File download is not available.');return;}var a=document.createElement('a');a.href=f.data;a.download=f.name||('ATSRS-'+kind);document.body.appendChild(a);a.click();a.remove();};
  window.atsrsV152Delete=async function(kind,id){await del(kind,id);await render();};
  ['renderAll','showPage','applyLanguage','renderManagedFiles'].forEach(function(n){var old=window[n];if(typeof old==='function'&&!old.__atsrsV152){var wrap=function(){var r=old.apply(this,arguments);setTimeout(render,120);setTimeout(render,500);return r;};wrap.__atsrsV152=true;window[n]=wrap;}});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',function(){setTimeout(render,150);});else setTimeout(render,150);
  window.addEventListener('load',function(){render();setTimeout(render,800);});atsrsStableInterval(function(){if(byId('refsPage')&&!byId('refsPage').classList.contains('hidden')){setBuild();bind();}},1200);
})();

/* ===== extracted from inline script id=ATSRS_V156_CV_SLOTS_UNDER_MAIN_STABLE_LAYOUT_JS ===== */
(function(){
  'use strict';
  var BUILD='ATSRS V299';
  var UPDATE='Last Update: 23 Jul 2026';
  var DB_NAME='ATSRS_FILE_DB_MAIN', STORE='referenceFiles', KIND='cv';
  var dbp=null, rendering=false, pending=false;
  function byId(id){return document.getElementById(id);} 
  function qa(s,r){return Array.prototype.slice.call((r||document).querySelectorAll(s));}
  function esc(s){return String(s||'').replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
  function uid(){try{return (window.currentUser&&window.currentUser.id)||localStorage.getItem('atsrs_saved_login_email')||localStorage.getItem('atsrs_local_uid')||'local_test_user';}catch(e){return 'local_test_user';}}
  function scope(){return uid()+'::'+KIND;}
  function setBuild(){qa('.build-badge').forEach(function(b){var d=b.querySelectorAll('div');if(d[0])d[0].textContent=BUILD;if(d[1])d[1].textContent=UPDATE;if(d[2])d[2].textContent='TEST BUILD';});}
  function openDB(){
    if(dbp)return dbp;
    dbp=new Promise(function(resolve,reject){
      if(!window.indexedDB){reject(new Error('IndexedDB blocked'));return;}
      var req=indexedDB.open(DB_NAME,1);
      req.onupgradeneeded=function(){var db=req.result;if(!db.objectStoreNames.contains(STORE)){var st=db.createObjectStore(STORE,{keyPath:'id'});st.createIndex('scopeKind','scopeKind',{unique:false});}};
      req.onsuccess=function(){resolve(req.result);};
      req.onerror=function(){reject(req.error||new Error('IndexedDB open failed'));};
    });
    return dbp;
  }
  function asDataURL(file){return new Promise(function(resolve,reject){var r=new FileReader();r.onload=function(){resolve(r.result);};r.onerror=function(){reject(r.error||new Error('File read failed'));};r.readAsDataURL(file);});}
  async function all(){
    var db=await openDB(), key=scope();
    return new Promise(function(resolve,reject){
      var t=db.transaction(STORE,'readonly'), st=t.objectStore(STORE), idx=st.index('scopeKind'), req=idx.getAll(key);
      req.onsuccess=function(){var a=req.result||[];a.sort(function(a,b){return (b.isMain?1:0)-(a.isMain?1:0)||String(b.updated||'').localeCompare(String(a.updated||''));});resolve(a);};
      req.onerror=function(){reject(req.error);};
    });
  }
  async function clearAllAndPut(row){
    var db=await openDB(), key=scope();
    await new Promise(function(resolve,reject){
      var t=db.transaction(STORE,'readwrite'), st=t.objectStore(STORE), idx=st.index('scopeKind'), req=idx.getAll(key);
      req.onsuccess=function(){(req.result||[]).forEach(function(x){st.delete(x.id);});if(row)st.put(row);};
      t.oncomplete=resolve;t.onerror=function(){reject(t.error);};
    });
  }
  async function del(id){var db=await openDB();await new Promise(function(resolve,reject){var t=db.transaction(STORE,'readwrite');t.objectStore(STORE).delete(id);t.oncomplete=resolve;t.onerror=function(){reject(t.error);};});}
  async function main(){var a=await all();return a.find(function(x){return x.isMain;})||a[0]||null;}
  function dataURLToBlobURL(data){try{var p=String(data||'').split(','), meta=p[0]||'', bin=atob(p[1]||''), mime=(meta.match(/data:([^;]+)/)||[])[1]||'application/octet-stream', len=bin.length, u8=new Uint8Array(len);for(var i=0;i<len;i++)u8[i]=bin.charCodeAt(i);return URL.createObjectURL(new Blob([u8],{type:mime}));}catch(e){return data;}}
  function openFile(f){if(!f||!f.data){alert('CV preview is not available.');return;}var url=dataURLToBlobURL(f.data);var w=window.open(url,'_blank','noopener');if(!w){var a=document.createElement('a');a.href=url;a.target='_blank';a.rel='noopener';document.body.appendChild(a);a.click();a.remove();}setTimeout(function(){try{if(String(url).indexOf('blob:')===0)URL.revokeObjectURL(url);}catch(e){}},60000);}
  function downloadFile(f){if(!f||!f.data){alert('CV download is not available.');return;}var a=document.createElement('a');a.href=f.data;a.download=f.name||'ATSRS-CV';document.body.appendChild(a);a.click();a.remove();}
  function mainBox(f){
    var body=f?'<div class="atsrs-v156-main-row"><div class="atsrs-v156-main-name"><b title="'+esc(f.name)+'">📄 '+esc(f.name||'Main CV')+' <span class="atsrs-v153-main-badge">MAIN</span></b><span>'+Math.round((f.size||0)/1024)+' KB</span></div><div class="atsrs-v156-actions"><button class="secondary" onclick="previewCV()">Preview</button><button class="secondary" onclick="downloadCV()">Download</button><button class="action" onclick="deleteCV()">Delete</button></div></div>':'<div class="atsrs-v156-empty">No Main CV uploaded yet.</div>';
    return '<div class="atsrs-v156-main-box"><span class="atsrs-v156-box-title">Main CV</span>'+body+'</div>';
  }
  function slotsBox(){
    return '<div class="atsrs-v156-slots-box"><span class="atsrs-v156-box-title">Additional CV Slots</span><div class="atsrs-v156-slot-list">'+
      '<div class="atsrs-v156-slot-chip"><b>🔒 Additional CV Slot 1</b><span>PRO</span></div>'+ 
      '<div class="atsrs-v156-slot-chip"><b>🔒 Additional CV Slot 2</b><span>Premium</span></div>'+ 
      '<div class="atsrs-v156-slot-chip"><b>🔒 Additional CV Slot 3</b><span>Premium</span></div>'+ 
      '</div></div>';
  }
  async function renderCV(){
    if(window.atsrsCloudData&&typeof window.atsrsCloudData.renderFiles==='function'){
      await window.atsrsCloudData.renderFiles();
      return;
    }
    if(rendering){pending=true;return;} rendering=true;
    try{
      setBuild();
      var arr=[];try{arr=await all();}catch(e){console.warn('V156 CV read failed',e);} 
      var m=arr.find(function(x){return x.isMain;})||arr[0]||null;
      if(m && (!m.isMain || arr.length>1)){m.isMain=true;await clearAllAndPut(m);} 
      var info=byId('cvFileInfo');
      if(info){info.className='preview-box atsrs-v156-cv-area';info.innerHTML=mainBox(m)+slotsBox();}
      var badge=byId('cvStatusBadge'); if(badge){badge.textContent=m?'Main CV':'No CV Uploaded';badge.className='badge '+(m?'badge-ready':'badge-blocked');}
      var dash=byId('cvStatusDash'); if(dash){dash.textContent=m?'Available ✓':'Missing ⚠';dash.className='stat '+(m?'good':'missing');}
      var up=byId('uploadCVBtn'); if(up)up.textContent=m?'Replace Main CV':'Upload Main CV';
      var inp=byId('cvUploadInput'); if(inp)inp.removeAttribute('multiple');
      var prev=byId('previewCVBtn'); if(prev)prev.textContent='Preview Main CV';
      var down=byId('downloadCVBtn'); if(down)down.textContent='Download Main CV';
      var delb=byId('deleteCVBtn'); if(delb)delb.textContent='Delete Main CV';
    } finally { rendering=false; if(pending){pending=false;Promise.resolve().then(renderCV);} }
  }
  function scheduleRender(){Promise.resolve().then(renderCV);}
  window.handleCVUpload=async function(event){
    try{
      var files=Array.prototype.slice.call((event&&event.target&&event.target.files)||[]);if(!files.length)return;
      var f=files[0];
      var row={id:Date.now()+'_main_'+Math.random().toString(36).slice(2),scopeKind:scope(),userId:uid(),kind:KIND,name:f.name,type:f.type||'application/octet-stream',size:f.size||0,updated:new Date().toISOString(),isMain:true,data:await asDataURL(f)};
      await clearAllAndPut(row);
      if(event&&event.target)event.target.value='';
      await renderCV();
      if(files.length>1)alert('Free plan allows only Main CV. Additional CV slots are prepared for paid plans.');
    }catch(err){console.error(err);alert('CV could not be saved. Storage is blocked/full.');}
  };
  window.previewCV=async function(){var f=await main();if(!f){alert('No Main CV uploaded yet.');return;}openFile(f);};
  window.downloadCV=async function(){var f=await main();if(!f){alert('No Main CV uploaded yet.');return;}downloadFile(f);};
  window.deleteCV=async function(){var f=await main();if(!f){alert('No Main CV uploaded yet.');return;}await del(f.id);await renderCV();};
  window.atsrsV156RenderCV=renderCV;
  ['renderAll','showPage','applyLanguage','renderCVStatus'].forEach(function(n){var old=window[n];if(typeof old==='function'&&!old.__atsrsV156){var wrap=function(){var r=old.apply(this,arguments);scheduleRender();return r;};wrap.__atsrsV156=true;window[n]=wrap;}});
  function armObserver(){var info=byId('cvFileInfo');if(!info||info.__atsrsV156Observer)return;if(!window.MutationObserver)return;var mo=new MutationObserver(function(){if(rendering)return;if(!info.classList.contains('atsrs-v156-cv-area'))scheduleRender();});mo.observe(info,{childList:true,subtree:false,attributes:true,attributeFilter:['class']});info.__atsrsV156Observer=mo;}
  function boot(){armObserver();renderCV();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
  window.addEventListener('load',boot);
})();

/* ===== extracted from inline script id=atsrs-v157-login-cleanup-script ===== */
(function(){
  'use strict';
  var BUILD='ATSRS V299';
  var UPDATE='Last Update: 23 Jul 2026';
  function byId(id){return document.getElementById(id);}
  function lockBuild(){
    var badge=byId('buildBadge')||document.querySelector('.build-badge');
    if(!badge)return;
    var rows=badge.querySelectorAll('div');
    if(rows.length>=2){rows[0].textContent=BUILD;rows[1].textContent=UPDATE;}
    else{badge.innerHTML='<div>'+BUILD+'</div><div>'+UPDATE+'</div>';}
  }
  /* V210: cleanSocial() used to force-rewrite #signupSocialArea back to a
     single stale button + "or" divider on a repeating timer, destroying the
     Sign In / Sign Up split and the pre-auth account-type panel added in
     V208/V209. Disabled - the current markup in index.html is already the
     intended clean UI and must not be overwritten. */
  window.atsrsV157GoogleNotice=function(e){
    if(e){e.preventDefault();e.stopPropagation();}
    if(typeof window.atsrsGoogleSignUp==='function') return window.atsrsGoogleSignUp(e);
    var msg=byId('loginMsg')||byId('regMsg');
    if(msg)msg.textContent='Google sign-up is loading. Please refresh and try again.';
    return false;
  };
  function run(){lockBuild();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run);else run();
  window.addEventListener('load',run);
  [80,250,700,1300,2400].forEach(function(ms){setTimeout(run,ms);});
  atsrsStableInterval(lockBuild,500);
})();
