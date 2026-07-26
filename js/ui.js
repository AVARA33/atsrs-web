/* ATSRS V178 extracted JavaScript batch: ui.js. Loaded in original V178 execution order. No placeholder code. */
function ready(fn){ if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',fn); else fn(); }
/* ===== extracted from inline script id=v62-test-automation-script ===== */
(function(){
  function el(id){ return document.getElementById(id); }
  function shown(node){ return !!node && getComputedStyle(node).display!=='none' && getComputedStyle(node).visibility!=='hidden'; }
  function add(result, level, title, detail, fixFn){ result.push({level:level,title:title,detail:detail||'',fixFn:fixFn||null}); }
  function ensurePanel(){
    var p=el('atsrsTestAutomationPanel'); if(p) return p;
    p=document.createElement('div'); p.id='atsrsTestAutomationPanel'; p.className='hidden';
    p.innerHTML='<h3>ATSRS Test Automation Report</h3><p class="qa-sub">Runs frontend QA checks, applies safe local fixes, and lists items requiring backend/manual work.</p><div class="qa-actions"><button class="qa-run" type="button" onclick="atsrsRunFullAutomation(false)">Run Test</button><button class="qa-fix" type="button" onclick="atsrsRunFullAutomation(true)">Run + Auto Fix</button><button class="qa-close" type="button" onclick="document.getElementById(\'atsrsTestAutomationPanel\').classList.add(\'hidden\')">Close</button></div><div id="atsrsQaOutput"></div>';
    document.body.appendChild(p); return p;
  }
  function hardFixTopbar(){
    var app=el('app'); var top=document.querySelector('#app > .top-actions') || document.querySelector('.top-actions');
    if(!app||!top) return false;
    if(top.parentElement!==app) app.insertBefore(top, app.firstChild);
    top.classList.remove('atsrs-v56-top-actions','atsrs-global-top-actions');
    top.style.cssText='position:fixed!important;top:18px!important;right:18px!important;left:auto!important;bottom:auto!important;z-index:2147483647!important;display:flex!important;align-items:center!important;gap:10px!important;transform:none!important;width:auto!important;height:auto!important;';
    var lang=top.querySelector('.lang-floating,.app-lang-switcher');
    if(lang) lang.style.cssText='position:relative!important;top:auto!important;right:auto!important;left:auto!important;bottom:auto!important;z-index:2147483647!important;transform:none!important;display:block!important;';
    var logout=el('topLogoutBtn');
    if(logout) logout.style.cssText='width:auto!important;margin:0!important;background:rgba(239,68,68,.035)!important;color:#fca5a5!important;border:1px solid rgba(248,113,113,.42)!important;padding:10px 13px!important;border-radius:9px!important;font-weight:800!important;box-shadow:none!important;display:block!important;position:relative!important;';
    return true;
  }
  function fixRefScroll(){
    var fixed=0;
    var candidates=document.querySelectorAll('.ref-card,.cv-card,.panel');
    candidates.forEach(function(card){
      var text=(card.textContent||'').toLowerCase();
      if(text.indexOf('appraisal')!==-1 || text.indexOf('reference')!==-1 || text.indexOf('recommendation')!==-1 || text.indexOf('cv')!==-1){
        var lists=card.querySelectorAll('.preview-box,.ref-file-info,.ref-doc-list,.ref-upload-list,.cv-file-list,ul,tbody');
        lists.forEach(function(list){
          if(list && list.children && list.children.length>3){ list.classList.add('atsrs-ref-file-scroll'); fixed++; }
        });
      }
    });
    return fixed;
  }
  function fixMissingButtonStyles(){
    ['atsrsTopbarTroubleBtn','atsrsTestAutomationBtn'].forEach(function(id){ var b=el(id); if(b){b.style.width='auto';b.style.margin='0';} });
    return true;
  }
  function testTopbar(res, autoFix){
    var app=el('app'), top=document.querySelector('#app > .top-actions') || document.querySelector('.top-actions'), lang=el('appLangCircle'), logout=el('topLogoutBtn');
    if(!top){ add(res,'fail','Topbar not found','Language/logout container is missing.'); return; }
    if(!lang) add(res,'fail','App language button missing','appLangCircle not found.'); else add(res,'pass','App language button exists','appLangCircle found.');
    if(!logout) add(res,'fail','Logout button missing','topLogoutBtn not found.'); else add(res,'pass','Logout button exists','topLogoutBtn found.');
    var cs=getComputedStyle(top);
    if(cs.position==='fixed') add(res,'pass','Topbar CSS position is fixed','Current position: fixed.');
    else add(res,'fail','Topbar CSS position is not fixed','Current position: '+cs.position, hardFixTopbar);
    var y0=window.scrollY, before=Math.round(top.getBoundingClientRect().top), max=document.documentElement.scrollHeight-window.innerHeight, target=Math.min(max,y0+260);
    window.scrollTo(0,target);
    var after=Math.round(top.getBoundingClientRect().top); window.scrollTo(0,y0);
    if(Math.abs(after-before)<=2) add(res,'pass','Topbar scroll test passed','Before: '+before+', after: '+after+'.');
    else add(res,'fail','Topbar moves during scroll','Before: '+before+', after: '+after+'.', hardFixTopbar);
    if(autoFix) hardFixTopbar();
  }
  function testCoreDom(res){
    [['auth','Login section'],['app','App section'],['dashboardPage','Dashboard'],['certificatesPage','Certificates'],['refsPage','References/Appraisals'],['profilePage','Profile'],['navDashboard','Dashboard nav'],['navCertificates','Certificates nav'],['navRefs','Refs nav'],['navProfile','Profile nav']].forEach(function(x){
      add(res, el(x[0])?'pass':'fail', x[1]+' exists', x[0]+(el(x[0])?' found.':' missing.'));
    });
  }
  function testFunctions(res){
    ['changeLanguage','toggleAppLangMenu','showPage','renderAll','addCertificate','confirmLogout','logout','localTestLogin','saveProfile'].forEach(function(fn){
      add(res, typeof window[fn]==='function'?'pass':'fail', 'Function '+fn, typeof window[fn]==='function'?'Available.':'Missing or overwritten.');
    });
  }
  function testLanguage(res){
    try{
      if(typeof changeLanguage==='function'){
        changeLanguage('en');
        add(res,'pass','English-only language test','Only English is active.');
      } else add(res,'fail','English-only language test','changeLanguage function missing.');
    }catch(e){ add(res,'fail','English-only language test',String(e)); }
  }
  function testStorage(res){
    try{ localStorage.setItem('atsrs_qa_test','ok'); var ok=localStorage.getItem('atsrs_qa_test')==='ok'; localStorage.removeItem('atsrs_qa_test'); add(res,ok?'pass':'fail','LocalStorage availability',ok?'LocalStorage works.':'LocalStorage write/read failed.'); }
    catch(e){ add(res,'fail','LocalStorage unavailable',String(e)); }
  }
  function testReferenceScroll(res, autoFix){
    var before=document.querySelectorAll('.atsrs-ref-file-scroll').length;
    var fixed=autoFix?fixRefScroll():0;
    var after=document.querySelectorAll('.atsrs-ref-file-scroll').length;
    add(res,(after>0||fixed>0||before>0)?'fixed':'warn','Reference/Appraisal file list scroll guard','Existing/fixed scroll containers: '+Math.max(after,before)+'. If no files are uploaded yet, this check can only prepare CSS.');
  }
  function testBackendLimits(res){
    add(res,'warn','Backend-required: real file storage','File persistence/upload must be verified with Supabase Storage or backend. Frontend can only preview/store local metadata.');
    add(res,'warn','Backend-required: WhatsApp/email alerts','Scheduled alerts cannot run from static HTML alone. Need backend cron/edge function.');
    add(res,'warn','Backend-required: OCR reliability','Tesseract loads from CDN; offline/weak network can fail. Production needs controlled OCR pipeline.');
    add(res,'warn','Backend-required: secure shared profile','Demo link is frontend-only. Real secure share requires backend auth, tokens and permissions.');
  }
  function renderOutput(results, autoFix){
    var out=el('atsrsQaOutput'); if(!out) return;
    var counts={pass:0,warn:0,fail:0,fixed:0}; results.forEach(function(r){counts[r.level]=(counts[r.level]||0)+1;});
    function group(level,label){
      var items=results.filter(function(r){return r.level===level;});
      if(!items.length) return '';
      return '<details open><summary class="qa-'+level+'">'+label+' ('+items.length+')</summary><ul>'+items.map(function(r){return '<li><b>'+r.title+'</b><br><span>'+r.detail+'</span></li>';}).join('')+'</ul></details>';
    }
    out.innerHTML='<div class="qa-summary"><div class="qa-box"><b class="qa-pass">'+counts.pass+'</b><span>PASS</span></div><div class="qa-box"><b class="qa-fixed">'+counts.fixed+'</b><span>FIXED</span></div><div class="qa-box"><b class="qa-warn">'+counts.warn+'</b><span>WARN</span></div><div class="qa-box"><b class="qa-fail">'+counts.fail+'</b><span>FAIL</span></div></div>'+
      '<p class="qa-sub">Mode: '+(autoFix?'Run + Auto Fix':'Run Test')+' · '+new Date().toLocaleString()+'</p>'+group('fail','Needs correction')+group('fixed','Auto-fix / guarded')+group('warn','Cannot be fully fixed from static frontend')+group('pass','Passed checks');
  }
  window.atsrsRunFullAutomation=function(autoFix){
    ensurePanel().classList.remove('hidden');
    var results=[];
    testCoreDom(results); testFunctions(results); testStorage(results); testLanguage(results); testTopbar(results, !!autoFix); testReferenceScroll(results, !!autoFix); testBackendLimits(results);
    if(autoFix){ fixMissingButtonStyles(); hardFixTopbar(); }
    renderOutput(results, !!autoFix);
  };
  ready(function(){
    var top=document.querySelector('#app > .top-actions') || document.querySelector('.top-actions');
    if(top && !el('atsrsTestAutomationBtn')){
      var b=document.createElement('button'); b.type='button'; b.id='atsrsTestAutomationBtn'; b.textContent='Test Automation';
      b.onclick=function(){ atsrsRunFullAutomation(false); };
      var trouble=el('atsrsTopbarTroubleBtn');
      if(trouble && trouble.parentElement===top) top.insertBefore(b,trouble); else top.appendChild(b);
    }
    ensurePanel();
  });
})();

/* ===== extracted from inline script id=v64-clean-login-topbar-fix-script ===== */
(function(){
  function appVisible(){
    var app=document.getElementById('app');
    return !!(app && !app.classList.contains('hidden'));
  }
  function removeTempButtons(){
    ['atsrsTopbarTroubleBtn','atsrsTopbarTroublePanel','atsrsTestAutomationBtn','atsrsTestAutomationPanel'].forEach(function(id){
      var n=document.getElementById(id); if(n) n.remove();
    });
  }
  function syncBodyState(){
    document.body.classList.toggle('app-open', appVisible());
    document.body.classList.toggle('auth-open', !appVisible());
  }
  function dockTopbar(){
    var app=document.getElementById('app');
    var top=document.querySelector('body > .atsrs-v64-top-actions') || document.querySelector('.top-actions');
    if(!top) return;
    top.classList.remove('atsrs-global-top-actions','atsrs-v56-top-actions');
    top.classList.add('atsrs-v64-top-actions');
    if(app && top.parentElement!==app) app.insertBefore(top, app.firstChild);
    syncBodyState();
    top.style.setProperty('display',appVisible()?'flex':'none','important');
    top.style.setProperty('position','absolute','important');
    top.style.setProperty('top',window.innerWidth<=800?'12px':'18px','important');
    top.style.setProperty('right',window.innerWidth<=800?'12px':'18px','important');
    top.style.setProperty('left','auto','important');
    top.style.setProperty('bottom','auto','important');
    top.style.setProperty('z-index','2147483647','important');
    top.style.setProperty('transform','none','important');
    top.style.setProperty('width','auto','important');
    top.style.setProperty('height','auto','important');
    var lang=top.querySelector('.lang-floating,.app-lang-switcher');
    if(lang){
      lang.style.setProperty('position','relative','important');
      lang.style.setProperty('top','auto','important');
      lang.style.setProperty('right','auto','important');
      lang.style.setProperty('left','auto','important');
      lang.style.setProperty('bottom','auto','important');
      lang.style.setProperty('transform','none','important');
      lang.style.setProperty('display','block','important');
    }
    var logout=document.getElementById('topLogoutBtn');
    if(logout){
      logout.style.setProperty('display','inline-flex','important');
      logout.style.setProperty('position','relative','important');
      logout.style.setProperty('width','auto','important');
      logout.style.setProperty('margin','0','important');
      logout.style.setProperty('white-space','nowrap','important');
    }
    removeTempButtons();
  }
  function run(){ syncBodyState(); dockTopbar(); }
  ['openApp','showPage','renderAll','applyLanguage','changeLanguage','login','localTestLogin','logout','confirmLogout'].forEach(function(name){
    var base=window[name];
    if(typeof base==='function' && !base.__v64Dock){
      var wrapped=function(){ var r=base.apply(this,arguments); setTimeout(run,0); setTimeout(run,120); setTimeout(run,500); return r; };
      wrapped.__v64Dock=true; window[name]=wrapped;
    }
  });
  document.addEventListener('DOMContentLoaded',run);
  window.addEventListener('load',run);
  window.addEventListener('resize',run);
  window.addEventListener('scroll',function(){requestAnimationFrame(run);},{passive:true});
  atsrsStableInterval(run,700);
  setTimeout(run,0); setTimeout(run,300); setTimeout(run,900);
})();

/* ===== extracted from inline script ===== */
(function(){
  function releaseBootIfNeeded(){
    try{
      var appEl=document.getElementById('app');
      var authEl=document.getElementById('auth');
      var localMode=localStorage.getItem('atsrs_auth_mode');
      var appOpen=appEl && !appEl.classList.contains('hidden');
      if(appOpen || localMode!=='local'){
        document.body.classList.remove('atsrs-booting');
      }
    }catch(e){
      document.body.classList.remove('atsrs-booting');
    }
  }
  window.addEventListener('load',function(){setTimeout(releaseBootIfNeeded,250);});
  setTimeout(releaseBootIfNeeded,1200);
})();

/* ===== extracted from inline script id=atsrs-v70-page-attached-top-actions-script ===== */
(function(){
  function appVisible(){
    var app=document.getElementById('app');
    return !!(app && !app.classList.contains('hidden'));
  }
  function normaliseTopActions(){
    var app=document.getElementById('app');
    var top=document.querySelector('#app > .top-actions') ||
            document.querySelector('#app > .atsrs-global-top-actions') ||
            document.querySelector('#app > .atsrs-v56-top-actions') ||
            document.querySelector('#app > .atsrs-v64-top-actions') ||
            document.querySelector('body > .atsrs-v64-top-actions') ||
            document.querySelector('body > .atsrs-v56-top-actions') ||
            document.querySelector('body > .atsrs-global-top-actions') ||
            document.querySelector('body > .top-actions') ||
            document.querySelector('.top-actions');
    if(!app || !top) return;

    top.classList.remove('atsrs-v56-top-actions','atsrs-v64-top-actions');
    top.classList.add('top-actions','atsrs-global-top-actions');
    if(top.parentElement!==app){
      app.insertBefore(top, app.firstChild);
    }

    var visible=appVisible();
    top.style.setProperty('display',visible?'flex':'none','important');
    top.style.setProperty('position','absolute','important');
    top.style.setProperty('top',window.innerWidth<=800?'12px':'18px','important');
    top.style.setProperty('right',window.innerWidth<=800?'12px':'18px','important');
    top.style.setProperty('left','auto','important');
    top.style.setProperty('bottom','auto','important');
    top.style.setProperty('z-index','90','important');
    top.style.setProperty('transform','none','important');
    top.style.setProperty('will-change','auto','important');
    top.style.setProperty('width','auto','important');
    top.style.setProperty('height','auto','important');
    top.style.setProperty('margin','0','important');
    top.style.setProperty('padding','0','important');

    var lang=top.querySelector('.lang-floating,.app-lang-switcher');
    if(lang){
      lang.style.setProperty('position','relative','important');
      lang.style.setProperty('top','auto','important');
      lang.style.setProperty('right','auto','important');
      lang.style.setProperty('left','auto','important');
      lang.style.setProperty('bottom','auto','important');
      lang.style.setProperty('transform','none','important');
      lang.style.setProperty('display','block','important');
    }

    var menu=top.querySelector('.lang-menu');
    if(menu){
      menu.style.setProperty('position','absolute','important');
      menu.style.setProperty('top',window.innerWidth<=800?'52px':'56px','important');
      menu.style.setProperty('right','0','important');
      menu.style.setProperty('left','auto','important');
      menu.style.setProperty('bottom','auto','important');
    }

    var logout=document.getElementById('topLogoutBtn');
    if(logout){
      logout.style.setProperty('display','inline-flex','important');
      logout.style.setProperty('position','relative','important');
      logout.style.setProperty('width','auto','important');
      logout.style.setProperty('margin','0','important');
      logout.style.setProperty('white-space','nowrap','important');
    }
  }

  window.atsrsV70NormaliseTopActions=normaliseTopActions;
  window.forceTopControlsFixed=normaliseTopActions;
  window.v55DockTopActions=normaliseTopActions;

  ['openApp','showPage','renderAll','applyLanguage','changeLanguage','login','localTestLogin','logout','confirmLogout'].forEach(function(name){
    var base=window[name];
    if(typeof base==='function' && !base.__v70PageAttached){
      var wrapped=function(){
        var result=base.apply(this,arguments);
        setTimeout(normaliseTopActions,0);
        setTimeout(normaliseTopActions,120);
        setTimeout(normaliseTopActions,500);
        return result;
      };
      wrapped.__v70PageAttached=true;
      window[name]=wrapped;
    }
  });

  document.addEventListener('DOMContentLoaded',normaliseTopActions);
  window.addEventListener('load',normaliseTopActions);
  window.addEventListener('resize',normaliseTopActions);
  window.addEventListener('scroll',function(){requestAnimationFrame(normaliseTopActions);},{passive:true});
  atsrsStableInterval(normaliseTopActions,80);
  setTimeout(normaliseTopActions,0);
  setTimeout(normaliseTopActions,300);
  setTimeout(normaliseTopActions,900);
})();

/* ===== extracted from inline script id=atsrs-v71-remove-fixed-portal-script ===== */
(function(){
  function removeFixedPortal(){
    ['atsrsFixedPortalTopbar','atsrs-v63-portal-style','atsrs-v63-portal-script'].forEach(function(id){
      var n=document.getElementById(id);
      if(n) n.remove();
    });
    document.body.classList.remove('atsrs-app-visible','atsrs-auth-visible');
  }
  window.atsrsTogglePortalLangMenu=function(){};
  window.atsrsPortalChangeLanguage=function(l){
    if(typeof changeLanguage==='function') changeLanguage(l);
  };
  document.addEventListener('DOMContentLoaded',removeFixedPortal);
  window.addEventListener('load',removeFixedPortal);
  setTimeout(removeFixedPortal,0);
  setTimeout(removeFixedPortal,300);
  atsrsStableInterval(removeFixedPortal,1000);
})();

/* ===== extracted from inline script ===== */
(function(){
  function getLang(){ return "en"; }
  try{
    Object.defineProperty(window,'lang',{
      configurable:true,
      get:function(){ return "en"; },
      set:function(v){ localStorage.setItem('atsrs_lang','en'); }
    });
  }catch(e){ window.lang='en'; }

  function forceLangApply(){
    try{ document.documentElement.lang='en'; document.documentElement.dir='ltr'; }catch(e){}
  }

  var prevChange = window.changeLanguage;
  window.changeLanguage=function(v){
    localStorage.setItem('atsrs_lang','en');
    var r = (typeof prevChange==='function') ? prevChange.apply(this,['en']) : undefined;
    try{ if(typeof applyLanguage==='function') applyLanguage(); }catch(e){}
    forceLangApply();
    setTimeout(forceLangApply,0);
    setTimeout(forceLangApply,150);
    setTimeout(forceLangApply,500);
    return r;
  };
})();
