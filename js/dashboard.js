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
    var docStatus=byId('docStatusTitle'); if(docStatus){var panel=docStatus.closest('.panel'); if(panel) panel.remove();}
    var totalCertsText=byId('totalCertsText'); if(totalCertsText) totalCertsText.textContent='Uploaded Documents';
    var soloBadge=byId('soloBadge'); if(soloBadge) soloBadge.textContent='DOCUMENT OVERVIEW';
    var soloHeroTitle=byId('soloHeroTitle'); if(soloHeroTitle) soloHeroTitle.textContent='Your document dashboard';
    var soloHeroText=byId('soloHeroText'); if(soloHeroText) soloHeroText.textContent='Review document totals, expiry risk and profile readiness from one clear view.';
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
  var BUILD='ATSRS V364';
  var UPDATE='Last Update: 27 Jul 2026';
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
  atsrsStableInterval(function(){lockBuild();cleanTopbar();},1200);
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
  var PHONE_COUNTRIES=[
    ['AZ','+994'],['US','+1'],['GB','+44'],['AE','+971'],['SA','+966'],['QA','+974'],['KW','+965'],['BH','+973'],['OM','+968'],['TR','+90'],
    ['GE','+995'],['KZ','+7'],['NO','+47'],['NL','+31'],['DE','+49'],['FR','+33'],['ES','+34'],['IT','+39'],['GR','+30'],['RO','+40'],
    ['BG','+359'],['UA','+380'],['IN','+91'],['PK','+92'],['BD','+880'],['LK','+94'],['NP','+977'],['PH','+63'],['ID','+62'],['MY','+60'],
    ['SG','+65'],['TH','+66'],['VN','+84'],['CN','+86'],['JP','+81'],['KR','+82'],['AU','+61'],['NZ','+64'],['ZA','+27'],['EG','+20'],
    ['NG','+234'],['GH','+233'],['KE','+254'],['BR','+55'],['AR','+54'],['MX','+52'],['GQ','+240']
  ];
  var PHONE_CODES=PHONE_COUNTRIES.map(function(item){return item[1]});
  function flagUrl(iso){
    return 'https://flagcdn.com/24x18/'+String(iso||'az').toLowerCase()+'.png';
  }
  function applyPhoneFlag(el,iso){
    if(!el)return;
    el.textContent='';
    el.style.backgroundImage='url("'+flagUrl(iso)+'")';
    el.setAttribute('aria-label',String(iso||'').toUpperCase()+' flag');
  }
  function phoneCountryForCode(code){
    return PHONE_COUNTRIES.filter(function(item){return item[1]===code})[0]||PHONE_COUNTRIES[0];
  }
  function cleanPhonePart(value){return String(value||'').replace(/[^\d]/g,'').trim();}
  function splitPhone(value,fallbackCode){
    var text=String(value||'').trim();
    var compact=text.replace(/[\s().-]/g,'');
    var found=PHONE_CODES.filter(function(code){return compact.indexOf(code)===0}).sort(function(a,b){return b.length-a.length})[0];
    if(found)return {code:found,local:cleanPhonePart(compact.slice(found.length))};
    return {code:fallbackCode||val('profilePhoneCountryCode')||'+994',local:cleanPhonePart(text)};
  }
  function updatePhoneHidden(prefix){
    prefix=prefix||'profilePhone';
    var code=val(prefix+'CountryCode')||'+994';
    var local=cleanPhonePart(val(prefix+'Local'));
    setVal(prefix,local?code+local:'');
    return {code:code,local:local,full:local?code+local:''};
  }
  function normalizePhoneCode(value){
    var raw=String(value||'').replace(/[^\d+]/g,'');
    if(!raw)return '+';
    if(raw.charAt(0)!=='+')raw='+'+raw.replace(/\+/g,'');
    return raw;
  }
  function syncPhonePicker(select){
    if(!select||!select.__atsrsPicker)return;
    var code=select.value||'+994';
    var country=phoneCountryForCode(code);
    applyPhoneFlag(select.__atsrsPicker.flag,country[0]);
    if(!select.__atsrsPicker.input.matches(':focus'))select.__atsrsPicker.input.value=code;
  }
  function filterPhoneCountries(query){
    var raw=normalizePhoneCode(query);
    var digits=raw.replace(/[^\d]/g,'');
    var list=PHONE_COUNTRIES.filter(function(item){
      var codeDigits=item[1].replace(/[^\d]/g,'');
      return !digits||codeDigits.indexOf(digits)===0||codeDigits.indexOf(digits)>=0;
    });
    return list.length?list:PHONE_COUNTRIES;
  }
  function closePhoneMenus(except){
    document.querySelectorAll('.phone-code-menu').forEach(function(menu){
      if(menu!==except)menu.classList.add('hidden');
    });
  }
  function renderPhoneMenu(select,query){
    if(!select||!select.__atsrsPicker)return;
    var picker=select.__atsrsPicker,menu=picker.menu,list=picker.list;
    list.innerHTML='';
    filterPhoneCountries(query).slice(0,40).forEach(function(item){
      var button=document.createElement('button');
      button.type='button';
      button.className='phone-code-option';
      var flag=document.createElement('span');
      flag.className='phone-code-flag';
      applyPhoneFlag(flag,item[0]);
      var code=document.createElement('span');
      code.textContent=item[1];
      button.appendChild(flag);
      button.appendChild(code);
      button.addEventListener('mousedown',function(event){event.preventDefault();});
      button.addEventListener('click',function(){
        select.value=item[1];
        syncPhonePicker(select);
        updatePhoneHidden(select.id.indexOf('Whatsapp')>=0?'profileWhatsapp':'profilePhone');
        menu.classList.add('hidden');
      });
      list.appendChild(button);
    });
    closePhoneMenus(menu);
    menu.classList.remove('hidden');
  }
  function ensurePhonePicker(select){
    if(!select||select.__atsrsPicker)return;
    var field=select.closest('.phone-field');
    if(!field)return;
    var picker=document.createElement('div');
    picker.className='phone-code-picker';
    picker.innerHTML='<div class="phone-code-display"><span class="phone-code-flag" aria-hidden="true"></span><input class="phone-code-inline" inputmode="tel" autocomplete="off" aria-label="Country calling code"><span class="phone-code-arrow" aria-hidden="true">&#8964;</span></div><div class="phone-code-menu hidden"><div class="phone-code-list"></div></div>';
    field.insertBefore(picker,select);
    select.__atsrsPicker={
      root:picker,
      flag:picker.querySelector('.phone-code-display .phone-code-flag'),
      input:picker.querySelector('.phone-code-inline'),
      menu:picker.querySelector('.phone-code-menu'),
      list:picker.querySelector('.phone-code-list')
    };
    syncPhonePicker(select);
    select.__atsrsPicker.input.addEventListener('focus',function(){
      renderPhoneMenu(select,select.__atsrsPicker.input.value||select.value);
    });
    select.__atsrsPicker.input.addEventListener('click',function(){
      renderPhoneMenu(select,select.__atsrsPicker.input.value||select.value);
    });
    select.__atsrsPicker.input.addEventListener('input',function(){
      var next=normalizePhoneCode(select.__atsrsPicker.input.value);
      select.__atsrsPicker.input.value=next;
      var exact=PHONE_CODES.indexOf(next)>=0;
      if(exact){
        select.value=next;
        var country=phoneCountryForCode(next);
        applyPhoneFlag(select.__atsrsPicker.flag,country[0]);
        updatePhoneHidden(select.id.indexOf('Whatsapp')>=0?'profileWhatsapp':'profilePhone');
      }
      renderPhoneMenu(select,next);
    });
    select.__atsrsPicker.input.addEventListener('keydown',function(event){
      if(event.key==='Escape')select.__atsrsPicker.menu.classList.add('hidden');
    });
    select.__atsrsPicker.root.addEventListener('mousedown',function(event){
      if(event.target===select.__atsrsPicker.root||event.target.classList.contains('phone-code-display')||event.target.classList.contains('phone-code-flag')||event.target.classList.contains('phone-code-arrow')){
        setTimeout(function(){select.__atsrsPicker.input.focus();},0);
      }
    });
  }
  function ensurePhonePickers(){
    ['profilePhoneCountryCode','profileWhatsappCountryCode'].forEach(function(id){
      ensurePhonePicker(byId(id));
    });
  }
  function setVerificationText(id,verified){
    var el=byId(id);if(!el)return;
    el.textContent=verified?'Verified':'Not verified';
    el.classList.toggle('is-verified',!!verified);
  }
  function bindOfficialProfileControls(){
    ensurePhonePickers();
    ['profilePhoneCountryCode','profilePhoneLocal','profileWhatsappCountryCode','profileWhatsappLocal'].forEach(function(id){
      var el=byId(id);if(!el||el.__atsrsOfficialBound)return;
      el.__atsrsOfficialBound=true;
      el.addEventListener(id.indexOf('Local')>=0?'input':'change',function(){
        updatePhoneHidden(id.indexOf('Whatsapp')>=0?'profileWhatsapp':'profilePhone');
        if(id.indexOf('CountryCode')>=0)syncPhonePicker(el);
      });
    });
    document.querySelectorAll('[data-profile-verify]').forEach(function(button){
      if(button.__atsrsVerifyBound)return;
      button.__atsrsVerifyBound=true;
      button.addEventListener('click',function(){
        var target=button.getAttribute('data-profile-verify')==='whatsapp'?'WhatsApp':'mobile phone';
        alert(target+' verification will be connected after ATSRS adds an approved SMS / WhatsApp OTP provider. The number is saved now, but it will not be marked verified until a real code is confirmed.');
      });
    });
  }
  function normalizeWorkPreferences(values){
    var allowed=['any','freelance','contract','permanent'];
    var next=(Array.isArray(values)?values:[values]).filter(function(value,index,list){
      return allowed.indexOf(value)>=0&&list.indexOf(value)===index;
    });
    if(next.indexOf('any')>=0)return ['any'];
    return next.length?next:['any'];
  }
  function selectedWorkPreferences(){
    var root=byId('profileWorkPreferences');
    if(!root)return ['any'];
    return normalizeWorkPreferences(root.dataset.value||'any').slice(0,1);
  }
  function workPreferencesText(values){
    var labels={any:'Any opportunity',freelance:'Freelance',contract:'Contract',permanent:'Permanent'};
    return normalizeWorkPreferences(values).map(function(value){return labels[value]||value}).join(', ');
  }
  function updateWorkPreferencesSummary(root){
    root=root||byId('profileWorkPreferences');
    if(!root)return;
    var summary=byId('profileWorkPreferencesSummary');
    var selected=normalizeWorkPreferences(root.dataset.value||'any').slice(0,1);
    if(summary)summary.textContent=workPreferencesText(selected);
    root.querySelectorAll('[data-work-preference-value]').forEach(function(option){
      option.setAttribute('aria-selected',option.dataset.workPreferenceValue===selected[0]?'true':'false');
    });
  }
  function setWorkPreferencesMenu(root,open){
    root=root||byId('profileWorkPreferences');
    if(!root)return;
    var toggle=byId('profileWorkPreferencesToggle'),menu=byId('profileWorkPreferencesMenu');
    if(!toggle||!menu)return;
    menu.classList.toggle('hidden',!open);
    toggle.setAttribute('aria-expanded',open?'true':'false');
  }
  function setWorkPreferences(values){
    var root=byId('profileWorkPreferences'),next=normalizeWorkPreferences(values);
    if(!root)return;
    root.dataset.value=next[0]||'any';
    updateWorkPreferencesSummary(root);
  }
  function bindWorkPreferences(){
    var root=byId('profileWorkPreferences');
    if(!root||root.__atsrsWorkPreferencesBound)return;
    root.__atsrsWorkPreferencesBound=true;
    var toggle=byId('profileWorkPreferencesToggle');
    if(toggle)toggle.addEventListener('click',function(){
      setWorkPreferencesMenu(root,toggle.getAttribute('aria-expanded')!=='true');
    });
    root.addEventListener('click',function(event){
      var option=event.target.closest&&event.target.closest('[data-work-preference-value]');
      if(!option||!root.contains(option))return;
      root.dataset.value=option.dataset.workPreferenceValue||'any';
      updateWorkPreferencesSummary(root);
      setWorkPreferencesMenu(root,false);
      if(toggle)toggle.focus();
      var confirmed=byId('availabilityConfirmationNote');
      if(confirmed)confirmed.textContent='Changes not saved';
    });
    root.addEventListener('keydown',function(event){
      if(event.key==='Escape'){
        setWorkPreferencesMenu(root,false);
        if(toggle)toggle.focus();
      }
    });
    updateWorkPreferencesSummary(root);
  }
  function updateAvailabilityControls(){
    var status=val('profileAvailabilityStatus')||'not_set';
    var dateWrap=byId('profileAvailableFromWrap');
    if(dateWrap)dateWrap.classList.toggle('hidden',status!=='available_from');
    var note=byId('workAvailabilityStatus');
    if(note&&status!=='available_from')note.textContent='';
  }
  function bindAvailabilityControls(){
    bindWorkPreferences();
    var status=byId('profileAvailabilityStatus');
    if(status&&!status.__atsrsAvailabilityBound){
      status.__atsrsAvailabilityBound=true;
      status.addEventListener('change',function(){
        updateAvailabilityControls();
        var confirmed=byId('availabilityConfirmationNote');
        if(confirmed)confirmed.textContent='Changes not saved';
      });
    }
  }
  function ensureProfileStatus(){
    var btn=byId('saveProfileBtn'); if(!btn)return null;
    var status=byId('profileSaveStatus');
    if(!status){status=document.createElement('div');status.id='profileSaveStatus';status.setAttribute('role','status');btn.insertAdjacentElement('afterend',status);}
    return status;
  }
  function showSaved(){
    var s=ensureProfileStatus(); if(!s)return;
    s.textContent='Saved'; s.classList.remove('error'); s.classList.add('active');
    clearTimeout(window.__atsrsV125ProfileSavedTimer);
    window.__atsrsV125ProfileSavedTimer=setTimeout(function(){s.classList.remove('active');},2200);
  }
  function showSaveError(){
    var s=ensureProfileStatus(); if(!s)return;
    s.textContent='Could not save. Check your connection and try again.';
    s.classList.add('error','active');
  }
  window.saveProfile=async function(){
    var availabilityStatus=val('profileAvailabilityStatus')||'not_set';
    var availableFrom=val('profileAvailableFrom');
    var availabilityMessage=byId('workAvailabilityStatus');
    if(availabilityStatus==='available_from'&&!availableFrom){
      if(availabilityMessage)availabilityMessage.textContent='Select the date when you will be ready to start.';
      return false;
    }
    if(availabilityMessage)availabilityMessage.textContent='';
    var confirmedAt=new Date().toISOString();
    var existing=readJson(PROFILE_KEY,{});
    var phoneParts=updatePhoneHidden('profilePhone');
    var whatsappParts=updatePhoneHidden('profileWhatsapp');
    var data={
      name:val('profileName'),surname:val('profileSurname'),phone:phoneParts.full,
      phoneCountryCode:phoneParts.code,phoneLocal:phoneParts.local,phoneVerified:!!existing.phoneVerified,
      whatsapp:whatsappParts.full,
      whatsappCountryCode:whatsappParts.code,whatsappLocal:whatsappParts.local,whatsappVerified:!!existing.whatsappVerified,
      country:val('profileCountry'),
      company:val('profileCompany'),position:val('profilePosition'),
      zipCode:val('profileZipCode'),birthDate:val('profileBirthDate'),address:val('profileAddress'),
      avatarUrl:existing.avatarUrl||'',
      avatarPath:existing.avatarPath||'',
      avatarSource:existing.avatarSource||'',
      timezone:val('profileTimezone')||'UTC',visibility:val('profileVisibility')||'Private',
      availabilityStatus:availabilityStatus,
      availableFrom:availabilityStatus==='available_from'?availableFrom:'',
      workPreferences:selectedWorkPreferences(),
      workPreference:selectedWorkPreferences()[0]||'any',
      availabilityConfirmedAt:confirmedAt,
      savedAt:confirmedAt
    };
    if(!writeJson(PROFILE_KEY,data)){showSaveError();return false;}
    var saved=window.atsrsCloudData&&typeof window.atsrsCloudData.flush==='function'
      ?await window.atsrsCloudData.flush()
      :true;
    if(saved){
      var confirmed=byId('availabilityConfirmationNote');
      if(confirmed)confirmed.textContent=availabilityStatus==='not_set'?'Not specified':'Confirmed now';
      showSaved();return true;
    }
    showSaveError();return false;
  };
  window.loadProfile=function(){
    try{ if(typeof window.fillCountries==='function') window.fillCountries(); }catch(e){}
    var p=readJson(PROFILE_KEY,{});
    var phone=splitPhone(p.phone||((p.phoneCountryCode||'')+(p.phoneLocal||'')),p.phoneCountryCode||'+994');
    var whatsapp=splitPhone(p.whatsapp||((p.whatsappCountryCode||'')+(p.whatsappLocal||'')),p.whatsappCountryCode||p.phoneCountryCode||'+994');
    setVal('profileName',p.name); setVal('profileSurname',p.surname);
    setVal('profilePhoneCountryCode',p.phoneCountryCode||phone.code||'+994');
    setVal('profilePhoneLocal',p.phoneLocal||phone.local||'');
    syncPhonePicker(byId('profilePhoneCountryCode'));
    updatePhoneHidden('profilePhone');
    setVal('profileWhatsappCountryCode',p.whatsappCountryCode||whatsapp.code||p.phoneCountryCode||'+994');
    setVal('profileWhatsappLocal',p.whatsappLocal||whatsapp.local||'');
    syncPhonePicker(byId('profileWhatsappCountryCode'));
    updatePhoneHidden('profileWhatsapp');
    setVal('profileCountry',p.country);
    setVal('profileCompany',p.company); setVal('profilePosition',p.position);
    setVal('profileZipCode',p.zipCode); setVal('profileBirthDate',p.birthDate); setVal('profileAddress',p.address);
    setVerificationText('profilePhoneVerifiedText',!!p.phoneVerified);
    setVerificationText('profileWhatsappVerifiedText',!!p.whatsappVerified);
    setVal('profileTimezone',p.timezone||'UTC'); setVal('profileVisibility',p.visibility||'Private');
    setVal('profileAvailabilityStatus',p.availabilityStatus||'not_set');
    setVal('profileAvailableFrom',p.availableFrom||'');
    setWorkPreferences(p.workPreferences||p.workPreference||'any');
    bindAvailabilityControls();updateAvailabilityControls();
    var confirmed=byId('availabilityConfirmationNote');
    if(confirmed){
      confirmed.textContent=p.availabilityStatus&&p.availabilityStatus!=='not_set'&&p.availabilityConfirmedAt
        ?'Confirmed '+new Date(p.availabilityConfirmedAt).toLocaleDateString()
        :'Not confirmed';
    }
    if(window.atsrsProfilePhoto&&typeof window.atsrsProfilePhoto.render==='function'){
      window.atsrsProfilePhoto.render(p);
    }
    ensureProfileStatus();
    bindOfficialProfileControls();
  };
  document.addEventListener('click',function(event){
    if(!event.target.closest||!event.target.closest('.phone-code-picker'))closePhoneMenus();
    if(!event.target.closest||!event.target.closest('#profileWorkPreferences'))setWorkPreferencesMenu(null,false);
  });
  window.atsrsUpdateAvailabilityControls=updateAvailabilityControls;
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bindAvailabilityControls);
  else bindAvailabilityControls();
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
    card.innerHTML='<div class="cv-card-head"><h3 id="coverLetterCardTitle">Cover Letter</h3><span id="coverLetterStatusBadge" class="badge badge-missing">No File</span></div>'+
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
    if(badge){badge.textContent=files.length?String(files.length)+' file'+(files.length>1?'s':''):'No File';badge.className='badge '+(files.length?'badge-ready':'badge-missing');}
    if(info){info.innerHTML=files.length?files.slice(0,5).map(function(f){return '<div>'+String(f.name||'File').replace(/[<>&]/g,'')+' · '+Math.round((f.size||0)/1024)+' KB</div>';}).join(''):'No cover letter uploaded yet.';}
  }
  var oldRender=window.renderAll;
  if(typeof oldRender==='function') window.renderAll=function(){var r=oldRender.apply(this,arguments); renderCoverLetter(); forceFlagOnly(); return r;};
  var oldShow=window.showPage;
  if(typeof oldShow==='function') window.showPage=function(){var r=oldShow.apply(this,arguments); if(String(arguments[0]||'')==='refs'||byId('refsPage'))setTimeout(renderCoverLetter,40); if(String(arguments[0]||'')==='profile')setTimeout(window.loadProfile,40); forceFlagOnly(); return r;};
  document.addEventListener('DOMContentLoaded',function(){ensureProfileStatus(); window.loadProfile(); renderCoverLetter(); forceFlagOnly();});
  window.addEventListener('load',function(){ensureProfileStatus(); window.loadProfile(); renderCoverLetter(); forceFlagOnly();});
  atsrsStableInterval(function(){forceFlagOnly(); if(byId('refsPage')&&!byId('refsPage').classList.contains('hidden'))renderCoverLetter();},1500);
})();

/* ===== extracted from inline script id=ATSRS_V126_LAYOUT_BUTTON_LANG_CLEANUP_JS ===== */
(function(){
  'use strict';
  var BUILD='ATSRS V364';
  var UPDATE='Last Update: 27 Jul 2026';
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
  atsrsStableInterval(run,1500);
})();
