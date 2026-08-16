/* ATSRS V178 extracted JavaScript batch: ui.js. Loaded in original V178 execution order. No placeholder code. */
function ready(fn){ if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',fn); else fn(); }
/* ===== extracted from inline script id=v64-clean-login-topbar-fix-script ===== */
(function(){
  function appVisible(){
    var app=document.getElementById('app');
    return !!(app && !app.classList.contains('hidden'));
  }
  function publicLandingVisible(){
    var landing=document.getElementById('landingPage');
    return !!(document.body &&
      document.body.classList.contains('atsrs-public-view') &&
      landing && !landing.classList.contains('hidden'));
  }
  function syncBodyState(){
    if(publicLandingVisible()){
      document.body.classList.remove('app-open','auth-open');
      return;
    }
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
