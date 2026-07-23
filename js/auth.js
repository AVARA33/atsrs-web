/* ATSRS V178 extracted JavaScript batch: auth.js. Loaded in original V178 execution order. No placeholder code. */
/* ===== extracted from inline script id=atsrs-v76-minimal-ui-and-audit-script ===== */
(function(){
  'use strict';
  const BUILD='V120';
  window.atsrsV78EnglishOnlyNotice=function(){
    const m=document.getElementById('langMenu'); if(m)m.classList.add('hidden');
    const am=document.getElementById('appLangMenu'); if(am)am.classList.add('hidden');
  };
  function forceEnglish(){
    try{localStorage.setItem('atsrs_lang','en');localStorage.setItem('lang','en')}catch(e){}
    window.lang='en';
    document.documentElement.setAttribute('lang','en');
    document.documentElement.setAttribute('dir','ltr');
    ['langCircle','appLangCircle'].forEach(id=>{const b=document.getElementById(id);if(b)b.textContent='🇬🇧';});
    ['langMenu','appLangMenu'].forEach(id=>{const m=document.getElementById(id);if(m)m.classList.add('hidden');});
    document.querySelectorAll('.lang-menu button').forEach(b=>{b.classList.toggle('v76-selected-lang',true);b.setAttribute('aria-current','true')});
  }
  function simplifyModeError(){const err=document.getElementById('modeErrorText')||document.querySelector('.mode-error-text');if(err&&err.id!=='modeErrorText')err.id='modeErrorText'}
  window.atsrsV76ToggleSidebar=function(){const app=document.getElementById('app');const side=document.querySelector('#app .sidebar');if(!app||app.classList.contains('hidden'))return;if(window.innerWidth<=800&&side){side.classList.toggle('v76-mobile-closed');return;}document.body.classList.toggle('v76-sidebar-collapsed');};
  function v78Apply(){forceEnglish();simplifyModeError();}
  function row(label,state,detail){return{label,state,detail}}
  function computed(el,prop){return el?getComputedStyle(el).getPropertyValue(prop):''}
  function duplicateIds(){const map={},dups=[];document.querySelectorAll('[id]').forEach(e=>{map[e.id]=(map[e.id]||0)+1});Object.keys(map).forEach(k=>{if(map[k]>1)dups.push(k+' ×'+map[k])});return dups;}
  function riskyFunctionRepeats(){
    const src=document.documentElement.outerHTML;
    const names=[...src.matchAll(/function\s+([A-Za-z_$][\w$]*)\s*\(/g)].map(m=>m[1]);
    const count={};names.forEach(n=>count[n]=(count[n]||0)+1);
    const legacyAllow=new Set(['status','getManagedFile','saveManagedFile','handleManagedUpload','previewManagedFile','downloadManagedFile','deleteManagedFile','ensureManagedCard','renderManagedFiles','ready','ensurePanel','appVisible','langFromFlag','activeLang','runSoon']);
    return Object.entries(count).filter(([n,c])=>c>1&&!legacyAllow.has(n)).map(([n,c])=>n+' ×'+c).slice(0,20);
  }
  function rectInfo(el){if(!el)return null;const r=el.getBoundingClientRect();return{left:Math.round(r.left),right:Math.round(r.right),top:Math.round(r.top),height:Math.round(r.height),width:Math.round(r.width)}}
  window.atsrsV76RunAudit=function(){
    v78Apply();
    const results=[];
    const langBtns=[document.getElementById('langCircle'),document.getElementById('appLangCircle')].filter(Boolean);
    const nonEn=langBtns.filter(b=>!(b.textContent||'').includes('🇬🇧')).length;
    results.push(row('English-only mode',nonEn===0?'PASS':'FAIL',nonEn===0?'Only English is active. extra language switches are disabled for now.':'A non-English flag is still visible.'));
    const menusVisible=[...document.querySelectorAll('.lang-menu')].filter(m=>computed(m,'display')!=='none'&&!m.classList.contains('hidden')).length;
    results.push(row('Language dropdown disabled',menusVisible===0?'PASS':'WARN',menusVisible===0?'Language dropdowns are hidden until multilingual build is reintroduced.':'A language menu is still opening.'));
    const toggle=document.getElementById('sidebarToggleBtn'),brand=document.querySelector('#app .sidebar .brand'),side=document.querySelector('#app .sidebar');
    const tr=rectInfo(toggle),br=rectInfo(brand),sr=rectInfo(side);
    const rightGap=(tr&&sr)?Math.round(sr.right-tr.right):999;
    const sameLine=(tr&&br)?Math.abs((tr.top+tr.height/2)-(br.top+br.height/2))<=4:false;
    results.push(row('Hamburger placement',toggle&&rightGap<=22&&sameLine?'PASS':'WARN',toggle?`Right gap: ${rightGap}px. Same line with ATSRS: ${sameLine}. Size: ${tr.width}×${tr.height}px.`:'Hamburger button missing.'));
    const before=document.body.classList.contains('v76-sidebar-collapsed');
    if(toggle&&window.innerWidth>800){toggle.click();var changed=document.body.classList.contains('v76-sidebar-collapsed')!==before;toggle.click();}else{var changed=!!toggle;}
    results.push(row('Sidebar toggle function',changed?'PASS':'FAIL',changed?'Sidebar collapse state changes when hamburger is clicked.':'Hamburger click did not change sidebar state.'));
    const modeBox=document.getElementById('modeChoiceBox');
    results.push(row('Mode warning style',modeBox&&computed(modeBox,'border-top-width')==='0px'?'PASS':'WARN','Personal/Company warning should be simple text with a small red icon.'));
    const activeNav=document.querySelector('#app .nav button.active');
    const navBg=(computed(activeNav,'background-image')||'')+(computed(activeNav,'background-color')||'');
    results.push(row('Menu simplicity',navBg.includes('gradient')?'WARN':'PASS','Left menu should be minimal without blue gradient selection.'));
    const top=document.querySelector('#app .top-actions');
    results.push(row('Top actions',top&&computed(top,'position')==='fixed'?'PASS':'WARN','Language/logout/test controls should remain available in app view.'));
    const dups=duplicateIds();
    results.push(row('Duplicate IDs',dups.length?'FAIL':'PASS',dups.length?dups.join(', '):'No duplicate element IDs found.'));
    const fn=riskyFunctionRepeats();
    results.push(row('Duplicate functions',fn.length?'WARN':'PASS',fn.length?fn.join(', '):'No risky duplicate function declarations found. Legacy overrides ignored.'));
    const sx=Math.max(document.body.scrollWidth,document.documentElement.scrollWidth)-window.innerWidth;
    results.push(row('Horizontal overflow',sx>2?'WARN':'PASS',sx>2?'Page is wider than viewport by '+Math.round(sx)+'px.':'No visible horizontal overflow.'));
    const visibleFetch=[...document.querySelectorAll('p,div,span')].filter(e=>(e.textContent||'').toLowerCase().includes('failed to fetch')).length;
    results.push(row('Fetch errors',visibleFetch?'WARN':'PASS',visibleFetch?'A visible Failed to fetch message is present. Usually network/Supabase/VPN related.':'No visible Failed to fetch message.'));
    const counts=results.reduce((a,r)=>(a[r.state]=(a[r.state]||0)+1,a),{});
    const reportText=results.map(r=>`${r.state}\n${r.label}\n${r.detail}`).join('\n\n');
    const body=results.map(r=>`<div class="v76-audit-row"><div class="v76-status v76-${r.state.toLowerCase()}">${r.state}</div><div><b>${r.label}</b><p>${r.detail}</p></div></div>`).join('');
    const old=document.getElementById('v76AuditModal');if(old)old.remove();
    const modal=document.createElement('div');modal.id='v76AuditModal';modal.className='v76-audit-modal';
    modal.innerHTML=`<div class="v76-audit-card"><div class="v76-audit-head"><h3>ATSRS ${BUILD} Audit</h3><div style="display:flex;gap:8px"><button class="v76-copy-btn" id="v78CopyAuditBtn">Copy report</button><button class="v76-audit-close" onclick="document.getElementById('v76AuditModal').remove()">Close</button></div></div><div class="v76-summary"><span class="v76-chip v76-pass">PASS ${counts.PASS||0}</span><span class="v76-chip v76-warn">WARN ${counts.WARN||0}</span><span class="v76-chip v76-fail">FAIL ${counts.FAIL||0}</span></div>${body}</div>`;
    document.body.appendChild(modal);
    const copy=document.getElementById('v78CopyAuditBtn');if(copy)copy.onclick=()=>{navigator.clipboard&&navigator.clipboard.writeText(reportText);copy.textContent='Copied';};
  };
  const originalChangeLanguage=window.changeLanguage;
  window.changeLanguage=function(){
    let r;
    if(typeof originalChangeLanguage==='function')r=originalChangeLanguage.call(this,'en');
    setTimeout(v78Apply,0);setTimeout(v78Apply,160);return r;
  };
  window.toggleLangMenu=window.atsrsV78EnglishOnlyNotice;
  window.toggleAppLangMenu=window.atsrsV78EnglishOnlyNotice;
  document.addEventListener('DOMContentLoaded',v78Apply);window.addEventListener('load',v78Apply);window.addEventListener('atsrs:resume',v78Apply);setTimeout(v78Apply,0);setTimeout(v78Apply,400);atsrsStableInterval(v78Apply,1000);
})();

/* ===== extracted from inline script ===== */
(function(){
  'use strict';
  const BUILD = 'ATSRS V299';
  const UPDATE = 'Last Update: 23 Jul 2026';
  const ATSRS_MEANING = 'Automated Tracking & Reporting System';
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
