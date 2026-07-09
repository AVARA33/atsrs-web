/* ATSRS V178 extracted JavaScript batch: login.js. Loaded in original V178 execution order. No placeholder code. */
/* ===== extracted from inline script id=atsrs-v110-clean-register-flow-script ===== */
(function(){
  'use strict';
  var BUILD='ATSRS V210';
  var UPDATE='Last Update: 09 Jul 2026';
  var TEST='TEST BUILD';
  var pendingProvider=null;
  var baseRegister=window.register;
  var baseSocialAuth=window.atsrsSocialAuth;
  var baseSetUseMode=window.setUseMode;
  var baseOpenApp=window.openApp;

  function byId(id){return document.getElementById(id);}
  function currentMode(){
    var p=byId('personalModeBtn'), c=byId('companyModeBtn');
    if(p && p.classList.contains('active')) return 'personal';
    if(c && c.classList.contains('active')) return 'company';
    try{
      var m=window.useMode || localStorage.getItem('atsrs_use_mode') || '';
      return (m==='personal'||m==='company') ? m : '';
    }catch(e){return window.useMode || '';}
  }
  function providerLabel(p){return p==='microsoft'?'Microsoft':p==='linkedin'?'LinkedIn':'Google';}
  function updateBuild(){
    var rows=document.querySelectorAll('.build-badge div');
    if(rows[0])rows[0].textContent=BUILD;
    if(rows[1])rows[1].textContent=UPDATE;
    if(rows[2])rows[2].textContent=TEST;
  }
  function clearOldWarnings(){
    ['modeRule','modeInstruction'].forEach(function(id){var el=byId(id);if(el){el.classList.remove('active');el.style.display='none';}});
    var mc=byId('modeChoiceBox'); if(mc) mc.classList.remove('mode-error');
    ['loginMsg','regMsg'].forEach(function(id){
      var el=byId(id); if(el && /Select Personal or Corporate account/i.test(el.textContent||'')) el.textContent='';
    });
  }
  function ensureRegisterAccountArea(){
    var rb=byId('registerBox'), title=byId('registerTitle'), choice=byId('modeChoiceBox');
    if(!rb || !title || !choice) return null;
    var area=byId('registerAccountTypeArea');
    if(!area){
      area=document.createElement('div');
      area.id='registerAccountTypeArea';
      title.insertAdjacentElement('afterend',area);
    }
    if(choice.parentElement!==area) area.insertBefore(choice,area.firstChild);
    var notice=byId('registerAccountNotice');
    if(!notice){
      notice=document.createElement('div');
      notice.id='registerAccountNotice';
      notice.innerHTML='<div class="notice-icon">✓</div><div><b id="registerAccountNoticeTitle">Choose Account Type</b><span id="registerAccountNoticeText">Select Personal or Corporate before creating your ATSRS account.</span></div>';
      area.appendChild(notice);
    }else if(notice.parentElement!==area){area.appendChild(notice);}
    updateNotice();
    return area;
  }
  function updateNotice(){
    var mode=currentMode();
    var area=byId('registerAccountTypeArea');
    if(area) area.classList.toggle('needs-choice',!mode);
    var title=byId('registerAccountNoticeTitle'), text=byId('registerAccountNoticeText');
    if(!title||!text)return;
    if(mode==='personal'){
      title.textContent='';
      text.textContent='Create a personal profile to keep documents, certificates, references, appraisals and expiry alerts organized.';
    }else if(mode==='company'){
      title.textContent='Corporate Account';
      text.textContent='Create an organization account for personnel documents, expiry tracking, compliance readiness and controlled profile sharing.';
    }else if(pendingProvider){
      title.textContent='Choose Account Type';
      text.textContent='Select Personal or Corporate to continue registration with '+providerLabel(pendingProvider)+'.';
    }else{
      title.textContent='Choose Account Type';
      text.textContent='Select Personal or Corporate before creating your ATSRS account.';
    }
  }
  function openRegisterAndScroll(){
    pendingProvider=pendingProvider||null;
    clearOldWarnings();
    try{
      if(typeof window.hideAuthBoxes==='function') window.hideAuthBoxes();
      else{
        ['loginBox','forgotBox','newPasswordBox'].forEach(function(id){var el=byId(id);if(el)el.classList.add('hidden');});
      }
      var rb=byId('registerBox'); if(rb) rb.classList.remove('hidden');
    }catch(e){}
    setTimeout(function(){
      var area=ensureRegisterAccountArea();
      clearOldWarnings();
      updateNotice();
      if(area && area.scrollIntoView) area.scrollIntoView({behavior:'smooth',block:'center'});
    },80);
    return false;
  }
  function canRegister(){
    ensureRegisterAccountArea();
    updateNotice();
    var ok=!!currentMode();
    var area=byId('registerAccountTypeArea');
    if(area) area.classList.toggle('needs-choice',!ok);
    if(!ok && area && area.scrollIntoView) area.scrollIntoView({behavior:'smooth',block:'center'});
    return ok;
  }
  function continuePendingProvider(){
    if(!pendingProvider || !currentMode()) return;
    var provider=pendingProvider;
    pendingProvider=null;
    updateNotice();
    setTimeout(function(){
      if(typeof baseSocialAuth==='function') baseSocialAuth(provider,'register');
    },220);
  }

  /* Login does not ask for Personal/Corporate anymore. The mode is resolved after sign-in/profile load. */
  window.validateUseMode=function(){return true;};

  window.login=async function(){
    var email=(byId('loginEmail')&&byId('loginEmail').value||'').trim();
    var password=(byId('loginPassword')&&byId('loginPassword').value||'').trim();
    var msg=byId('loginMsg'); if(msg)msg.textContent='';
    if(!email||!password){if(msg)msg.textContent=(typeof tr==='function'?tr('enterLogin'):'Enter email and password.');return;}
    if(typeof markEmail==='function' && byId('loginEmail') && byId('loginEmailRule') && !markEmail(byId('loginEmail'),byId('loginEmailRule'))) return;
    if(!window.supabaseClient){if(msg)msg.textContent='Supabase library did not load.';return;}
    try{
      var res=await window.supabaseClient.auth.signInWithPassword({email:email,password:password});
      if(res.error){if(msg)msg.textContent=res.error.message;return;}
      window.currentUser=res.data.user;
      try{localStorage.setItem('atsrs_auth_mode','supabase');}catch(e){}
      if(typeof window.openApp==='function') window.openApp();
    }catch(e){if(msg)msg.textContent=(typeof tr==='function'?tr('connection'):'Connection failed.');}
  };
  window.localTestLogin=function(){
    window.currentUser={id:'local_test_user',email:'local-test@atsrs.com'};
    try{
      localStorage.setItem('atsrs_auth_mode','local');
      if(!localStorage.getItem('atsrs_use_mode')) localStorage.setItem('atsrs_use_mode','personal');
    }catch(e){}
    if(typeof window.openApp==='function') window.openApp();
  };
  window.showRegister=function(){pendingProvider=null;return openRegisterAndScroll();};
  window.register=function(){
    if(!canRegister()) return false;
    if(typeof baseRegister==='function') return baseRegister.apply(this,arguments);
    return false;
  };
  window.atsrsSocialAuth=function(providerKey,flow){
    if(!currentMode()){
      pendingProvider=providerKey;
      openRegisterAndScroll();
      updateNotice();
      return false;
    }
    pendingProvider=null;
    if(typeof baseSocialAuth==='function') return baseSocialAuth(providerKey,'register');
    return false;
  };
  window.setUseMode=function(mode){
    if(mode!=='personal' && mode!=='company') return;
    if(typeof baseSetUseMode==='function') baseSetUseMode(mode);
    else{
      window.useMode=mode;
      try{localStorage.setItem('atsrs_use_mode',mode);}catch(e){}
      var p=byId('personalModeBtn'), c=byId('companyModeBtn');
      if(p)p.classList.toggle('active',mode==='personal');
      if(c)c.classList.toggle('active',mode==='company');
      document.body.classList.toggle('personal-mode',mode==='personal');
      document.body.classList.toggle('company-mode',mode==='company');
    }
    clearOldWarnings();
    ensureRegisterAccountArea();
    updateNotice();
    continuePendingProvider();
  };

  function bind(){
    updateBuild();
    clearOldWarnings();
    var create=byId('createBtn'); if(create) create.onclick=function(e){if(e)e.preventDefault();pendingProvider=null;return openRegisterAndScroll();};
    var login=byId('loginBtn'); if(login) login.onclick=function(e){if(e)e.preventDefault();return window.login();};
    var test=byId('localTestBtn'); if(test) test.onclick=function(e){if(e)e.preventDefault();return window.localTestLogin();};
    var reg=byId('registerBtn'); if(reg) reg.onclick=function(e){if(e)e.preventDefault();return window.register();};
    [['socialGoogleBtn','google'],['socialMicrosoftBtn','microsoft'],['socialLinkedInBtn','linkedin']].forEach(function(pair){
      var b=byId(pair[0]); if(b) b.onclick=function(e){if(e)e.preventDefault();return window.atsrsSocialAuth(pair[1],'register');};
    });
    var rb=byId('registerBox'); if(rb && !rb.classList.contains('hidden')) ensureRegisterAccountArea();
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',bind); else bind();
  window.addEventListener('load',bind);
  [100,400,900,1600].forEach(function(ms){setTimeout(bind,ms);});
})();

/* ===== extracted from inline script id=atsrs-v111-register-choice-script ===== */
(function(){
  'use strict';
  var BUILD='ATSRS V210';
  var UPDATE='Last Update: 09 Jul 2026';
  var TEST='TEST BUILD';
  var selectedMode='';
  var pendingProvider=null;
  var baseRegister=window.register;
  var baseSocialAuth=window.atsrsSocialAuth;
  function byId(id){return document.getElementById(id);}
  function providerLabel(p){return p==='microsoft'?'Microsoft':p==='linkedin'?'LinkedIn':'Google';}
  function updateBuild(){
    var rows=document.querySelectorAll('.build-badge div');
    if(rows[0]) rows[0].textContent=BUILD;
    if(rows[1]) rows[1].textContent=UPDATE;
    if(rows[2]) rows[2].textContent=TEST;
  }
  function setButtons(mode){
    selectedMode=mode || '';
    var p=byId('personalModeBtn'), c=byId('companyModeBtn');
    if(p) p.classList.toggle('active',selectedMode==='personal');
    if(c) c.classList.toggle('active',selectedMode==='company');
  }
  function clearOldWarnings(){
    ['modeRule','modeInstruction'].forEach(function(id){var el=byId(id); if(el){el.classList.remove('active'); el.style.display='none'; el.textContent='';}});
    var mc=byId('modeChoiceBox'); if(mc) mc.classList.remove('mode-error');
    ['loginMsg','regMsg'].forEach(function(id){var el=byId(id); if(el && /Select Personal or Corporate account/i.test(el.textContent||'')) el.textContent='';});
  }
  function ensureRegisterAccountArea(){
    var rb=byId('registerBox'), title=byId('registerTitle'), choice=byId('modeChoiceBox');
    if(!rb || !title || !choice) return null;
    var area=byId('registerAccountTypeArea');
    if(!area){
      area=document.createElement('div');
      area.id='registerAccountTypeArea';
      title.insertAdjacentElement('afterend',area);
    }
    if(choice.parentElement!==area) area.insertBefore(choice,area.firstChild);
    var notice=byId('registerAccountNotice');
    if(!notice){
      notice=document.createElement('div');
      notice.id='registerAccountNotice';
      notice.innerHTML='<div class="notice-icon">!</div><div><b id="registerAccountNoticeTitle">Choose Account Type</b><span id="registerAccountNoticeText">Select Personal or Corporate before creating your ATSRS account.</span></div>';
      area.appendChild(notice);
    }else if(notice.parentElement!==area){area.appendChild(notice);}
    updateNotice();
    return area;
  }
  function updateNotice(){
    var area=byId('registerAccountTypeArea');
    var notice=byId('registerAccountNotice');
    var icon=notice?notice.querySelector('.notice-icon'):null;
    var title=byId('registerAccountNoticeTitle'), text=byId('registerAccountNoticeText');
    if(area) area.classList.toggle('needs-choice',!selectedMode);
    if(!notice || !title || !text) return;
    notice.classList.toggle('choice-missing',!selectedMode);
    notice.classList.toggle('choice-selected',!!selectedMode);
    if(!selectedMode){
      if(icon) icon.textContent='!';
      title.textContent='Choose Account Type';
      text.textContent=pendingProvider ? ('Select Personal or Corporate to continue registration with '+providerLabel(pendingProvider)+'.') : 'Select Personal or Corporate before creating your ATSRS account.';
    }else if(selectedMode==='personal'){
      if(icon) icon.textContent='✓';
      title.textContent='';
      text.textContent='Create a personal profile to keep documents, certificates, references, appraisals and expiry alerts organized.';
    }else{
      if(icon) icon.textContent='✓';
      title.textContent='Corporate Account';
      text.textContent='Create an organization account to manage personnel, compliance records, shared documents and workforce information.';
    }
  }
  function showRegisterOnly(){
    ['loginBox','forgotBox','newPasswordBox'].forEach(function(id){var el=byId(id); if(el) el.classList.add('hidden');});
    var rb=byId('registerBox'); if(rb) rb.classList.remove('hidden');
  }
  function openRegister(provider){
    pendingProvider=provider || null;
    setButtons('');
    clearOldWarnings();
    showRegisterOnly();
    var area=ensureRegisterAccountArea();
    updateNotice();
    setTimeout(function(){area=ensureRegisterAccountArea(); updateNotice(); if(area && area.scrollIntoView) area.scrollIntoView({behavior:'smooth',block:'center'});},90);
    return false;
  }
  function continueProvider(){
    if(!pendingProvider || !selectedMode) return;
    var p=pendingProvider;
    pendingProvider=null;
    updateNotice();
    try{localStorage.setItem('atsrs_use_mode',selectedMode); window.useMode=selectedMode;}catch(e){}
    setTimeout(function(){if(typeof baseSocialAuth==='function') baseSocialAuth(p,'register');},180);
  }
  function bind(){
    updateBuild(); clearOldWarnings();
    var create=byId('createBtn'); if(create) create.onclick=function(e){if(e)e.preventDefault(); return openRegister(null);};
    [['socialGoogleBtn','google'],['socialMicrosoftBtn','microsoft'],['socialLinkedInBtn','linkedin']].forEach(function(pair){
      var b=byId(pair[0]); if(b) b.onclick=function(e){if(e)e.preventDefault(); return openRegister(pair[1]);};
    });
    var p=byId('personalModeBtn'); if(p) p.onclick=function(e){if(e)e.preventDefault(); setButtons('personal'); updateNotice(); continueProvider(); return false;};
    var c=byId('companyModeBtn'); if(c) c.onclick=function(e){if(e)e.preventDefault(); setButtons('company'); updateNotice(); continueProvider(); return false;};
    var reg=byId('registerBtn'); if(reg) reg.onclick=function(e){
      if(e)e.preventDefault();
      ensureRegisterAccountArea();
      if(!selectedMode){updateNotice(); var area=byId('registerAccountTypeArea'); if(area&&area.scrollIntoView) area.scrollIntoView({behavior:'smooth',block:'center'}); return false;}
      try{localStorage.setItem('atsrs_use_mode',selectedMode); window.useMode=selectedMode;}catch(ex){}
      if(typeof baseRegister==='function') return baseRegister();
      return false;
    };
    var rb=byId('registerBox'); if(rb && !rb.classList.contains('hidden')) ensureRegisterAccountArea();
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',bind); else bind();
  window.addEventListener('load',bind);
  [120,500,1000,1800].forEach(function(ms){setTimeout(bind,ms);});
})();

/* ===== extracted from inline script id=atsrs-v112-compact-register-choice-script ===== */
(function(){
  'use strict';
  var BUILD='ATSRS V210';
  var UPDATE='Last Update: 09 Jul 2026';
  var TEST='TEST BUILD';
  function byId(id){return document.getElementById(id);}
  function updateBuild(){
    var rows=document.querySelectorAll('.build-badge div');
    if(rows[0])rows[0].textContent=BUILD;
    if(rows[1])rows[1].textContent=UPDATE;
    if(rows[2])rows[2].textContent=TEST;
  }
  function getSelectedMode(){
    var p=byId('personalModeBtn'), c=byId('companyModeBtn');
    if(p&&p.classList.contains('active'))return 'personal';
    if(c&&c.classList.contains('active'))return 'company';
    return '';
  }
  function normalizeNotice(){
    var notice=byId('registerAccountNotice');
    var title=byId('registerAccountNoticeTitle');
    var text=byId('registerAccountNoticeText');
    var icon=notice?notice.querySelector('.notice-icon'):null;
    if(!notice||!title||!text)return;
    var mode=getSelectedMode();
    notice.classList.toggle('choice-missing',!mode);
    notice.classList.toggle('choice-selected',!!mode);
    if(!mode){
      if(icon)icon.textContent='!';
      title.textContent='Choose Account Type';
      if(!/continue registration with/i.test(text.textContent||'')){
        text.textContent='Select Personal or Corporate before creating your ATSRS account.';
      }
    }else if(mode==='personal'){
      if(icon)icon.textContent='✓';
      title.textContent='';
      text.textContent='You are creating a Personal account to keep your documents, certificates, references, appraisals and expiry alerts organized.';
    }else{
      if(icon)icon.textContent='✓';
      title.textContent='Corporate Account';
      text.textContent='You are creating a Corporate account to manage personnel, compliance records, shared documents and workforce information.';
    }
  }
  function boot(){
    updateBuild();
    normalizeNotice();
    ['personalModeBtn','companyModeBtn','createBtn','registerBtn','socialGoogleBtn','socialMicrosoftBtn','socialLinkedInBtn'].forEach(function(id){
      var el=byId(id); if(el && !el.dataset.v112Watch){el.dataset.v112Watch='1'; el.addEventListener('click',function(){setTimeout(normalizeNotice,80);setTimeout(normalizeNotice,220);},true);}
    });
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
  window.addEventListener('load',boot);
  [100,400,900,1600,2600].forEach(function(ms){setTimeout(boot,ms);});
})();

/* ===== extracted from inline script id=atsrs-v113-test-social-flow-script ===== */
(function(){
  'use strict';
  var BUILD='ATSRS V210';
  var UPDATE='Last Update: 09 Jul 2026';
  var TEST='TEST BUILD';
  var socialProviderPending=null;
  function byId(id){return document.getElementById(id);}
  function label(provider){return provider==='microsoft'?'Microsoft':provider==='linkedin'?'LinkedIn':'Google';}
  function updateBuild(){
    var rows=document.querySelectorAll('.build-badge div');
    if(rows[0])rows[0].textContent=BUILD;
    if(rows[1])rows[1].textContent=UPDATE;
    if(rows[2])rows[2].textContent=TEST;
  }
  function ensureTestButtons(){
    // V205: Test Personal / Test Corporate removed from login UI.
    ['atsrsV113TestLoginGroup','atsrsV115TestLoginGroup','atsrsV117TestLoginGroup','localTestBtn'].forEach(function(id){var el=byId(id); if(el) el.remove();});
  }
  function directTestLogin(mode){
    try{
      window.useMode=mode;
      localStorage.setItem('atsrs_use_mode',mode);
      localStorage.setItem('atsrs_auth_mode','local');
      localStorage.setItem('atsrs_current_page',mode==='company'?'dashboard':'intro');
    }catch(e){}
    if(typeof window.setUseMode==='function'){
      try{window.setUseMode(mode);}catch(e){}
    }
    window.currentUser={id:'local_test_'+mode,email:mode==='company'?'corporate-test@atsrs.com':'personal-test@atsrs.com'};
    if(typeof window.openApp==='function')window.openApp();
  }
  function ensureSocialNotice(){
    var rb=byId('registerBox');
    if(!rb)return null;
    var n=byId('atsrsV113SocialNotice');
    if(!n){
      n=document.createElement('div');
      n.id='atsrsV113SocialNotice';
      n.innerHTML='<span class="notice-icon">!</span><div><b>Social sign in is not available yet.</b><span>Google, Microsoft and LinkedIn sign in will be enabled in a future update.</span></div>';
      var area=byId('registerAccountTypeArea');
      if(area)area.insertAdjacentElement('afterend',n);
      else rb.insertBefore(n,rb.children[1]||null);
    }
    return n;
  }
  function hideAuthBoxes(){
    ['loginBox','forgotBox','newPasswordBox'].forEach(function(id){var el=byId(id); if(el)el.classList.add('hidden');});
    var rb=byId('registerBox'); if(rb)rb.classList.remove('hidden');
  }
  function resetRegisterMode(){
    var rb=byId('registerBox');
    if(rb)rb.classList.remove('social-register-mode');
    socialProviderPending=null;
  }
  function openSocialChoice(provider){
    socialProviderPending=provider;
    hideAuthBoxes();
    var rb=byId('registerBox'); if(rb)rb.classList.add('social-register-mode');
    if(typeof window.setUseMode==='function'){
      try{window.setUseMode('');}catch(e){}
    }
    var p=byId('personalModeBtn'), c=byId('companyModeBtn');
    if(p)p.classList.remove('active');
    if(c)c.classList.remove('active');
    ensureSocialNotice();
    if(typeof window.atsrsV113UpdateNotice==='function')window.atsrsV113UpdateNotice(provider);
    setTimeout(function(){
      var area=byId('registerAccountTypeArea');
      if(area && area.scrollIntoView)area.scrollIntoView({behavior:'smooth',block:'center'});
    },80);
    return false;
  }
  function updateAccountNotice(provider){
    var area=byId('registerAccountTypeArea');
    var notice=byId('registerAccountNotice');
    var title=byId('registerAccountNoticeTitle');
    var text=byId('registerAccountNoticeText');
    var icon=notice?notice.querySelector('.notice-icon'):null;
    if(!notice || !title || !text)return;
    var p=byId('personalModeBtn'), c=byId('companyModeBtn');
    var mode=(p&&p.classList.contains('active'))?'personal':((c&&c.classList.contains('active'))?'company':'');
    if(area)area.classList.toggle('needs-choice',!mode);
    notice.classList.toggle('choice-missing',!mode);
    notice.classList.toggle('choice-selected',!!mode);
    if(!mode){
      if(icon)icon.textContent='!';
      title.textContent='Choose Account Type';
      text.textContent=provider?('Select Personal or Corporate to prepare '+label(provider)+' sign in.'):('Select Personal or Corporate before creating your ATSRS account.');
    }else if(mode==='personal'){
      if(icon)icon.textContent='✓';
      title.textContent='';
      text.textContent='You are creating a Personal account to keep your documents, certificates, references, appraisals and expiry alerts organized.';
    }else{
      if(icon)icon.textContent='✓';
      title.textContent='Corporate Account';
      text.textContent='You are creating a Corporate account to manage personnel, compliance records, shared documents and workforce information.';
    }
  }
  window.atsrsV113UpdateNotice=updateAccountNotice;
  function bind(){
    updateBuild();
    ensureTestButtons();
    ensureSocialNotice();
    var create=byId('createBtn');
    if(create && !create.dataset.v113Bound){
      create.dataset.v113Bound='1';
      create.addEventListener('click',function(){resetRegisterMode();setTimeout(function(){updateAccountNotice(null);},120);},true);
    }
    [['socialGoogleBtn','google'],['socialMicrosoftBtn','microsoft'],['socialLinkedInBtn','linkedin']].forEach(function(pair){
      var b=byId(pair[0]);
      if(b){b.onclick=function(e){if(e)e.preventDefault();return openSocialChoice(pair[1]);};}
    });
    ['personalModeBtn','companyModeBtn'].forEach(function(id){
      var el=byId(id);
      if(el && !el.dataset.v113ModeWatch){
        el.dataset.v113ModeWatch='1';
        el.addEventListener('click',function(){
          setTimeout(function(){
            updateAccountNotice(socialProviderPending);
            if(socialProviderPending){
              var msg=byId('regMsg');
              if(msg)msg.textContent='Social sign in is not available yet. Google, Microsoft and LinkedIn sign in will be enabled in a future update.';
            }
          },90);
        },true);
      }
    });
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind);else bind();
  window.addEventListener('load',bind);
  [100,400,900,1600,2600].forEach(function(ms){setTimeout(bind,ms);});
})();

/* ===== extracted from inline script ===== */
(function(){
  'use strict';
  var BUILD_LABEL = 'ATSRS V210';
  var UPDATE_LABEL = 'Last Update: 09 Jul 2026';
  var BUILD_TYPE = 'TEST BUILD';
  function lockBuildBadge(){
    var badge = document.getElementById('buildBadge') || document.querySelector('.build-badge');
    if(!badge) return;
    var rows = badge.querySelectorAll('div');
    if(rows.length >= 3){
      rows[0].textContent = BUILD_LABEL;
      rows[1].textContent = UPDATE_LABEL;
      rows[2].textContent = BUILD_TYPE;
    }else{
      badge.innerHTML = '<div>'+BUILD_LABEL+'</div><div>'+UPDATE_LABEL+'</div><div>'+BUILD_TYPE+'</div>';
    }
  }
  lockBuildBadge();
  document.addEventListener('DOMContentLoaded', lockBuildBadge);
  window.addEventListener('load', lockBuildBadge);
  setInterval(lockBuildBadge, 250);
})();

/* ===== extracted from inline script id=atsrs-v115-flow-fix-script ===== */
(function(){
  'use strict';
  var BUILD='ATSRS V210';
  var UPDATE='Last Update: 09 Jul 2026';
  var TYPE='TEST BUILD';
  function byId(id){return document.getElementById(id);}
  function lockBuild(){
    var badge=byId('buildBadge')||document.querySelector('.build-badge');
    if(!badge)return;
    var rows=badge.querySelectorAll('div');
    if(rows.length>=3){rows[0].textContent=BUILD;rows[1].textContent=UPDATE;rows[2].textContent=TYPE;}
    else{badge.innerHTML='<div>'+BUILD+'</div><div>'+UPDATE+'</div><div>'+TYPE+'</div>';}
  }
  function directTestLogin(mode){
    try{
      window.useMode=mode;
      localStorage.setItem('atsrs_use_mode',mode);
      localStorage.setItem('atsrs_auth_mode','local');
      localStorage.setItem('atsrs_current_page',mode==='company'?'dashboard':'intro');
    }catch(e){}
    if(typeof window.setUseMode==='function')try{window.setUseMode(mode);}catch(e){}
    window.currentUser={id:'local_test_'+mode,email:mode==='company'?'corporate-test@atsrs.com':'personal-test@atsrs.com'};
    if(typeof window.openApp==='function')window.openApp();
  }
  function placeTestButtons(){
    // V205: no temporary/test access buttons in production login.
    ['atsrsV113TestLoginGroup','atsrsV115TestLoginGroup','atsrsV117TestLoginGroup','localTestBtn'].forEach(function(id){var el=byId(id); if(el) el.remove();});
  }
  function ensureSocialNotice(){
    var rb=byId('registerBox'); if(!rb)return null;
    var n=byId('atsrsV113SocialNotice')||byId('atsrsV115SocialNotice');
    if(!n){
      n=document.createElement('div');
      n.id='atsrsV115SocialNotice';
      n.innerHTML='<span class="notice-icon">!</span><div><b>Social sign in is not available yet.</b><span>Google, Microsoft and LinkedIn sign in will be enabled in a future update.</span></div>';
      var title=byId('registerTitle');
      if(title)title.insertAdjacentElement('afterend',n); else rb.insertBefore(n,rb.firstChild);
    }
    return n;
  }
  function openSocialPlaceholder(provider){
    ['loginBox','forgotBox','newPasswordBox'].forEach(function(id){var el=byId(id);if(el)el.classList.add('hidden');});
    var rb=byId('registerBox');
    if(rb){rb.classList.remove('hidden');rb.classList.add('social-register-mode');}
    var n=ensureSocialNotice();
    if(n){
      n.style.display='flex';
      var txt=n.querySelector('span:last-child');
      if(txt)txt.textContent='Google, Microsoft and LinkedIn sign in will be enabled in a future update.';
    }
    var area=byId('registerAccountTypeArea'); if(area)area.classList.remove('needs-choice');
    var p=byId('personalModeBtn'), c=byId('companyModeBtn');
    if(p)p.classList.remove('active'); if(c)c.classList.remove('active');
    setTimeout(function(){var rb2=byId('registerBox'); if(rb2&&rb2.scrollIntoView)rb2.scrollIntoView({behavior:'smooth',block:'start'});},60);
    return false;
  }
  function normalCreateMode(){
    var rb=byId('registerBox');
    if(rb)rb.classList.remove('social-register-mode');
    var n=byId('atsrsV113SocialNotice')||byId('atsrsV115SocialNotice');
    if(n)n.style.display='none';
  }
  function bind(){
    lockBuild();
    placeTestButtons();
    ensureSocialNotice();
    var create=byId('createBtn');
    if(create && !create.dataset.v115Create){
      create.dataset.v115Create='1';
      create.addEventListener('click',function(){setTimeout(normalCreateMode,20);},true);
    }
    [['socialGoogleBtn','google'],['socialMicrosoftBtn','microsoft'],['socialLinkedInBtn','linkedin']].forEach(function(pair){
      var b=byId(pair[0]);
      if(b){
        b.onclick=function(e){if(e)e.preventDefault();return openSocialPlaceholder(pair[1]);};
        if(!b.dataset.v115Social){
          b.dataset.v115Social='1';
          b.addEventListener('click',function(e){if(e){e.preventDefault();e.stopImmediatePropagation();}return openSocialPlaceholder(pair[1]);},true);
        }
      }
    });
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind);else bind();
  window.addEventListener('load',bind);
  [80,250,700,1300,2400].forEach(function(ms){setTimeout(bind,ms);});
  setInterval(lockBuild,250);
})();


/* ===== ATSRS V180 Create Account V1 - UI binding to core auth closures ===== */
(function(){
  'use strict';
  function byId(id){return document.getElementById(id);}
  function bindAuthButtons(){
    var core=window.atsrsCoreAuth;
    if(!core) return;
    window.login=function(){return core.login();};
    window.register=function(){return core.register();};
    window.forgotPassword=function(){return core.forgotPassword();};
    window.updatePassword=function(){return core.updatePassword();};
    window.logout=function(){return core.logout();};
    var b;
    b=byId('loginBtn'); if(b) b.onclick=function(e){if(e)e.preventDefault();return core.login();};
    b=byId('createBtn'); if(b && !b.dataset.v180CreateOpen){
      b.dataset.v180CreateOpen='1';
      b.addEventListener('click',function(){var m=byId('regMsg'); if(m)m.textContent='';},true);
    }
    b=byId('registerBtn'); if(b) b.onclick=function(e){if(e)e.preventDefault();return core.register();};
    b=byId('resetBtn'); if(b) b.onclick=function(e){if(e)e.preventDefault();return core.forgotPassword();};
    b=byId('saveNewPassBtn'); if(b) b.onclick=function(e){if(e)e.preventDefault();return core.updatePassword();};
    ['navLogout','topLogout','accountExitBtn'].forEach(function(id){var x=byId(id); if(x) x.onclick=function(e){if(e)e.preventDefault();return core.logout();};});
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',bindAuthButtons); else bindAuthButtons();
  window.addEventListener('load',bindAuthButtons);
  [100,400,900,1600,2600].forEach(function(ms){setTimeout(bindAuthButtons,ms);});
})();

/* ===== ATSRS V182 Auth Debug UI Fix - force detailed register diagnostics into visible UI ===== */
(function(){
  'use strict';
  function byId(id){return document.getElementById(id);}
  function show(msg){
    var el=byId('regMsg');
    if(el){
      el.style.whiteSpace='pre-line';
      el.textContent=msg||'';
    }
  }
  function bindDebugRegisterUI(){
    var btn=byId('registerBtn');
    if(!btn) return;
    btn.onclick=function(e){
      if(e){e.preventDefault();}
      if(typeof window.atsrsAuthDebugRegister==='function'){
        return window.atsrsAuthDebugRegister();
      }
      if(window.atsrsCoreAuth && typeof window.atsrsCoreAuth.register==='function'){
        return window.atsrsCoreAuth.register();
      }
      show('Create Account failed — debug report\nError: Auth debug/register handler is not loaded.\nMeaning: js/storage.js or auth module did not load correctly.');
      return false;
    };
    if(!btn.dataset.v182DebugCapture){
      btn.dataset.v182DebugCapture='1';
      btn.addEventListener('click',function(e){
        if(typeof window.atsrsAuthDebugRegister==='function'){
          if(e){e.preventDefault();e.stopImmediatePropagation();}
          return window.atsrsAuthDebugRegister();
        }
      },true);
    }
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',bindDebugRegisterUI); else bindDebugRegisterUI();
  window.addEventListener('load',bindDebugRegisterUI);
  [100,300,700,1200,2200,3500].forEach(function(ms){setTimeout(bindDebugRegisterUI,ms);});
})();

/* ===== ATSRS V183 Register Handler Cleanup - force single visible debug/register flow ===== */
(function(){
  'use strict';
  function byId(id){return document.getElementById(id);}
  function show(msg){
    var el=byId('regMsg');
    if(el){el.style.whiteSpace='pre-line';el.textContent=msg||'';}
  }
  function runRegister(){
    if(typeof window.atsrsAuthDebugRegister==='function') return window.atsrsAuthDebugRegister();
    if(window.atsrsCoreAuth && typeof window.atsrsCoreAuth.register==='function') return window.atsrsCoreAuth.register();
    if(typeof window.register==='function') return window.register();
    show('Create Account failed — register handler is not available.\nMeaning: auth module did not load correctly.');
    return false;
  }
  function forceBind(){
    var btn=byId('registerBtn');
    if(btn){
      btn.onclick=function(e){if(e)e.preventDefault();return runRegister();};
      btn.dataset.v183RegisterHandler='forced';
    }
  }
  if(!window.__atsrsV183RegisterCapture){
    window.__atsrsV183RegisterCapture=true;
    document.addEventListener('click',function(e){
      var target=e.target;
      var btn=target && target.closest ? target.closest('#registerBtn') : null;
      if(!btn) return;
      e.preventDefault();
      e.stopPropagation();
      if(e.stopImmediatePropagation) e.stopImmediatePropagation();
      return runRegister();
    },true);
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',forceBind); else forceBind();
  window.addEventListener('load',forceBind);
  [50,150,350,700,1200,1800,2600,3500].forEach(function(ms){setTimeout(forceBind,ms);});
})();

/* ===== ATSRS V184 Register Debug Cleanup + Standalone Register Fallback ===== */
(function(){
  'use strict';
  function byId(id){return document.getElementById(id);} 
  function val(id){var el=byId(id); return el ? (el.value||'').trim() : '';}
  function show(msg){var el=byId('regMsg'); if(el){el.style.whiteSpace='pre-line'; el.textContent=msg||'';}}
  function cleanSocialNotice(){
    ['atsrsV113SocialNotice','atsrsV115SocialNotice'].forEach(function(id){var el=byId(id); if(el && el.parentNode) el.parentNode.removeChild(el);});
    var nodes=document.querySelectorAll('div,span,p,b');
    for(var i=0;i<nodes.length;i++){
      var t=(nodes[i].textContent||'').trim();
      if(t.indexOf('Social sign in is not available yet')!==-1){
        var n=nodes[i];
        while(n && n.parentNode && n.id!=='registerBox' && n.tagName!=='BODY'){
          if(n.id==='atsrsV113SocialNotice'||n.id==='atsrsV115SocialNotice'||(n.className&&String(n.className).indexOf('notice')!==-1)) break;
          n=n.parentNode;
        }
        if(n && n.parentNode && n.tagName!=='BODY' && n.id!=='registerBox') n.parentNode.removeChild(n);
        else nodes[i].textContent='';
      }
    }
    var rb=byId('registerBox'); if(rb) rb.classList.remove('social-register-mode');
  }
  function mode(){
    var p=byId('personalModeBtn'), c=byId('companyModeBtn'), m='';
    if(p && p.classList.contains('active')) m='personal';
    if(c && c.classList.contains('active')) m='company';
    try{if(!m)m=localStorage.getItem('atsrs_use_mode')||'';}catch(e){}
    return (m==='personal'||m==='company')?m:'';
  }
  function errText(e){return e ? ([e.name,e.message].filter(Boolean).join(': ')||String(e)) : 'Unknown error';}
  function redirectUrl(){try{return (window.location.origin||'https://atsrs.com') + (window.location.pathname||'/');}catch(e){return 'https://atsrs.com/';}}
  function getSupabaseUrl(){try{return (typeof SUPABASE_URL!=='undefined'?SUPABASE_URL:'');}catch(e){return '';}}
  function getSupabaseKey(){try{return (typeof SUPABASE_KEY!=='undefined'?SUPABASE_KEY:'');}catch(e){return '';}}
  function getClient(){
    try{ if(window.supabaseClient && window.supabaseClient.auth) return window.supabaseClient; }catch(e){}
    try{ if(typeof supabaseClient!=='undefined' && supabaseClient && supabaseClient.auth) return supabaseClient; }catch(e){}
    try{
      var url=getSupabaseUrl(), key=getSupabaseKey();
      if(window.supabase && url && key){
        var c=window.supabase.createClient(url,key);
        window.supabaseClient=c;
        return c;
      }
    }catch(e){}
    return null;
  }
  async function directFetchTest(){
    var url=getSupabaseUrl(), key=getSupabaseKey();
    if(!url) return {ok:false,status:'NO_URL',detail:'SUPABASE_URL missing'};
    try{
      var r=await fetch(url+'/auth/v1/settings',{method:'GET',headers:{apikey:key,Authorization:'Bearer '+key}});
      var text=''; try{text=await r.text();}catch(_e){}
      return {ok:r.ok,status:r.status,detail:text.slice(0,220)};
    }catch(e){return {ok:false,status:'FETCH_FAILED',detail:errText(e)};}
  }
  function buildDebug(error,fetchResult){
    var lines=[];
    lines.push('Create Account failed — debug report');
    lines.push('Error: '+errText(error));
    lines.push('Online: '+(navigator.onLine?'yes':'no'));
    lines.push('Origin: '+window.location.origin);
    lines.push('Redirect: '+redirectUrl());
    lines.push('Supabase lib: '+(window.supabase?'loaded':'NOT loaded'));
    lines.push('Client: '+(getClient()?'created':'NOT created'));
    lines.push('Supabase URL: '+(getSupabaseUrl()||'missing'));
    var key=getSupabaseKey(); lines.push('Anon key prefix: '+(key?key.slice(0,16)+'...':'missing'));
    if(fetchResult){
      lines.push('Direct fetch: '+fetchResult.status+' / '+(fetchResult.ok?'OK':'FAILED'));
      if(fetchResult.detail) lines.push('Fetch detail: '+fetchResult.detail);
    }
    lines.push('Meaning: FETCH_FAILED = network/Wi-Fi/DNS/VPN/blocking or Supabase endpoint access. 4xx/5xx = Supabase/API config.');
    return lines.join('\n');
  }
  async function standaloneRegister(){
    cleanSocialNotice();
    var email=val('regEmail').toLowerCase(), password=val('regPassword'), password2=val('regPassword2'), m=mode();
    show('');
    if(!m){var area=byId('registerAccountTypeArea'); if(area){area.classList.add('needs-choice'); var mc=area.querySelector('.mode-choice'); if(mc) mc.classList.add('mode-error'); try{area.scrollIntoView({behavior:'smooth',block:'center'});}catch(_e){}} show('Select Personal or Corporate before creating your ATSRS account.');return false;}
    if(!email || !password || !password2){show('Fill all required fields.');return false;}
    if(password.length<6){show('Password must be at least 6 characters.');return false;}
    if(password!==password2){show('Passwords do not match.');return false;}
    var client=getClient();
    if(!client){show(buildDebug(new Error('Supabase library/client did not load'),await directFetchTest()));return false;}
    var btn=byId('registerBtn'), old=btn?btn.textContent:'';
    try{
      if(btn){btn.disabled=true;btn.textContent='Creating account...';}
      show('Creating account...');
      var res=await client.auth.signUp({email:email,password:password,options:{emailRedirectTo:redirectUrl(),data:{account_type:m,atsrs_account_type:m,use_mode:m,source:'atsrs-web',app:'ATSRS'}}});
      if(res.error){show('Supabase Auth error: '+res.error.message);return false;}
      try{localStorage.setItem('atsrs_pending_email',email);localStorage.setItem('atsrs_use_mode',m);}catch(_e){}
      show((res.data && res.data.session)?'Account created. You can now continue.':'Account created. Confirmation email sent. Check inbox/spam.');
      return true;
    }catch(e){show(buildDebug(e,await directFetchTest()));return false;}
    finally{if(btn){btn.disabled=false;if(old)btn.textContent=old;}}
  }
  function bind(){
    cleanSocialNotice();
    if(typeof window.atsrsAuthDebugRegister!=='function') window.atsrsAuthDebugRegister=standaloneRegister;
    var b=byId('registerBtn'); if(!b) return;
    b.onclick=function(e){if(e){e.preventDefault();e.stopPropagation();} return (typeof window.atsrsAuthDebugRegister==='function'?window.atsrsAuthDebugRegister():standaloneRegister());};
    if(!b.dataset.v184StandaloneCapture){
      b.dataset.v184StandaloneCapture='1';
      b.addEventListener('click',function(e){if(e){e.preventDefault();e.stopImmediatePropagation();} return (typeof window.atsrsAuthDebugRegister==='function'?window.atsrsAuthDebugRegister():standaloneRegister());},true);
    }
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',bind); else bind();
  window.addEventListener('load',bind);
  [100,300,700,1200,2200,3500].forEach(function(ms){setTimeout(bind,ms);});
})();

/* ===== ATSRS V185 Register Single Handler Fix - remove old listeners by replacing Register button ===== */
(function(){
  'use strict';
  function byId(id){return document.getElementById(id);}
  function val(id){var el=byId(id); return el ? (el.value||'').trim() : '';}
  function show(msg){var el=byId('regMsg'); if(el){el.style.whiteSpace='pre-line'; el.textContent=msg||'';}}
  function mode(){
    var p=byId('personalModeBtn'), c=byId('companyModeBtn'), m='';
    if(p && p.classList.contains('active')) m='personal';
    if(c && c.classList.contains('active')) m='company';
    try{if(!m)m=localStorage.getItem('atsrs_use_mode')||'';}catch(e){}
    return (m==='personal'||m==='company')?m:'';
  }
  function errText(e){return e ? ([e.name,e.message].filter(Boolean).join(': ')||String(e)) : 'Unknown error';}
  function redirectUrl(){try{return (window.location.origin||'https://atsrs.com') + (window.location.pathname||'/');}catch(e){return 'https://atsrs.com/';}}
  function getSupabaseUrl(){try{return (typeof SUPABASE_URL!=='undefined'?SUPABASE_URL:'');}catch(e){return '';}}
  function getSupabaseKey(){try{return (typeof SUPABASE_KEY!=='undefined'?SUPABASE_KEY:'');}catch(e){return '';}}
  function getClient(){
    try{ if(window.supabaseClient && window.supabaseClient.auth) return window.supabaseClient; }catch(e){}
    try{ if(typeof supabaseClient!=='undefined' && supabaseClient && supabaseClient.auth) return supabaseClient; }catch(e){}
    try{
      var url=getSupabaseUrl(), key=getSupabaseKey();
      if(window.supabase && url && key){
        var c=window.supabase.createClient(url,key);
        window.supabaseClient=c;
        return c;
      }
    }catch(e){}
    return null;
  }
  async function directFetchTest(){
    var url=getSupabaseUrl(), key=getSupabaseKey();
    if(!url) return {ok:false,status:'NO_URL',detail:'SUPABASE_URL missing'};
    try{
      var r=await fetch(url+'/auth/v1/settings',{method:'GET',headers:{apikey:key,Authorization:'Bearer '+key}});
      var text=''; try{text=await r.text();}catch(_e){}
      return {ok:r.ok,status:r.status,detail:text.slice(0,240)};
    }catch(e){return {ok:false,status:'FETCH_FAILED',detail:errText(e)};}
  }
  function buildDebug(error,fetchResult){
    var lines=[];
    lines.push('Create Account failed — debug report');
    lines.push('Error: '+errText(error));
    lines.push('Handler: V185 single register handler');
    lines.push('Online: '+(navigator.onLine?'yes':'no'));
    lines.push('Origin: '+window.location.origin);
    lines.push('Redirect: '+redirectUrl());
    lines.push('Supabase lib: '+(window.supabase?'loaded':'NOT loaded'));
    lines.push('Client: '+(getClient()?'created':'NOT created'));
    lines.push('Supabase URL: '+(getSupabaseUrl()||'missing'));
    var key=getSupabaseKey(); lines.push('Anon key prefix: '+(key?key.slice(0,16)+'...':'missing'));
    if(fetchResult){
      lines.push('Direct fetch: '+fetchResult.status+' / '+(fetchResult.ok?'OK':'FAILED'));
      if(fetchResult.detail) lines.push('Fetch detail: '+fetchResult.detail);
    }
    lines.push('Meaning: FETCH_FAILED = network/Wi-Fi/DNS/VPN/blocking. Auth error text = Supabase auth setting/config.');
    return lines.join('\n');
  }
  async function registerV185(){
    var email=val('regEmail').toLowerCase(), password=val('regPassword'), password2=val('regPassword2'), m=mode();
    show('');
    if(!m){show('Select Personal or Corporate before creating your ATSRS account.');return false;}
    if(!email || !password || !password2){show('Fill all required fields.');return false;}
    if(password.length<6){show('Password must be at least 6 characters.');return false;}
    if(password!==password2){show('Passwords do not match.');return false;}
    var client=getClient();
    if(!client){show(buildDebug(new Error('Supabase library/client did not load'),await directFetchTest()));return false;}
    var btn=byId('registerBtn'), old=btn?btn.textContent:'';
    try{
      if(btn){btn.disabled=true;btn.textContent='Creating account...';}
      show('Creating account...');
      var res=await client.auth.signUp({
        email:email,
        password:password,
        options:{
          emailRedirectTo:redirectUrl(),
          data:{account_type:m,atsrs_account_type:m,use_mode:m,source:'atsrs-web',app:'ATSRS'}
        }
      });
      if(res.error){show('Supabase Auth error: '+res.error.message);return false;}
      try{localStorage.setItem('atsrs_pending_email',email);localStorage.setItem('atsrs_use_mode',m);}catch(_e){}
      show((res.data && res.data.session)?'Account created. You can now continue.':'Account created. Confirmation email sent. Check inbox/spam.');
      return true;
    }catch(e){
      show(buildDebug(e,await directFetchTest()));
      return false;
    }finally{
      if(btn){btn.disabled=false;if(old)btn.textContent=old;}
    }
  }
  function replaceAndBind(){
    window.atsrsAuthDebugRegister=registerV185;
    window.register=registerV185;
    if(window.atsrsCoreAuth) window.atsrsCoreAuth.register=registerV185;
    var oldBtn=byId('registerBtn');
    if(!oldBtn || oldBtn.dataset.v185SingleHandler==='1') return;
    var newBtn=oldBtn.cloneNode(true);
    newBtn.dataset.v185SingleHandler='1';
    newBtn.onclick=function(e){if(e){e.preventDefault();e.stopPropagation();} return registerV185();};
    newBtn.addEventListener('click',function(e){if(e){e.preventDefault();e.stopImmediatePropagation();} return registerV185();},true);
    oldBtn.parentNode.replaceChild(newBtn,oldBtn);
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',replaceAndBind); else replaceAndBind();
  window.addEventListener('load',replaceAndBind);
  [100,300,700,1200,2200,3500,5500].forEach(function(ms){setTimeout(replaceAndBind,ms);});
})();
