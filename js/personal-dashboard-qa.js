(function(){
  'use strict';

  var DASHBOARD_IDS=['exp90','exp60','exp30','exp7','expired','snapRisk'];
  var riskTone={exp90:'warning',exp60:'warning',exp30:'warning',exp7:'danger',expired:'danger',snapRisk:'warning'};
  var lastDashboardVisible=false;
  var notificationObserver=null,observedNotificationList=null;

  function byId(id){return document.getElementById(id);}
  function compactSidebarViewport(){return window.innerWidth<=800||(window.innerWidth<=960&&window.innerHeight<=560);}
  function personalMode(){
    var mode='';
    try{mode=localStorage.getItem('atsrs_use_mode')||localStorage.getItem('atsrs_account_type')||window.useMode||'';}catch(error){}
    return String(mode).toLowerCase()!=='company'&&String(mode).toLowerCase()!=='corporate';
  }
  function dashboardVisible(){
    var page=byId('dashboardPage');
    return Boolean(page&&!page.classList.contains('hidden')&&personalMode());
  }
  function numericValue(element){
    if(!element)return NaN;
    var match=String(element.textContent||'').replace(/,/g,'').match(/-?\d+(?:\.\d+)?/);
    return match?Number(match[0]):NaN;
  }
  function syncRiskTone(element){
    if(!element)return;
    var value=numericValue(element),tone=riskTone[element.id];
    element.classList.toggle('is-zero-risk',Number.isFinite(value)&&value===0);
    if(Number.isFinite(value)&&value===0){
      element.classList.remove('warning','danger');
    }else if(tone&&Number.isFinite(value)&&value>0){
      element.classList.add(tone);
    }
  }
  function syncExpiryBands(){
    var labels={exp90:'Expiring in 90 Days',exp60:'Expiring in 60 Days',exp30:'Expiring in 30 Days',exp7:'Expiring in 1 Week'};
    Object.keys(labels).forEach(function(id){var label=byId(id+'Text');if(label)label.textContent=labels[id];});
    if(typeof window.getData!=='function')return;
    var counts={exp90:0,exp60:0,exp30:0,exp7:0,expired:0};
    var today=new Date();today.setHours(0,0,0,0);
    (window.getData('certs')||[]).forEach(function(documentItem){
      var raw=String(documentItem&&documentItem.expiry||'').trim();
      if(!raw||raw.toUpperCase()==='N/A')return;
      var expiry=new Date(raw.slice(0,10)+'T00:00:00');
      if(Number.isNaN(expiry.getTime()))return;
      var days=Math.round((expiry-today)/86400000);
      if(days<0)counts.expired+=1;
      else if(days<=7)counts.exp7+=1;
      else if(days<=30)counts.exp30+=1;
      else if(days<=60)counts.exp60+=1;
      else if(days<=90)counts.exp90+=1;
    });
    Object.keys(counts).forEach(function(id){var value=byId(id);if(value)value.textContent=String(counts[id]);});
  }
  function syncShareCapability(){
    var help=byId('snapShareHelp');
    var badge=byId('snapshotBadge'),title=byId('snapshotTitle');
    if(badge&&badge.textContent!=='PROFILE SHARING')badge.textContent='PROFILE SHARING';
    if(title&&title.textContent!=='Managed in Profile')title.textContent='Managed in Profile';
    var helpText='Sharing settings are managed in Profile → Privacy & Sharing.';
    if(help&&help.textContent!==helpText)help.textContent=helpText;
  }
  function syncPriorityEmptyState(){
    var list=byId('riskList');if(!list)return;
    Array.from(list.children).forEach(function(item){
      Array.from(item.children).forEach(function(child){
        if(String(child.textContent||'').trim()==='OK'){
          child.setAttribute('aria-hidden','true');
          child.dataset.dashboardDecorativeStatus='true';
        }
      });
    });
  }
  function syncDecorativeMarks(){
    var page=byId('dashboardPage');if(!page)return;
    Array.from(page.querySelectorAll('span,i')).forEach(function(element){
      if(/^[✓✔]$/.test(String(element.textContent||'').trim()))element.setAttribute('aria-hidden','true');
    });
  }
  function syncNotificationSemantics(){
    var list=byId('atsrsNotificationList');if(!list)return;
    var text=String(list.textContent||'').trim();
    var loading=/^Loading notifications/i.test(text),error=Boolean(list.querySelector('.atsrs-notification-error'))||/could not be loaded/i.test(text);
    list.setAttribute('aria-live',error?'assertive':'polite');
    list.setAttribute('role',error?'alert':'status');
    list.setAttribute('aria-busy',loading?'true':'false');
    if(error&&!byId('dashboardNotificationRetry')&&typeof window.atsrsRefreshNotifications==='function'){
      var retry=document.createElement('button');
      retry.id='dashboardNotificationRetry';
      retry.type='button';
      retry.className='secondary dashboard-notification-retry';
      retry.textContent='Retry';
      retry.addEventListener('click',function(){window.atsrsRefreshNotifications();});
      list.appendChild(retry);
    }
    if(observedNotificationList!==list){
      if(notificationObserver)notificationObserver.disconnect();
      notificationObserver=new MutationObserver(syncNotificationSemantics);
      notificationObserver.observe(list,{childList:true,subtree:true});
      observedNotificationList=list;
    }
  }
  function syncMobileMenuState(){
    var sidebar=document.querySelector('#app .sidebar'),toggle=byId('sidebarToggleBtn');
    if(!sidebar||!toggle)return;
    var nav=sidebar.querySelector('.nav');if(!nav)return;
    if(!nav.id)nav.id='personalDashboardNav';
    var mobile=compactSidebarViewport(),open=mobile&&!sidebar.classList.contains('v76-mobile-closed');
    toggle.setAttribute('aria-controls',nav.id);
    toggle.setAttribute('aria-expanded',String(open));
    toggle.setAttribute('aria-label',open?'Close menu':'Open menu');
  }
  function handleMobileMenuKeydown(event){
    if(!dashboardVisible()||!compactSidebarViewport())return;
    var sidebar=document.querySelector('#app .sidebar'),toggle=byId('sidebarToggleBtn');
    if(!sidebar||!toggle||sidebar.classList.contains('v76-mobile-closed'))return;
    if(event.key==='Escape'){
      event.preventDefault();sidebar.classList.add('v76-mobile-closed');syncMobileMenuState();toggle.focus();return;
    }
    if(event.key!=='Tab')return;
    var focusable=Array.from(sidebar.querySelectorAll('button:not([disabled]),a[href],input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])')).filter(function(element){return element.getClientRects().length;});
    if(!focusable.length)return;
    var first=focusable[0],last=focusable[focusable.length-1];
    if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
    else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
  }
  function syncRequestCopy(){
    var panel=byId('accessRequestsPanel');if(!panel)return;
    var description=panel.querySelector(':scope > .sub');
    if(description&&/verified recruiter/i.test(description.textContent||'')){
      description.textContent='Review email-verified download requests. Preview access never requires approval.';
    }
  }
  function syncDashboard(){
    var visible=dashboardVisible();
    document.body.classList.toggle('atsrs-personal-dashboard-route',visible);
    if(visible&&compactSidebarViewport()&&!lastDashboardVisible){
      var sidebar=document.querySelector('#app .sidebar');
      if(sidebar)sidebar.classList.add('v76-mobile-closed');
    }
    lastDashboardVisible=visible;
    syncMobileMenuState();
    if(!visible)return;
    DASHBOARD_IDS.forEach(function(id){syncRiskTone(byId(id));});
    syncExpiryBands();
    syncShareCapability();
    syncPriorityEmptyState();
    syncDecorativeMarks();
    syncNotificationSemantics();
    syncRequestCopy();
  }
  function wrapAndSync(name){
    var original=window[name];
    if(typeof original!=='function'||original.__atsrsDashboardQaWrapped)return;
    var wrapped=function(){
      var result=original.apply(this,arguments);
      Promise.resolve(result).finally(function(){setTimeout(syncDashboard,0);});
      return result;
    };
    wrapped.__atsrsDashboardQaWrapped=true;
    window[name]=wrapped;
  }
  function start(){
    wrapAndSync('showPage');
    wrapAndSync('renderAll');
    syncDashboard();
    var toggle=byId('sidebarToggleBtn');if(toggle)toggle.addEventListener('click',function(){setTimeout(syncMobileMenuState,0);});
    document.addEventListener('keydown',handleMobileMenuKeydown);
    window.addEventListener('resize',syncDashboard,{passive:true});
    window.addEventListener('atsrs:data-hydrated',syncDashboard);
    window.addEventListener('atsrs:resume',syncDashboard);
    window.addEventListener('atsrs:workspace-changed',syncDashboard);
    window.addEventListener('load',syncDashboard);
  }

  window.atsrsPersonalDashboardQa={
    sync:syncDashboard,
    numericValue:numericValue,
    syncRiskTone:syncRiskTone
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();
