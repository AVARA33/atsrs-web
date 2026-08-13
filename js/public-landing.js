/* ATSRS V511 public entry route, shared theme switch and animated brand wordmark. */
(function(){
  'use strict';
  var landing=document.getElementById('landingPage');
  var auth=document.getElementById('auth');
  var app=document.getElementById('app');
  var boot=document.getElementById('atsrsBootScreen');
  var params=new URLSearchParams(window.location.search);
  var requestedView=params.get('view');
  var reducedMotion=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function prepareWordmarks(){
    document.querySelectorAll('.atsrs-animated-wordmark').forEach(function(wordmark){
      if(wordmark.querySelector('.atsrs-brand-swap'))return;
      if((wordmark.textContent||'').trim()!=='ATSRS')return;
      wordmark.textContent='';
      var prefix=document.createElement('span');
      prefix.className='atsrs-brand-prefix';
      prefix.textContent='AT';
      var swap=document.createElement('span');
      swap.className='atsrs-brand-swap';
      swap.setAttribute('aria-hidden','true');
      var letterS=document.createElement('span');
      letterS.className='atsrs-brand-face atsrs-brand-s';
      letterS.textContent='S';
      var ampersand=document.createElement('span');
      ampersand.className='atsrs-brand-face atsrs-brand-amp';
      ampersand.textContent='&';
      swap.append(letterS,ampersand);
      var suffix=document.createElement('span');
      suffix.className='atsrs-brand-suffix';
      suffix.textContent='RS';
      wordmark.append(prefix,swap,suffix);
      wordmark.setAttribute('aria-label','ATSRS — Applicant Tracking System & Recruitment Solutions');
    });
  }
  function rotateWordmarks(){
    if(reducedMotion)return;
    document.querySelectorAll('.atsrs-brand-swap').forEach(function(swap){
      swap.classList.toggle('show-amp');
    });
  }
  prepareWordmarks();
  var authSubtitle=document.getElementById('authSubtitle');
  if(authSubtitle)authSubtitle.textContent='Applicant Tracking System & Recruitment Solutions';
  if(!reducedMotion)window.setInterval(rotateWordmarks,10000);

  function finishPublicBoot(){
    document.body.classList.remove('atsrs-session-pending','atsrs-booting');
    if(boot)boot.style.display='none';
  }
  function hideLanding(){
    document.body.classList.remove('atsrs-public-view');
    if(landing)landing.classList.add('hidden');
    restoreGlobalControls();
  }

  function removePublicGlobalControls(){
    if(typeof window.atsrsRemoveThemeControls==='function'){
      window.atsrsRemoveThemeControls();
      return;
    }
    var controls=document.getElementById('atsrsGlobalControls');
    if(controls)controls.remove();
  }

  function restoreGlobalControls(){
    if(typeof window.atsrsEnsureThemeControls==='function')window.atsrsEnsureThemeControls();
    if(typeof window.atsrsSyncThemePlacement==='function')window.atsrsSyncThemePlacement();
  }
  function removeSharedProfile(){
    var sharedProfile=document.getElementById('sharedProfilePage');
    if(sharedProfile)sharedProfile.remove();
    document.documentElement.classList.remove('atsrs-public-share-mode');
    document.body.classList.remove('atsrs-public-share-view');
  }
  function showLanding(){
    if(!landing)return;
    removeSharedProfile();
    if(auth)auth.classList.add('hidden');
    if(app)app.classList.add('hidden');
    document.body.classList.remove('auth-open','app-open');
    document.body.classList.add('atsrs-public-view');
    removePublicGlobalControls();
    landing.classList.remove('hidden');
    finishPublicBoot();
    document.title='ATSRS — Document readiness for people and companies';
  }
  function showExistingAuth(view){
    removeSharedProfile();
    hideLanding();
    if(app)app.classList.add('hidden');
    if(auth)auth.classList.remove('hidden');
    document.body.classList.remove('app-open');
    document.body.classList.add('auth-open');
    finishPublicBoot();
    if(typeof window.hideAuthBoxes==='function')window.hideAuthBoxes();
    var loginBox=document.getElementById('loginBox');
    if(loginBox)loginBox.classList.remove('hidden');
    if(view==='signup'){
      var signin=document.getElementById('googleSigninBtn');
      var signup=document.getElementById('googleSignupBtn');
      if(signin)signin.classList.remove('active');
      if(signup)signup.classList.add('active');
      if(typeof window.atsrsShowCompactChoice==='function')window.atsrsShowCompactChoice('signup');
    }else if(typeof window.atsrsHideCompactChoice==='function'){
      window.atsrsHideCompactChoice();
    }
  }

  var originalOpenApp=window.openApp;
  if(typeof originalOpenApp==='function'){
    window.openApp=function(){hideLanding();return originalOpenApp.apply(this,arguments);};
  }

  document.querySelectorAll('[data-public-theme-toggle]').forEach(function(button){
    function sync(){
      var light=document.documentElement.dataset.theme==='light';
      button.setAttribute('aria-checked',light?'true':'false');
      button.setAttribute('aria-label',light?'Switch to Dark theme':'Switch to Glass theme');
      button.setAttribute('title',light?'Switch to Dark theme':'Switch to Glass theme');
      button.dataset.currentTheme=light?'Glass':'Dark';
    }
    button.addEventListener('click',function(){
      var next=document.documentElement.dataset.theme==='light'?'dark':'light';
      document.documentElement.dataset.theme=next;
      document.documentElement.style.colorScheme='dark';
      var meta=document.querySelector('meta[name="theme-color"]');
      if(meta)meta.setAttribute('content',next==='light'?'#03101a':'#050606');
      try{localStorage.setItem('atsrs_theme',next);}catch(error){}
      sync();
    });
    sync();
  });

  var callback=params.has('code')||params.has('error')||window.location.hash.indexOf('access_token=')>=0||window.location.hash.indexOf('type=recovery')>=0;
  var publicShare=params.has('share')||/^#recipient=[A-Za-z0-9_-]{40,128}$/.test(window.location.hash);
  if(requestedView==='home'){
    window.__atsrsEntryRoute='landing';
    window.__atsrsSuppressAutomaticSessionOpen=true;
    try{window.history.replaceState({},document.title,window.location.pathname||'/');}catch(error){}
    showLanding();
    return;
  }
  if(requestedView==='login'||requestedView==='signup'){
    showExistingAuth(requestedView);
    return;
  }
  if(callback||publicShare)return;
  showLanding();
  var client=window.supabaseClient;
  if(!client||!client.auth){
    showLanding();
    return;
  }
  var sessionRequest=typeof window.atsrsGetSessionSingleFlight==='function'
    ?window.atsrsGetSessionSingleFlight(client)
    :client.auth.getSession();
  Promise.resolve(sessionRequest)
    .then(function(result){
      var session=result&&result.data&&result.data.session;
      if(session&&session.user){
        window.__atsrsSuppressAutomaticSessionOpen=false;
        if(typeof window.atsrsResumeSession==='function'){
          return Promise.resolve(window.atsrsResumeSession(session,'resume'))
            .then(function(opened){
              if(opened===false)showLanding();
              return opened;
            });
        }
        showLanding();
        return false;
      }
      showLanding();
    })
    .catch(function(error){
      console.warn('ATSRS landing session check failed',error);
      showLanding();
    });
})();
