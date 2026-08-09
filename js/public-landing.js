/* ATSRS V450 public entry route and animated brand wordmark. */
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
      wordmark.append(document.createTextNode('AT'));
      var swap=document.createElement('span');
      swap.className='atsrs-brand-swap';
      swap.setAttribute('aria-hidden','true');
      swap.textContent='S';
      wordmark.append(swap,document.createTextNode('RS'));
      wordmark.setAttribute('aria-label','ATSRS — Automated Reporting & Tracking System');
    });
  }
  function rotateWordmarks(){
    if(reducedMotion)return;
    document.querySelectorAll('.atsrs-brand-swap').forEach(function(swap){
      swap.classList.add('is-rotating');
      window.setTimeout(function(){swap.textContent=swap.textContent==='S'?'&':'S';},300);
      window.setTimeout(function(){swap.classList.remove('is-rotating');},610);
    });
  }
  prepareWordmarks();
  var authSubtitle=document.getElementById('authSubtitle');
  if(authSubtitle){
    var productName='Automated Reporting & Tracking System';
    var keepProductName=function(){if(authSubtitle.textContent!==productName)authSubtitle.textContent=productName;};
    keepProductName();
    window.setTimeout(keepProductName,500);
    window.setTimeout(keepProductName,1600);
  }
  if(!reducedMotion)window.setInterval(rotateWordmarks,10000);

  function finishPublicBoot(){
    document.body.classList.remove('atsrs-session-pending','atsrs-booting');
    if(boot)boot.style.display='none';
  }
  function hideLanding(){
    document.body.classList.remove('atsrs-public-view');
    if(landing)landing.classList.add('hidden');
  }
  function showLanding(){
    if(!landing)return;
    if(auth)auth.classList.add('hidden');
    if(app)app.classList.add('hidden');
    document.body.classList.add('atsrs-public-view');
    landing.classList.remove('hidden');
    finishPublicBoot();
    document.title='ATSRS — Document readiness for people and companies';
  }
  function showExistingAuth(view){
    hideLanding();
    if(app)app.classList.add('hidden');
    if(auth)auth.classList.remove('hidden');
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
      button.innerHTML='<i class="ph '+(light?'ph-moon':'ph-sun')+'" aria-hidden="true"></i>';
      button.setAttribute('aria-label',light?'Switch to dark mode':'Switch to light mode');
    }
    button.addEventListener('click',function(){
      var next=document.documentElement.dataset.theme==='light'?'dark':'light';
      document.documentElement.dataset.theme=next;
      document.documentElement.style.colorScheme=next;
      try{localStorage.setItem('atsrs_theme',next);}catch(error){}
      sync();
    });
    sync();
  });

  var callback=params.has('code')||params.has('error')||window.location.hash.indexOf('access_token=')>=0||window.location.hash.indexOf('type=recovery')>=0;
  var publicShare=params.has('share')||/^#recipient=[A-Za-z0-9_-]{40,128}$/.test(window.location.hash);
  if(requestedView==='login'||requestedView==='signup'){
    showExistingAuth(requestedView);
    return;
  }
  if(callback||publicShare)return;

  var settled=false;
  function decide(session){
    if(settled)return;
    settled=true;
    if(session&&session.user){hideLanding();return;}
    showLanding();
  }
  var client=window.supabaseClient;
  if(client&&client.auth){
    var request=typeof window.atsrsGetSessionSingleFlight==='function'
      ?window.atsrsGetSessionSingleFlight(client)
      :client.auth.getSession();
    Promise.resolve(request).then(function(result){decide(result&&result.data&&result.data.session);}).catch(function(){decide(null);});
    window.setTimeout(function(){decide(null);},4200);
  }else{
    decide(null);
  }
})();
