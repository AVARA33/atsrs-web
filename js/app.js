/* ATSRS V178 extracted JavaScript batch: app.js. Loaded in original V178 execution order. No placeholder code. */
/* ===== extracted from inline script id=atsrs-v161-single-date-badge-script ===== */
(function(){
  'use strict';
  var BUILD='ATSRS V254';
  var UPDATE='Last Update: 21 Jul 2026';
  var cleaning=false;
  function isBuildText(t){
    t=String(t||'').trim();
    return /^ATSRS\s+V\d+/i.test(t) || /^Last\s+Update\s*:/i.test(t) || /TEST\s+BUILD/i.test(t) || /\bUTC\b/i.test(t);
  }
  function normalizeBadge(){
    if(cleaning)return;
    cleaning=true;
    try{
      var main=document.getElementById('buildBadge');
      if(!main){cleaning=false;return;}
      document.querySelectorAll('.build-badge').forEach(function(b){
        if(b!==main) b.remove();
      });
      var rows=main.querySelectorAll('div');
      if(rows.length<2){main.innerHTML='<div>'+BUILD+'</div><div>'+UPDATE+'</div>';}
      else{
        if(rows[0].textContent!==BUILD)rows[0].textContent=BUILD;
        if(rows[1].textContent!==UPDATE)rows[1].textContent=UPDATE;
      }
      document.querySelectorAll('#auth *').forEach(function(el){
        if(el===main || main.contains(el)) return;
        if(el.closest && el.closest('#buildBadge')) return;
        if(el.children && el.children.length) return;
        if(isBuildText(el.textContent)) el.remove();
      });
    }catch(e){}
    cleaning=false;
  }
  function run(){normalizeBadge();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run);else run();
  window.addEventListener('load',run);
  [0,50,150,400,900,1600,2600].forEach(function(ms){setTimeout(run,ms);});
  window.addEventListener('atsrs:resume',run);
})();

/* ===== extracted from inline script id=ATSRS_V166_REFS_DASH_FRAMELESS_COMPACT_JS ===== */
(function(){
  'use strict';
  var BUILD='ATSRS V254';
  var UPDATE='Last Update: 21 Jul 2026';
  function q(s,r){return (r||document).querySelector(s);}
  function qa(s,r){return Array.from((r||document).querySelectorAll(s));}
  function setBuild(){
    qa('.build-badge').forEach(function(b){
      var d=b.querySelectorAll('div');
      if(d[0])d[0].textContent=BUILD;
      if(d[1])d[1].textContent=UPDATE;
      if(d[2])d[2].textContent='TEST BUILD';
    });
  }
  function compactRefControls(){
    qa('#refsPage .atsrs-v134-career-card').forEach(function(card){
      var btn=q('.atsrs-v134-upload',card);
      var bar=q('.atsrs-v134-statusbar',card);
      var filter=q('.atsrs-v134-filter',card);
      var status=q('.atsrs-v134-status',card);
      if(btn&&bar&&btn.parentElement!==bar){
        if(filter)bar.insertBefore(btn,filter); else bar.appendChild(btn);
      }
      if(filter){
        filter.classList.add('active');
        filter.style.display='block';
        filter.disabled = !!(status && /No File/i.test(status.textContent||''));
      }
    });
    qa('#refsPage #cvCard [class*="slot"],#refsPage #cvCard [id*="slot"],#refsPage #cvCard [id*="Slot"],#refsPage #cvCard [class*="premium"],#refsPage #cvCard [class*="Premium"]').forEach(function(x){x.style.display='none';});
  }
  function run(){setBuild();compactRefControls();}
  ['DOMContentLoaded','load'].forEach(function(ev){window.addEventListener(ev,function(){setTimeout(run,60);setTimeout(run,350);});});
  var oldRender=window.renderAll;
  if(typeof oldRender==='function'&&!oldRender.__atsrsV166){
    window.renderAll=function(){var r=oldRender.apply(this,arguments);setTimeout(run,80);return r;};
    window.renderAll.__atsrsV166=true;
  }
  var oldShow=window.showPage;
  if(typeof oldShow==='function'&&!oldShow.__atsrsV166){
    window.showPage=function(){var r=oldShow.apply(this,arguments);setTimeout(run,80);setTimeout(run,380);return r;};
    window.showPage.__atsrsV166=true;
  }
  run(); setTimeout(run,500); setTimeout(run,1200);
})();

/* ===== extracted from inline script ===== */
(function atsrsV167TopClean(){
  function cleanTop(){
    document.querySelectorAll('#app .top-actions,#app .atsrs-global-top-actions,#app .atsrs-v56-top-actions,#app .atsrs-v64-top-actions,body > .top-actions,body > .atsrs-global-top-actions,body > .atsrs-v56-top-actions,body > .atsrs-v64-top-actions').forEach(function(el){el.remove();});
    var exit=document.getElementById('navLogout');
    if(exit){
      exit.textContent='Exit';
      exit.classList.add('exit-nav-btn');
      exit.setAttribute('onclick','atsrsExit()');
    }
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', cleanTop); else cleanTop();
  setTimeout(cleanTop,100);
  setTimeout(cleanTop,800);
  setTimeout(cleanTop,2000);
})();

/* ===== extracted from inline script id=ATSRS_V172_DOCUMENTS_STABLE_JS ===== */
(function atsrsV172DocumentsStable(){
  'use strict';
  var editIndex=null;
  var editKey='';
  var registerFilter='';
  var registerSort={key:'',direction:1};
  var selectedCertIndices=new Set();
  function byId(id){return document.getElementById(id);}
  function setText(id,value){var el=byId(id); if(el) el.textContent=value;}
  function q(sel,root){return (root||document).querySelector(sel);}
  function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
  function certificateKey(item){
    item=item&&typeof item==='object'?item:{};
    if(item.cloudFileId)return 'file:'+String(item.cloudFileId);
    return 'fields:'+[
      item.docNo,item.type,item.provider,item.person,item.issue,item.fileName
    ].map(function(value){return String(value==null?'':value).trim().toLowerCase();}).join('|');
  }

  function cleanTopAndLang(){
    ['langCircle','langMenu','appLangCircle','appLangMenu','topLogoutBtn'].forEach(function(id){var el=byId(id); if(el) el.remove();});
    document.querySelectorAll('#auth .lang-floating,#app > .top-actions,body > .top-actions,body > .atsrs-global-top-actions,body > .atsrs-v56-top-actions,body > .atsrs-v64-top-actions,.atsrs-account-badge').forEach(function(el){el.remove();});
    var exit=byId('navLogout');
    if(exit){exit.textContent='Exit';exit.classList.add('exit-nav-btn');exit.style.display='block';exit.setAttribute('onclick','atsrsExit()');}
  }

  function aiNotice(){
    alert('Scan with AI / Auto-fill with AI will be available in a future update. Use Manual Upload for now.');
  }

  function closeManual(){
    var p=byId('certManualPanel'); if(p)p.classList.remove('active');
    var b=byId('certManualModeBtn'); if(b)b.classList.remove('active');
    editIndex=null;
    editKey='';
    if(typeof editCertIndex!=='undefined')editCertIndex=null;
    clearForm();
    if(typeof clearManualValidation==='function')clearManualValidation();
    setText('addCertBtn','Save Document');
  }

  function openManual(){
    var existingPanel=byId('certManualPanel');
    if(editIndex===null&&(!existingPanel||!existingPanel.classList.contains('active')))clearForm();
    var scan=byId('certScanPanel'); if(scan)scan.classList.remove('active');
    var p=byId('certManualPanel'); if(p)p.classList.add('active');
    var sb=byId('certScanModeBtn'); if(sb)sb.classList.remove('active');
    var mb=byId('certManualModeBtn'); if(mb)mb.classList.add('active');
  }

  function ensureCancel(){
    var save=byId('addCertBtn'); if(!save)return;
    var parent=save.parentElement;
    if(!parent.classList.contains('atsrs-v172-form-actions')){
      var wrap=document.createElement('div');
      wrap.className='atsrs-v172-form-actions';
      parent.insertBefore(wrap,save);
      wrap.appendChild(save);
    }
    if(!byId('cancelCertBtn')){
      var c=document.createElement('button');
      c.id='cancelCertBtn';
      c.type='button';
      c.className='secondary';
      c.textContent='Cancel';
      c.onclick=function(){closeManual();};
      save.parentElement.appendChild(c);
    }
  }

  function fixLabels(){
    setText('addDocTitle','Documents');
    setText('addCertFlowNote','Choose one method: Scan with AI or Manual Upload.');
    setText('certScanModeBtn','Scan with AI');
    setText('certManualModeBtn','Manual Upload');
    setText('scanFlowText','Scan with AI / Auto-fill with AI will be available in a future update.');
    setText('manualCertTitle','Manual Upload');
    setText('manualFlowText','Upload a file and enter document details manually.');
    setText('manualUploadBtn','Upload File');
    setText('cTypeLabel','Certificate');
    setText('cDocNoLabel','Document / Certificate No (Optional)');
    setText('cCountryLabel','Country / Authority (Optional)');
    setText('cProviderLabel','Training Center / Provider');
    setText('cIssueLabel','Issue Date');
    setText('cExpiryLabel','Expiry');
    setText('addCertBtn',editIndex===null?'Save Document':'Update Document');
    setText('certRegisterTitle','Document Register');
    setText('certSortTypeLabel','Certificate');
    setText('thProvider2','Training Center / Provider');
    setText('certSortExpiryLabel','Expiry');
    setText('certSortStatusLabel','Status');
    setText('thAction2','Action');
  }

  function certificateSearchText(item,statusData){
    return [item.type,item.provider,item.docNo,item.country,item.issue,item.expiry,statusData&&statusData.txt]
      .map(function(value){return String(value==null?'':value).toLocaleLowerCase();})
      .join(' ');
  }

  function compareCertificateRows(a,b,key){
    if(key==='expiry'){
      var aValue=String(a.item.expiry||'').toUpperCase()==='N/A'?'9999-12-31':String(a.item.expiry||'9999-12-31');
      var bValue=String(b.item.expiry||'').toUpperCase()==='N/A'?'9999-12-31':String(b.item.expiry||'9999-12-31');
      return aValue.localeCompare(bValue);
    }
    if(key==='status'){
      var aDays=Number(a.statusData.days); if(!Number.isFinite(aDays))aDays=99999;
      var bDays=Number(b.statusData.days); if(!Number.isFinite(bDays))bDays=99999;
      return aDays-bDays;
    }
    return String(a.item.type||'').localeCompare(String(b.item.type||''),undefined,{sensitivity:'base',numeric:true});
  }

  function updateRegisterControls(visibleIndices){
    var count=byId('certSelectionCount');
    var remove=byId('deleteSelectedCertsBtn');
    var selectedCount=selectedCertIndices.size;
    if(count)count.textContent=selectedCount+' selected';
    if(remove){remove.disabled=selectedCount===0;remove.textContent=selectedCount?'Delete selected ('+selectedCount+')':'Delete selected';}
    var all=byId('certSelectAll');
    if(all){
      var selectedVisible=visibleIndices.filter(function(index){return selectedCertIndices.has(index);}).length;
      all.checked=visibleIndices.length>0&&selectedVisible===visibleIndices.length;
      all.indeterminate=selectedVisible>0&&selectedVisible<visibleIndices.length;
      all.disabled=visibleIndices.length===0;
    }
  }

  function updateSortHeaders(){
    document.querySelectorAll('[data-cert-sort]').forEach(function(button){
      var active=button.getAttribute('data-cert-sort')===registerSort.key;
      button.classList.toggle('active',active);
      button.classList.toggle('descending',active&&registerSort.direction<0);
      button.setAttribute('aria-label','Sort by '+(button.textContent||'column').trim()+(active?(registerSort.direction>0?', ascending':', descending'):''));
    });
  }

  function ensureRegisterControls(){
    var filter=byId('certDocumentFilter');
    if(filter&&!filter.dataset.bound){
      filter.dataset.bound='true';
      filter.addEventListener('input',function(){registerFilter=String(filter.value||'').trim().toLocaleLowerCase();renderCertRows();});
    }
    document.querySelectorAll('[data-cert-sort]').forEach(function(button){
      if(button.dataset.bound)return;
      button.dataset.bound='true';
      button.addEventListener('click',function(){
        var key=button.getAttribute('data-cert-sort');
        if(registerSort.key===key)registerSort.direction*=-1;
        else registerSort={key:key,direction:1};
        renderCertRows();
      });
    });
    var table=byId('certTable');
    if(table&&!table.dataset.selectionBound){
      table.dataset.selectionBound='true';
      table.addEventListener('change',function(event){
        var checkbox=event.target&&event.target.closest?event.target.closest('[data-cert-select]'):null;
        if(!checkbox)return;
        var index=Number(checkbox.getAttribute('data-cert-select'));
        if(checkbox.checked)selectedCertIndices.add(index);else selectedCertIndices.delete(index);
        renderCertRows();
      });
    }
    var selectAll=byId('certSelectAll');
    if(selectAll&&!selectAll.dataset.bound){
      selectAll.dataset.bound='true';
      selectAll.addEventListener('change',function(){
        var visible=Array.from(document.querySelectorAll('[data-cert-select]')).map(function(box){return Number(box.getAttribute('data-cert-select'));});
        visible.forEach(function(index){if(selectAll.checked)selectedCertIndices.add(index);else selectedCertIndices.delete(index);});
        renderCertRows();
      });
    }
    var remove=byId('deleteSelectedCertsBtn');
    if(remove&&!remove.dataset.bound){remove.dataset.bound='true';remove.addEventListener('click',deleteSelectedCertificates);}
  }

  function wireMethods(){
    var scan=byId('certScanModeBtn');
    if(scan){scan.onclick=function(e){if(e)e.preventDefault(); aiNotice(); closeManual();};}
    var manual=byId('certManualModeBtn');
    if(manual){manual.onclick=function(e){if(e)e.preventDefault(); openManual();};}
    var scanDoc=byId('scanDocBtn');
    if(scanDoc){scanDoc.onclick=function(e){if(e)e.preventDefault(); aiNotice();};}
    var uploadDoc=byId('uploadDocBtn');
    if(uploadDoc){uploadDoc.onclick=function(e){if(e)e.preventDefault(); aiNotice();};}
    ensureCancel();
  }

  function clearForm(){
    ['cType','cDocNo','cCountry','cProvider','cIssue','cExpiry'].forEach(function(id){
      var el=byId(id);
      if(el){el.value='';el.classList.remove('required-missing','input-error','input-ok');}
    });
    var person=byId('cPerson');
    if(person){person.selectedIndex=0;person.classList.remove('required-missing','input-error','input-ok');}
    var expiryNA=byId('cExpiryNA');
    if(expiryNA){
      expiryNA.checked=false;
      expiryNA.defaultChecked=false;
      expiryNA.removeAttribute('checked');
      expiryNA.dispatchEvent(new Event('change',{bubbles:true}));
    }
    var expiry=byId('cExpiry');
    if(expiry)expiry.disabled=false;
    var f=byId('manualFile'); if(f)f.value='';
    ['manualFormAlert','manualFilePreview'].forEach(function(id){
      var el=byId(id);
      if(el){el.classList.remove('active');el.textContent='';}
    });
    window.atsrsPendingCertificateFile=null;
  }

  window.atsrsV172PreviewCert=function(i){
    var a=(typeof getData==='function'?getData('certs'):[])||[]; var x=a[i];
    if(!x){alert('Document not found.');return;}
    if(x.cloudFileId&&window.atsrsCloudData&&typeof window.atsrsCloudData.openDocument==='function'){
      return window.atsrsCloudData.openDocument(x.cloudFileId,false).catch(function(error){
        console.error(error);alert('The document file could not be opened from the ATSRS server.');
      });
    }
    alert('Document: '+(x.type||'-')+'\nProvider: '+(x.provider||'-')+'\nExpiry: '+(x.expiry||'-')+'\nStatus: '+((typeof status==='function'&&x.expiry)?status(x.expiry).txt:'-'));
  };
  window.atsrsV172EditCert=function(i){
    var a=(typeof getData==='function'?getData('certs'):[])||[]; var x=a[i];
    if(!x){alert('Document not found.');return;}
    editIndex=i; editKey=certificateKey(x); openManual();
    var fileInput=byId('manualFile'); if(fileInput)fileInput.value='';
    window.atsrsPendingCertificateFile=null;
    var cp=byId('cPerson'); if(cp&&x.person)cp.value=x.person;
    var t=byId('cType'); if(t)t.value=x.type||'';
    var n=byId('cDocNo'); if(n)n.value=x.docNo||'';
    var co=byId('cCountry'); if(co)co.value=x.country||'';
    var pr=byId('cProvider'); if(pr)pr.value=x.provider||'';
    var is=byId('cIssue'); if(is)is.value=x.issue||'';
    var noExpiry=String(x.expiry||'').toUpperCase()==='N/A';
    var expiryNA=byId('cExpiryNA');
    if(expiryNA){expiryNA.checked=noExpiry;expiryNA.defaultChecked=false;}
    var ex=byId('cExpiry'); if(ex){ex.disabled=noExpiry;ex.value=noExpiry?'':(x.expiry||'');}
    var filePreview=byId('manualFilePreview');
    if(filePreview){filePreview.textContent=x.fileName?'Current file: '+x.fileName:'';filePreview.classList.toggle('active',!!x.fileName);}
    if(typeof clearManualValidation==='function')clearManualValidation();
    setText('addCertBtn','Update Document');
    setTimeout(function(){var panel=byId('certManualPanel'); if(panel)panel.scrollIntoView({behavior:'smooth',block:'start'});},60);
  };

  window.addCertificate=async function(){
    if(typeof validateManualCertificateForm==='function' && !validateManualCertificateForm())return;
    var a=(typeof getData==='function'?getData('certs'):[])||[];
    var editing=editIndex!==null;
    var targetIndex=editIndex;
    if(editing&&editKey&&(!a[targetIndex]||certificateKey(a[targetIndex])!==editKey)){
      var matchedIndex=a.findIndex(function(entry){return certificateKey(entry)===editKey;});
      if(matchedIndex>=0)targetIndex=matchedIndex;
    }
    var previous=editing&&targetIndex!==null?a[targetIndex]:null;
    if(editing&&!previous){
      alert('This document changed while it was being edited. Refresh the page and try again.');
      return;
    }
    var person=(typeof isPersonalMode==='function'&&isPersonalMode())?(typeof soloOwnerName==='function'?soloOwnerName():''):(byId('cPerson')?byId('cPerson').value:'');
    if(!person)return;
    var item={
      person:person,
      type:(byId('cType')?byId('cType').value:''),
      docNo:(byId('cDocNo')?byId('cDocNo').value:''),
      country:(byId('cCountry')?byId('cCountry').value:''),
      provider:(byId('cProvider')?byId('cProvider').value:''),
      issue:(byId('cIssue')?byId('cIssue').value:''),
      expiry:(byId('cExpiryNA')&&byId('cExpiryNA').checked)?'N/A':(byId('cExpiry')?byId('cExpiry').value:'')
    };
    if(previous){
      item.cloudFileId=previous.cloudFileId||'';
      item.fileName=previous.fileName||'';
      item.mimeType=previous.mimeType||'';
      item.fileSize=previous.fileSize||0;
    }
    var button=byId('addCertBtn'),oldText=button&&button.textContent;
    if(button){button.disabled=true;button.textContent='Saving to server...';}
    var uploadedRow=null;
    var metadataUpdated=false;
    var saveCompleted=false;
    try{
      var file=window.atsrsPendingCertificateFile;
      if(file){
        if(!window.atsrsCloudData||typeof window.atsrsCloudData.uploadDocument!=='function')throw new Error('ATSRS cloud storage is not ready.');
        uploadedRow=await window.atsrsCloudData.uploadDocument(file,{document:item});
        item.cloudFileId=uploadedRow.id;item.fileName=uploadedRow.file_name;item.mimeType=uploadedRow.mime_type;item.fileSize=uploadedRow.size_bytes;
      }else if(item.cloudFileId&&window.atsrsCloudData&&typeof window.atsrsCloudData.updateDocumentMetadata==='function'){
        await window.atsrsCloudData.updateDocumentMetadata(item.cloudFileId,{document:item});
        metadataUpdated=true;
      }
      if(editing&&targetIndex!==null&&a[targetIndex])a[targetIndex]=item;else a.push(item);
      if(typeof saveData==='function')saveData('certs',a);
      if(window.atsrsCloudData&&typeof window.atsrsCloudData.flush==='function'&&!(await window.atsrsCloudData.flush()))throw new Error('Document details could not be saved.');
      if(file&&previous&&previous.cloudFileId&&previous.cloudFileId!==item.cloudFileId&&window.atsrsCloudData&&typeof window.atsrsCloudData.deleteDocument==='function'){
        try{await window.atsrsCloudData.deleteDocument(previous.cloudFileId);}catch(cleanupError){console.warn('ATSRS old document cleanup deferred',cleanupError);}
      }
      saveCompleted=true;
      selectedCertIndices.clear();
      editIndex=null;editKey='';closeManual();
      if(window.atsrsCloudData&&typeof window.atsrsCloudData.refresh==='function'){
        try{await window.atsrsCloudData.refresh();}catch(refreshError){console.warn('ATSRS post-save refresh failed',refreshError);if(typeof renderAll==='function')renderAll();}
      }else if(typeof renderAll==='function')renderAll();
    }catch(error){
      console.error('ATSRS document save failed',error);
      if(metadataUpdated&&previous&&previous.cloudFileId&&window.atsrsCloudData&&typeof window.atsrsCloudData.updateDocumentMetadata==='function'){
        try{await window.atsrsCloudData.updateDocumentMetadata(previous.cloudFileId,{document:previous});}catch(rollbackError){console.error('ATSRS metadata rollback failed',rollbackError);}
      }
      if(uploadedRow&&window.atsrsCloudData&&typeof window.atsrsCloudData.deleteDocument==='function'){
        try{await window.atsrsCloudData.deleteDocument(uploadedRow.id);}catch(cleanupError){console.error('ATSRS orphan document cleanup failed',cleanupError);}
      }
      alert('The document was not saved to the ATSRS server. Check the connection and try again.');
    }finally{
      if(button){button.disabled=false;button.textContent=saveCompleted?'Save Document':(oldText||'Save Document');}
    }
  };

  window.deleteCert=async function(i){
    var a=(typeof getData==='function'?getData('certs'):[])||[],item=a[i];
    if(!item)return;
    try{
      a.splice(i,1);
      if(typeof saveData==='function')saveData('certs',a);
      if(window.atsrsCloudData&&typeof window.atsrsCloudData.flush==='function'&&!(await window.atsrsCloudData.flush()))throw new Error('Document details could not be deleted.');
      if(item.cloudFileId&&window.atsrsCloudData&&typeof window.atsrsCloudData.deleteDocument==='function'){
        await window.atsrsCloudData.deleteDocument(item.cloudFileId);
      }
      selectedCertIndices.clear();
      if(typeof renderAll==='function')window.renderAll();
    }catch(error){
      console.error('ATSRS document delete failed',error);
      alert('The document could not be deleted from the ATSRS server.');
    }
  };

  async function deleteSelectedCertificates(){
    var a=(typeof getData==='function'?getData('certs'):[])||[];
    var indices=Array.from(selectedCertIndices).filter(function(index){return Number.isInteger(index)&&index>=0&&index<a.length;}).sort(function(left,right){return right-left;});
    if(!indices.length)return;
    if(!window.confirm('Delete '+indices.length+' selected document'+(indices.length===1?'':'s')+'? This permanently removes the selected files.'))return;
    var remove=byId('deleteSelectedCertsBtn');
    if(remove){remove.disabled=true;remove.textContent='Deleting...';}
    var removed=indices.map(function(index){return a[index];});
    try{
      var remaining=a.filter(function(_,index){return indices.indexOf(index)===-1;});
      if(typeof saveData==='function')saveData('certs',remaining);
      if(window.atsrsCloudData&&typeof window.atsrsCloudData.flush==='function'&&!(await window.atsrsCloudData.flush()))throw new Error('Document register changes could not be saved.');
      var cleanupFailures=0;
      for(var i=0;i<removed.length;i++){
        var item=removed[i];
        if(item&&item.cloudFileId&&window.atsrsCloudData&&typeof window.atsrsCloudData.deleteDocument==='function'){
          try{await window.atsrsCloudData.deleteDocument(item.cloudFileId);}catch(cleanupError){cleanupFailures++;console.error('ATSRS selected document cleanup failed',cleanupError);}
        }
      }
      selectedCertIndices.clear();
      if(typeof renderAll==='function')window.renderAll();else renderCertRows();
      if(cleanupFailures)alert('The documents were removed from the register, but '+cleanupFailures+' server file'+(cleanupFailures===1?' needs':'s need')+' cleanup. Please try again later.');
    }catch(error){
      console.error('ATSRS selected document delete failed',error);
      alert('The selected documents could not be deleted from the ATSRS server.');
      renderCertRows();
    }
  }

  function renderCertRows(){
    if(typeof currentUser==='undefined' || !currentUser)return;
    if(!byId('certTable') || typeof getData!=='function' || typeof status!=='function')return;
    var c=getData('certs')||[];
    selectedCertIndices.forEach(function(index){if(index<0||index>=c.length)selectedCertIndices.delete(index);});
    var rows=c.map(function(item,index){return{item:item,index:index,statusData:status(item.expiry)};});
    if(registerFilter)rows=rows.filter(function(row){return certificateSearchText(row.item,row.statusData).indexOf(registerFilter)!==-1;});
    if(registerSort.key)rows.sort(function(a,b){var result=compareCertificateRows(a,b,registerSort.key);return result===0?a.index-b.index:result*registerSort.direction;});
    var html='';
    rows.forEach(function(row){
      var x=row.item,i=row.index,st=row.statusData;
      html+='<tr><td class="atsrs-document-select-column"><input type="checkbox" data-cert-select="'+i+'" aria-label="Select '+esc(x.type||'document')+'" '+(selectedCertIndices.has(i)?'checked':'')+'></td><td>'+esc(x.type||'')+'</td><td>'+esc(x.provider||'')+'</td><td>'+esc(x.expiry||'')+'</td><td class="'+esc(st.cls||'')+'">'+esc(st.txt||'')+'</td><td>'+
        '<button class="secondary" onclick="atsrsV172PreviewCert('+i+')">Preview</button>'+
        '<button class="secondary" onclick="atsrsV172EditCert('+i+')">Edit</button>'+
        '<button class="secondary atsrs-v172-delete" onclick="deleteCert('+i+')">Delete</button>'+
      '</td></tr>';
    });
    if(!rows.length)html='<tr><td colspan="6" class="atsrs-document-empty">No documents match this filter.</td></tr>';
    byId('certTable').innerHTML=html;
    updateSortHeaders();
    updateRegisterControls(rows.map(function(row){return row.index;}));
  }

  function stableDocuments(){
    cleanTopAndLang(); fixLabels(); wireMethods();ensureRegisterControls();
    if(typeof currentUser!=='undefined' && currentUser) renderCertRows();
    var scanPanel=byId('certScanPanel'); if(scanPanel)scanPanel.classList.remove('active');
    var scanBtn=byId('certScanModeBtn'); if(scanBtn)scanBtn.classList.remove('active');
    if(editIndex===null){var manual=byId('certManualPanel'); if(manual&&!manual.dataset.keepOpen)manual.classList.remove('active'); var mb=byId('certManualModeBtn'); if(mb)mb.classList.remove('active');}
  }

  var oldRender=window.renderAll;
  if(typeof oldRender==='function' && !oldRender.__atsrsV172){
    window.renderAll=function(){var r=oldRender.apply(this,arguments);setTimeout(function(){fixLabels();wireMethods();renderCertRows();},0);setTimeout(function(){fixLabels();renderCertRows();},120);return r;};
    window.renderAll.__atsrsV172=true;
  }
  var oldShow=window.showPage;
  if(typeof oldShow==='function' && !oldShow.__atsrsV172){
    window.showPage=function(){var r=oldShow.apply(this,arguments);setTimeout(stableDocuments,0);setTimeout(stableDocuments,160);return r;};
    window.showPage.__atsrsV172=true;
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',function(){setTimeout(stableDocuments,80);setTimeout(stableDocuments,500);});
  else {setTimeout(stableDocuments,80);setTimeout(stableDocuments,500);}
  window.addEventListener('load',function(){setTimeout(stableDocuments,120);setTimeout(stableDocuments,900);});
})();

/* ===== extracted from inline script id=ATSRS_V178_BUILD_LOCK_JS ===== */
(function(){
  'use strict';
  function lockBuild(){
    document.querySelectorAll('.build-badge').forEach(function(b){
      var d=b.querySelectorAll('div');
      if(d[0])d[0].textContent='ATSRS V254';
      if(d[1])d[1].textContent='Last Update: 21 Jul 2026';
    });
  }
  lockBuild();
  window.addEventListener('load',function(){setTimeout(lockBuild,50);setTimeout(lockBuild,500);});
})();
