/* ATSRS V178 extracted JavaScript batch: app.js. Loaded in original V178 execution order. No placeholder code. */
/* ===== extracted from inline script id=atsrs-v161-single-date-badge-script ===== */
(function(){
  'use strict';
  var BUILD='ATSRS V244';
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
      main.innerHTML='<div>'+BUILD+'</div><div>'+UPDATE+'</div>';
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
  setInterval(run,900);
  if(window.MutationObserver){
    var root=document.getElementById('auth')||document.body;
    var mo=new MutationObserver(function(){setTimeout(run,0);});
    mo.observe(root,{childList:true,subtree:true,characterData:true});
  }
})();

/* ===== extracted from inline script id=ATSRS_V166_REFS_DASH_FRAMELESS_COMPACT_JS ===== */
(function(){
  'use strict';
  var BUILD='ATSRS V244';
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
  function byId(id){return document.getElementById(id);}
  function setText(id,value){var el=byId(id); if(el) el.textContent=value;}
  function q(sel,root){return (root||document).querySelector(sel);}
  function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}

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
    setText('addCertBtn','Save Document');
    ['manualFormAlert','manualFilePreview'].forEach(function(id){var el=byId(id); if(el){el.classList&&el.classList.remove('active'); el.textContent='';}});
  }

  function openManual(){
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
    setText('thCertificate2','Certificate');
    setText('thProvider2','Training Center / Provider');
    setText('thExpiry2','Expiry');
    setText('thStatus2','Status');
    setText('thAction2','Action');
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
    ['cDocNo','cCountry','cProvider','cIssue','cExpiry'].forEach(function(id){var el=byId(id); if(el)el.value='';});
    var t=byId('cType'); if(t)t.value='';
    var f=byId('manualFile'); if(f)f.value='';
    var p=byId('manualFilePreview'); if(p)p.textContent='';
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
    editIndex=i; openManual();
    var cp=byId('cPerson'); if(cp&&x.person)cp.value=x.person;
    var t=byId('cType'); if(t)t.value=x.type||'';
    var n=byId('cDocNo'); if(n)n.value=x.docNo||'';
    var co=byId('cCountry'); if(co)co.value=x.country||'';
    var pr=byId('cProvider'); if(pr)pr.value=x.provider||'';
    var is=byId('cIssue'); if(is)is.value=x.issue||'';
    var ex=byId('cExpiry'); if(ex)ex.value=x.expiry||'';
    setText('addCertBtn','Update Document');
    setTimeout(function(){var panel=byId('certManualPanel'); if(panel)panel.scrollIntoView({behavior:'smooth',block:'start'});},60);
  };

  window.addCertificate=async function(){
    if(typeof validateManualCertificateForm==='function' && !validateManualCertificateForm())return;
    var a=(typeof getData==='function'?getData('certs'):[])||[];
    var previous=editIndex!==null?a[editIndex]:null;
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
    try{
      var file=window.atsrsPendingCertificateFile;
      if(file){
        if(!window.atsrsCloudData||typeof window.atsrsCloudData.uploadDocument!=='function')throw new Error('ATSRS cloud storage is not ready.');
        uploadedRow=await window.atsrsCloudData.uploadDocument(file,{document:item});
        item.cloudFileId=uploadedRow.id;item.fileName=uploadedRow.file_name;item.mimeType=uploadedRow.mime_type;item.fileSize=uploadedRow.size_bytes;
      }else if(item.cloudFileId&&window.atsrsCloudData&&typeof window.atsrsCloudData.updateDocumentMetadata==='function'){
        await window.atsrsCloudData.updateDocumentMetadata(item.cloudFileId,{document:item});
      }
      if(editIndex!==null&&a[editIndex])a[editIndex]=item;else a.push(item);
      if(typeof saveData==='function')saveData('certs',a);
      if(window.atsrsCloudData&&typeof window.atsrsCloudData.flush==='function'&&!(await window.atsrsCloudData.flush()))throw new Error('Document details could not be saved.');
      if(file&&previous&&previous.cloudFileId&&previous.cloudFileId!==item.cloudFileId&&window.atsrsCloudData&&typeof window.atsrsCloudData.deleteDocument==='function'){
        await window.atsrsCloudData.deleteDocument(previous.cloudFileId);
      }
      editIndex=null;clearForm();closeManual();
      if(typeof clearManualValidation==='function')clearManualValidation();
      if(typeof renderAll==='function')renderAll();
    }catch(error){
      console.error('ATSRS document save failed',error);
      if(uploadedRow&&window.atsrsCloudData&&typeof window.atsrsCloudData.deleteDocument==='function'){
        try{await window.atsrsCloudData.deleteDocument(uploadedRow.id);}catch(cleanupError){console.error('ATSRS orphan document cleanup failed',cleanupError);}
      }
      alert('The document was not saved to the ATSRS server. Check the connection and try again.');
    }finally{
      if(button){button.disabled=false;button.textContent=oldText||'Save Document';}
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
      if(typeof renderAll==='function')window.renderAll();
    }catch(error){
      console.error('ATSRS document delete failed',error);
      alert('The document could not be deleted from the ATSRS server.');
    }
  };

  function renderCertRows(){
    if(typeof currentUser==='undefined' || !currentUser)return;
    if(!byId('certTable') || typeof getData!=='function' || typeof status!=='function')return;
    var c=getData('certs')||[];
    var html='';
    c.forEach(function(x,i){
      var st=status(x.expiry);
      html+='<tr><td>'+esc(x.type||'')+'</td><td>'+esc(x.provider||'')+'</td><td>'+esc(x.expiry||'')+'</td><td class="'+esc(st.cls||'')+'">'+esc(st.txt||'')+'</td><td>'+
        '<button class="secondary" onclick="atsrsV172PreviewCert('+i+')">Preview</button>'+
        '<button class="secondary" onclick="atsrsV172EditCert('+i+')">Edit</button>'+
        '<button class="secondary atsrs-v172-delete" onclick="deleteCert('+i+')">Delete</button>'+
      '</td></tr>';
    });
    byId('certTable').innerHTML=html;
  }

  function stableDocuments(){
    cleanTopAndLang(); fixLabels(); wireMethods();
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
      if(d[0])d[0].textContent='ATSRS V244';
      if(d[1])d[1].textContent='Last Update: 21 Jul 2026';
    });
  }
  lockBuild();
  window.addEventListener('load',function(){setTimeout(lockBuild,50);setTimeout(lockBuild,500);});
})();
