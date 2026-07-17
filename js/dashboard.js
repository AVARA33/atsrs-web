/* ATSRS V178 extracted JavaScript batch: dashboard.js. Loaded in original V178 execution order. No placeholder code. */
/* ===== ATSRS V205: test login placement disabled ===== */
(function(){
  'use strict';
  function removeTestLogin(){
    ['atsrsV113TestLoginGroup','atsrsV115TestLoginGroup','atsrsV117TestLoginGroup','localTestBtn'].forEach(function(id){
      var el=document.getElementById(id);
      if(el) el.remove();
    });
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',removeTestLogin);else removeTestLogin();
  window.addEventListener('load',removeTestLogin);
  [50,150,400,900,1600,2600].forEach(function(ms){setTimeout(removeTestLogin,ms);});
})();


/* ===== extracted from inline script ===== */
/* V118 dashboard simplification and account badge sync */
(function(){
  function byId(id){return document.getElementById(id);}
  function getMode(){return localStorage.getItem('atsrs_use_mode') || (window.useMode || 'personal');}
  function getEmail(){
    if(window.currentUser && window.currentUser.email) return window.currentUser.email;
    var saved=localStorage.getItem('atsrs_saved_login_email');
    var login=byId('loginEmail');
    return saved || (login && login.value) || 'Not signed in';
  }
  function updateAccountBadge(){
    var type=byId('atsrsAccountTypeLabel');
    var mail=byId('atsrsAccountEmailLabel');
    if(!type || !mail) return;
    var mode=getMode();
    type.textContent = mode === 'company' ? '' : '';
    mail.textContent = getEmail();
  }
  function simplifyDashboard(){
    ['missingDocsText','missingDocs','docStatusTitle','docStatusSub','docCategoryGrid'].forEach(function(id){var el=byId(id); if(el) el.style.display='none';});
    var missingCard=document.querySelector('#dashboardPage .missing-card'); if(missingCard) missingCard.remove();
    var snapMissing=byId('snapMissing'); if(snapMissing){var row=snapMissing.closest('.snapshot-item'); if(row) row.remove();}
    var docStatus=byId('docStatusTitle'); if(docStatus){var panel=docStatus.closest('.panel'); if(panel) panel.remove();}
    var totalCertsText=byId('totalCertsText'); if(totalCertsText) totalCertsText.textContent='Uploaded Documents';
    var soloHeroTitle=byId('soloHeroTitle'); if(soloHeroTitle) soloHeroTitle.textContent='Your document overview';
    var soloHeroText=byId('soloHeroText'); if(soloHeroText) soloHeroText.textContent='Keep your uploaded documents and expiry dates in one clean view.';
    var snapshotTitle=byId('snapshotTitle'); if(snapshotTitle) snapshotTitle.textContent='Quick overview';
  }
  var oldOpen=window.openApp;
  if(typeof oldOpen==='function'){
    window.openApp=function(){ oldOpen.apply(this,arguments); setTimeout(function(){updateAccountBadge(); simplifyDashboard();},0); };
  }
  var oldRender=window.renderAll;
  if(typeof oldRender==='function'){
    window.renderAll=function(){ oldRender.apply(this,arguments); simplifyDashboard(); updateAccountBadge(); };
  }
  document.addEventListener('DOMContentLoaded',function(){setTimeout(function(){updateAccountBadge(); simplifyDashboard();},80);});
})();

/* ===== extracted from inline script id=ATSRS_V119_BUILD_AND_TOPBAR_LOCK ===== */
(function(){
  var BUILD='ATSRS V231';
  var UPDATE='Last Update: 17 Jul 2026';
  function lockBuild(){
    var b=document.getElementById('buildBadge');
    if(!b)return;
    var d=b.querySelectorAll('div');
    if(d[0])d[0].textContent=BUILD;
    if(d[1])d[1].textContent=UPDATE;
    if(d[2])d[2].textContent='TEST BUILD';
  }
  function cleanTopbar(){
    var badge=document.getElementById('atsrsAccountBadge');
    var type=document.getElementById('atsrsAccountTypeLabel');
    var email=document.getElementById('atsrsAccountEmailLabel');
    var mode='';
    if(type) type.textContent=mode;
    if(email && (!email.textContent || /local-test|undefined|null/i.test(email.textContent))) {
      var stored=localStorage.getItem('atsrsUserEmail') || localStorage.getItem('atsrsEmail') || localStorage.getItem('email') || 'local-test@atsrs.com';
      email.textContent=stored;
    }
    if(badge){badge.removeAttribute('style');}
    var logout=document.getElementById('topLogoutBtn');
    if(logout){logout.removeAttribute('style');logout.textContent='Exit';}
  }
  ['DOMContentLoaded','load'].forEach(function(evt){window.addEventListener(evt,function(){lockBuild();cleanTopbar();setTimeout(cleanTopbar,300);});});
  setInterval(function(){lockBuild();cleanTopbar();},1200);
})();

/* ===== extracted from inline script id=ATSRS_V125_ACCOUNT_REFS_LANG_CLEANUP_JS ===== */
/* V125: stabilize current pages before new features */
(function(){
  'use strict';
  var PROFILE_KEY='profile';
  function byId(id){return document.getElementById(id)}
  function safeUserId(){
    try{return (window.currentUser&&currentUser.id)?currentUser.id:'local_test_user';}
    catch(e){return 'local_test_user';}
  }
  function key(name){
    try{ if(typeof window.localKey==='function' && window.currentUser && currentUser.id) return window.localKey(name); }
    catch(e){}
    return 'atsrs_'+safeUserId()+'_'+name;
  }
  function readJson(name, fallback){
    try{
      var storageKey=key(name);
      var raw=window.atsrsCloudData&&window.atsrsCloudData.isManagedKey(storageKey)
        ?window.atsrsCloudData.read(storageKey)
        :localStorage.getItem(storageKey);
      return raw?JSON.parse(raw):fallback;
    }
    catch(e){return fallback;}
  }
  function writeJson(name, data){
    try{
      var storageKey=key(name),value=JSON.stringify(data);
      if(window.atsrsCloudData&&window.atsrsCloudData.isManagedKey(storageKey)){
        return window.atsrsCloudData.write(storageKey,value);
      }
      localStorage.setItem(storageKey,value);
      return true;
    }
    catch(e){return false;}
  }
  function val(id){var e=byId(id); return e?e.value:'';}
  function setVal(id,v){var e=byId(id); if(e)e.value=v||'';}
  function ensureProfileStatus(){
    var btn=byId('saveProfileBtn'); if(!btn)return null;
    var status=byId('profileSaveStatus');
    if(!status){status=document.createElement('div');status.id='profileSaveStatus';status.setAttribute('role','status');btn.insertAdjacentElement('afterend',status);}
    return status;
  }
  function showSaved(){
    var s=ensureProfileStatus(); if(!s)return;
    s.textContent='Saved ✓'; s.classList.add('active');
    clearTimeout(window.__atsrsV125ProfileSavedTimer);
    window.__atsrsV125ProfileSavedTimer=setTimeout(function(){s.classList.remove('active');},2200);
  }
  function showSaveError(){
    var s=ensureProfileStatus(); if(!s)return;
    s.textContent='Not saved — check connection'; s.classList.add('active');
  }
  window.saveProfile=async function(){
    var data={
      name:val('profileName'),surname:val('profileSurname'),phone:val('profilePhone'),country:val('profileCountry'),
      company:val('profileCompany'),position:val('profilePosition'),altEmail:val('profileAltEmail'),
      timezone:val('profileTimezone')||'UTC',visibility:val('profileVisibility')||'Private',savedAt:new Date().toISOString()
    };
    if(!writeJson(PROFILE_KEY,data)){showSaveError();return false;}
    var saved=window.atsrsCloudData&&typeof window.atsrsCloudData.flush==='function'
      ?await window.atsrsCloudData.flush()
      :true;
    if(saved){showSaved();return true;}
    showSaveError();return false;
  };
  window.loadProfile=function(){
    try{ if(typeof window.fillCountries==='function') window.fillCountries(); }catch(e){}
    var p=readJson(PROFILE_KEY,{});
    setVal('profileName',p.name); setVal('profileSurname',p.surname); setVal('profilePhone',p.phone); setVal('profileCountry',p.country);
    setVal('profileCompany',p.company); setVal('profilePosition',p.position); setVal('profileAltEmail',p.altEmail);
    setVal('profileTimezone',p.timezone||'UTC'); setVal('profileVisibility',p.visibility||'Private'); ensureProfileStatus();
  };
  function forceFlagOnly(){
    ['langCircle','appLangCircle'].forEach(function(id){var b=byId(id); if(b){b.textContent=''; b.setAttribute('aria-label','Language'); b.removeAttribute('title');}});
    document.querySelectorAll('.lang-menu button[data-lang="en"]').forEach(function(b){
      b.childNodes.forEach(function(n){ if(n.nodeType===3)n.textContent=''; });
      var s=b.querySelector('span'); if(s)s.textContent='🇬🇧';
    });
  }
  var oldApply=window.applyLanguage;
  if(typeof oldApply==='function') window.applyLanguage=function(){var r=oldApply.apply(this,arguments); forceFlagOnly(); return r;};
  function coverFiles(){return readJson('coverLetterFiles',[]);}
  function saveCoverFiles(arr){writeJson('coverLetterFiles',Array.isArray(arr)?arr:[]);}
  function firstCover(){var a=coverFiles();return a&&a.length?a[0]:null;}
  function ensureCoverLetterCard(){
    if(byId('coverLetterCard'))return;
    var cv=byId('cvCardTitle'); var cvCard=cv?cv.closest('.ref-card'):null; var grid=cvCard?cvCard.parentElement:document.querySelector('#refsPage .ref-grid'); if(!grid)return;
    var card=document.createElement('div'); card.className='ref-card cover-letter-card'; card.id='coverLetterCard';
    card.innerHTML='<div class="cv-card-head"><h3 id="coverLetterCardTitle">Cover Letter</h3><span id="coverLetterStatusBadge" class="badge badge-blocked">No File</span></div>'+
      '<p class="sub">Store cover letter versions next to your CV for faster applications.</p>'+
      '<input id="coverLetterUploadInput" type="file" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" class="hidden" multiple>'+
      '<div id="coverLetterFileInfo" class="preview-box"></div>'+
      '<div class="cv-actions"><button id="uploadCoverLetterBtn" class="secondary">Upload</button><button id="previewCoverLetterBtn" class="secondary">Preview</button><button id="downloadCoverLetterBtn" class="secondary">Download</button><button id="deleteCoverLetterBtn" class="action">Delete</button></div>';
    if(cvCard&&cvCard.nextSibling)cvCard.parentNode.insertBefore(card,cvCard.nextSibling); else grid.appendChild(card);
    byId('uploadCoverLetterBtn').onclick=function(){byId('coverLetterUploadInput').click();};
    byId('previewCoverLetterBtn').onclick=previewCoverLetter;
    byId('downloadCoverLetterBtn').onclick=downloadCoverLetter;
    byId('deleteCoverLetterBtn').onclick=deleteCoverLetter;
    byId('coverLetterUploadInput').onchange=handleCoverLetterUpload;
  }
  window.handleCoverLetterUpload=function(event){
    var files=event.target.files||[]; if(!files.length)return;
    var remaining=files.length, saved=coverFiles();
    Array.prototype.forEach.call(files,function(file){
      var reader=new FileReader();
      reader.onload=function(){saved.unshift({id:Date.now()+'_'+Math.random().toString(36).slice(2),name:file.name,type:file.type||'application/octet-stream',size:file.size,updated:new Date().toISOString(),data:reader.result}); if(--remaining===0){saveCoverFiles(saved);event.target.value='';renderCoverLetter();}};
      reader.readAsDataURL(file);
    });
  };
  window.previewCoverLetter=function(){var f=firstCover(); if(!f){alert('No cover letter uploaded yet.');return;} var w=window.open('','_blank'); if(w){w.document.write('<title>'+String(f.name||'Cover Letter').replace(/[<>]/g,'')+'</title><iframe src="'+f.data+'" style="border:0;width:100%;height:100vh"></iframe>');w.document.close();}};
  window.downloadCoverLetter=function(){var f=firstCover(); if(!f){alert('No cover letter uploaded yet.');return;} var a=document.createElement('a');a.href=f.data;a.download=f.name||'ATSRS-cover-letter';document.body.appendChild(a);a.click();a.remove();};
  window.deleteCoverLetter=function(){saveCoverFiles([]);renderCoverLetter();};
  function renderCoverLetter(){
    ensureCoverLetterCard(); var files=coverFiles(); var badge=byId('coverLetterStatusBadge'), info=byId('coverLetterFileInfo');
    if(badge){badge.textContent=files.length?String(files.length)+' file'+(files.length>1?'s':''):'No File';badge.className='badge '+(files.length?'badge-ready':'badge-blocked');}
    if(info){info.innerHTML=files.length?files.slice(0,5).map(function(f){return '<div>'+String(f.name||'File').replace(/[<>&]/g,'')+' • '+Math.round((f.size||0)/1024)+' KB</div>';}).join(''):'No cover letter uploaded yet.';}
  }
  var oldRender=window.renderAll;
  if(typeof oldRender==='function') window.renderAll=function(){var r=oldRender.apply(this,arguments); renderCoverLetter(); forceFlagOnly(); return r;};
  var oldShow=window.showPage;
  if(typeof oldShow==='function') window.showPage=function(){var r=oldShow.apply(this,arguments); if(String(arguments[0]||'')==='refs'||byId('refsPage'))setTimeout(renderCoverLetter,40); if(String(arguments[0]||'')==='profile')setTimeout(window.loadProfile,40); forceFlagOnly(); return r;};
  document.addEventListener('DOMContentLoaded',function(){ensureProfileStatus(); window.loadProfile(); renderCoverLetter(); forceFlagOnly();});
  window.addEventListener('load',function(){ensureProfileStatus(); window.loadProfile(); renderCoverLetter(); forceFlagOnly();});
  setInterval(function(){forceFlagOnly(); if(byId('refsPage')&&!byId('refsPage').classList.contains('hidden'))renderCoverLetter();},1500);
})();

/* ===== extracted from inline script id=ATSRS_V126_LAYOUT_BUTTON_LANG_CLEANUP_JS ===== */
(function(){
  'use strict';
  var BUILD='ATSRS V231';
  var UPDATE='Last Update: 17 Jul 2026';
  function byId(id){return document.getElementById(id);}
  function applyBuild(){
    document.querySelectorAll('.build-badge').forEach(function(b){
      var d=b.querySelectorAll('div');
      if(d[0])d[0].textContent=BUILD;
      if(d[1])d[1].textContent=UPDATE;
      if(d[2])d[2].textContent='TEST BUILD';
    });
  }
  function forceFlagOnly(){
    ['langCircle','appLangCircle'].forEach(function(id){
      var b=byId(id);
      if(!b)return;
      b.textContent='';
      b.innerHTML='';
      b.setAttribute('aria-label','Language');
      b.removeAttribute('title');
    });
    document.querySelectorAll('.lang-menu button[data-lang="en"]').forEach(function(b){
      b.innerHTML='';
      b.setAttribute('aria-label','English');
      b.setAttribute('title','English');
    });
  }
  function ensureCoverAfterCv(){
    var grid=document.querySelector('#refsPage .ref-grid');
    var cv=byId('cvCardTitle');
    var cvCard=cv?cv.closest('.ref-card'):document.querySelector('#refsPage .cv-card');
    var cover=byId('coverLetterCard');
    if(grid&&cvCard&&cover&&cover.previousElementSibling!==cvCard){
      grid.insertBefore(cover,cvCard.nextSibling);
    }
  }
  function classifyRefCards(){
    var grid=document.querySelector('#refsPage .ref-grid'); if(!grid)return;
    var cards=[].slice.call(grid.children).filter(function(x){return x.classList&&x.classList.contains('ref-card');});
    cards.forEach(function(card){card.style.removeProperty('grid-column');});
    var cv=byId('cvCardTitle');
    var cvCard=cv?cv.closest('.ref-card'):document.querySelector('#refsPage .cv-card');
    if(cvCard){cvCard.classList.add('cv-card');cvCard.style.order='-100';}
    var cover=byId('coverLetterCard'); if(cover)cover.style.order='40';
    var app=byId('appraisalCardTitle'); if(app&&app.closest('.ref-card'))app.closest('.ref-card').style.order='10';
    var ref=byId('referenceCardTitle'); if(ref&&ref.closest('.ref-card'))ref.closest('.ref-card').style.order='20';
    var rec=byId('recommendationCardTitle'); if(rec&&rec.closest('.ref-card'))rec.closest('.ref-card').style.order='30';
  }
  function calmDashboardButtons(){
    document.querySelectorAll('#dashboardPage button').forEach(function(b){
      b.classList.add('atsrs-v126-calm-dashboard-button');
    });
  }
  function run(){applyBuild();forceFlagOnly();ensureCoverAfterCv();classifyRefCards();calmDashboardButtons();}
  var oldApply=window.applyLanguage;
  if(typeof oldApply==='function')window.applyLanguage=function(){var r=oldApply.apply(this,arguments);run();return r;};
  var oldRender=window.renderAll;
  if(typeof oldRender==='function')window.renderAll=function(){var r=oldRender.apply(this,arguments);setTimeout(run,0);return r;};
  var oldShow=window.showPage;
  if(typeof oldShow==='function')window.showPage=function(){var r=oldShow.apply(this,arguments);setTimeout(run,40);setTimeout(run,220);return r;};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run);else run();
  window.addEventListener('load',function(){run();setTimeout(run,500);});
  setInterval(run,1500);
})();
