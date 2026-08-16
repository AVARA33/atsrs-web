/* ATSRS V178 extracted JavaScript batch: auth.js. Loaded in original V178 execution order. No placeholder code. */
/* ===== extracted from inline script id=atsrs-v76-minimal-ui-script ===== */
(function(){
  'use strict';
  window.atsrsV78EnglishOnlyNotice=function(){
    const m=document.getElementById('langMenu'); if(m)m.classList.add('hidden');
    const am=document.getElementById('appLangMenu'); if(am)am.classList.add('hidden');
  };
  function forceEnglish(){
    try{
      if(localStorage.getItem('atsrs_lang')!=='en')localStorage.setItem('atsrs_lang','en');
      if(localStorage.getItem('lang')!=='en')localStorage.setItem('lang','en');
    }catch(e){}
    if(window.lang!=='en')window.lang='en';
    if(document.documentElement.getAttribute('lang')!=='en')document.documentElement.setAttribute('lang','en');
    if(document.documentElement.getAttribute('dir')!=='ltr')document.documentElement.setAttribute('dir','ltr');
    ['langCircle','appLangCircle'].forEach(id=>{const b=document.getElementById(id);if(b&&b.textContent!=='🇬🇧')b.textContent='🇬🇧';});
    ['langMenu','appLangMenu'].forEach(id=>{const m=document.getElementById(id);if(m&&!m.classList.contains('hidden'))m.classList.add('hidden');});
    document.querySelectorAll('.lang-menu button').forEach(b=>{
      if(!b.classList.contains('v76-selected-lang'))b.classList.add('v76-selected-lang');
      if(b.getAttribute('aria-current')!=='true')b.setAttribute('aria-current','true');
    });
  }
  function simplifyModeError(){const err=document.getElementById('modeErrorText')||document.querySelector('.mode-error-text');if(err&&err.id!=='modeErrorText')err.id='modeErrorText'}
  function compactSidebarViewport(){return window.innerWidth<=800||(window.innerWidth<=960&&window.innerHeight<=560);}
  window.atsrsV76ToggleSidebar=function(){const app=document.getElementById('app');const side=document.querySelector('#app .sidebar');if(!app||app.classList.contains('hidden'))return;if(compactSidebarViewport()&&side){side.classList.toggle('v76-mobile-closed');return;}document.body.classList.toggle('v76-sidebar-collapsed');};
  function v78Apply(){forceEnglish();simplifyModeError();}
  const originalChangeLanguage=window.changeLanguage;
  window.changeLanguage=function(){
    let r;
    if(typeof originalChangeLanguage==='function')r=originalChangeLanguage.call(this,'en');
    setTimeout(v78Apply,0);setTimeout(v78Apply,160);return r;
  };
  window.toggleLangMenu=window.atsrsV78EnglishOnlyNotice;
  window.toggleAppLangMenu=window.atsrsV78EnglishOnlyNotice;
  document.addEventListener('DOMContentLoaded',v78Apply);window.addEventListener('load',v78Apply);window.addEventListener('atsrs:resume',v78Apply);setTimeout(v78Apply,0);setTimeout(v78Apply,400);
})();

/* ===== extracted from inline script ===== */
(function(){
  'use strict';
  const BUILD = 'ATSRS V453';
  const UPDATE = 'Last Update: 10 Aug 2026';
  const ATSRS_MEANING = 'Applicant Tracking System & Recruitment Solutions';
  function byId(id){ return document.getElementById(id); }
  function applyBuildBadge(){
    const rows = document.querySelectorAll('.build-badge div');
    if(rows[0]) rows[0].textContent = BUILD;
    if(rows[1]) rows[1].textContent = UPDATE;
  }
  function lockIntro(){
    /* V207: introKicker/introTitle/introText targets removed with the
       auth-intro block. authSubtitle (login panel) is kept. */
    const subtitle = byId('authSubtitle');
    if(subtitle) subtitle.textContent = ATSRS_MEANING;
  }
  /* V222: Sign in / Sign up tab routing uses the compact account-type row only. */
  window.atsrsAuthTabClick = function(tab, ev){
    if(ev && ev.preventDefault) ev.preventDefault();
    const signinBtn = byId('googleSigninBtn');
    const signupBtn = byId('googleSignupBtn');
    if(signinBtn) signinBtn.classList.toggle('active', tab === 'signin');
    if(signupBtn) signupBtn.classList.toggle('active', tab === 'signup');
    if(tab === 'signup'){
      if(typeof window.atsrsPrepareSignUpChoice === 'function') window.atsrsPrepareSignUpChoice(ev);
    }else{
      if(typeof window.atsrsGoogleSignIn === 'function') window.atsrsGoogleSignIn(ev);
    }
  };
  function boot(){ applyBuildBadge(); lockIntro(); }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
  window.addEventListener('load', boot);
  setTimeout(boot, 100);
  setTimeout(boot, 700);
})();
