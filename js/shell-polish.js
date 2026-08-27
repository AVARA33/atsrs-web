/* ATSRS V443 — stable workspace navigation and authenticated header controls. */
(function(){
  'use strict';

  var ICONS={
    navDashboard:'squares-four',
    navCandidates:'user-list',
    navPersonnel:'users-three',
    navProjects:'kanban',
    navCredentials:'file',
    navCertificates:'file',
    navRefs:'file-text',
    navCompliance:'shield-check',
    navReports:'chart-bar',
    navProfile:'user-circle',
    navJobs:'briefcase-metal',
    navEmployers:'buildings',
    navRecruiters:'address-book',
    navIntro:'sparkle',
    navPrivacy:'lock-simple'
  };

  var DEFAULT_LABELS={
    navDashboard:'Dashboard',
    navCandidates:'Candidates',
    navPersonnel:'Personnel',
    navProjects:'Projects',
    navCredentials:'Company Credentials',
    navCertificates:'Documents',
    navRefs:'References',
    navCompliance:'Compliance',
    navReports:'Reports',
    navProfile:'Profile',
    navJobs:'JobSearch',
    navEmployers:'Companies',
    navRecruiters:'Recruiters',
    navIntro:'Product Updates',
    navPrivacy:'Privacy'
  };

  function compactSidebarViewport(){
    return window.innerWidth<=800||(window.innerWidth<=960&&window.innerHeight<=560);
  }

  var PERSONAL_LABELS={
    navDashboard:'Dashboard',
    navCertificates:'Documents',
    navRefs:'References',
    navCompliance:'Security',
    navProfile:'Profile',
    navJobs:'JobSearch',
    navEmployers:'Companies',
    navRecruiters:'Recruiters',
    navIntro:'Product Updates',
    navPrivacy:'Privacy'
  };

  var COMPANY_LABELS={
    navDashboard:'Dashboard',
    navCandidates:'Candidates',
    navPersonnel:'Personnel',
    navProjects:'Projects',
    navCredentials:'Company Credentials',
    navCompliance:'Compliance',
    navReports:'Reports',
    navProfile:'Company',
    navJobs:'JobSearch',
    navIntro:'Product Updates',
    navPrivacy:'Privacy'
  };

  var navSyncQueued=false;
  var mobileStateInitialized=false;
  var responsiveShellFrame=0;

  function byId(id){return document.getElementById(id)}

  function icon(name,className){
    var node=document.createElement('i');
    node.className='ph ph-'+name+(className?' '+className:'');
    node.setAttribute('aria-hidden','true');
    return node;
  }

  function expectedIcon(id){
    if(id==='navProfile'&&document.body.classList.contains('company-mode'))return 'buildings';
    return ICONS[id];
  }

  function expectedLabel(id,current){
    var labels=document.body.classList.contains('company-mode')?COMPANY_LABELS:PERSONAL_LABELS;
    return labels[id]||current||DEFAULT_LABELS[id];
  }

  function decorateNavButton(button){
    if(!button||!ICONS[button.id])return;
    var existingLabel=button.querySelector('.atsrs-nav-label');
    var current=String(existingLabel?existingLabel.textContent:button.textContent||'').trim();
    var label=expectedLabel(button.id,current);
    var name=expectedIcon(button.id);
    var existingIcon=button.querySelector('.atsrs-nav-icon');
    if(existingIcon&&existingLabel){
      existingIcon.className='ph ph-'+name+' atsrs-nav-icon';
      if(existingLabel.textContent!==label)existingLabel.textContent=label;
      return;
    }
    button.textContent='';
    var labelNode=document.createElement('span');
    labelNode.className='atsrs-nav-label';
    labelNode.textContent=label;
    button.appendChild(icon(name,'atsrs-nav-icon'));
    button.appendChild(labelNode);
  }

  function decorateNavigation(){
    Object.keys(ICONS).forEach(function(id){decorateNavButton(byId(id))});
    syncNavigationRoutes();
  }

  function syncNavigationRoutes(){
    var compliance=byId('navCompliance');
    if(!compliance)return;
    compliance.onclick=function(){
      if(document.body.classList.contains('personal-mode')){
        if(typeof window.showPage==='function')window.showPage('security',compliance);
        return;
      }
      if(typeof window.showPage==='function')window.showPage('compliance',compliance);
    };
  }

  function queueNavigation(){
    if(navSyncQueued)return;
    navSyncQueued=true;
    try{decorateNavigation()}
    finally{navSyncQueued=false}
  }

  function wrapNavigationWriter(name){
    var base=window[name];
    if(typeof base!=='function'||base.__atsrsShellNavigationWriter)return;
    var wrapped=function(){
      var result=base.apply(this,arguments);
      queueNavigation();
      if(name==='showPage'){
        closeMobileSidebar();
        stabilizeVisibleRoute();
        setTimeout(stabilizeVisibleRoute,120);
      }
      if(name==='openApp')setTimeout(closeMobileSidebar,0);
      if(result&&typeof result.then==='function'){
        return Promise.resolve(result).finally(queueNavigation);
      }
      return result;
    };
    wrapped.__atsrsShellNavigationWriter=true;
    window[name]=wrapped;
  }

  function closeMobileSidebar(){
    if(!compactSidebarViewport())return;
    var sidebar=document.querySelector('#app.app:not(.hidden) .sidebar');
    if(sidebar)sidebar.classList.add('v76-mobile-closed');
  }

  function syncResponsiveShell(){
    responsiveShellFrame=0;
    var app=document.querySelector('#app.app:not(.hidden)');
    if(!app)return;
    var compact=compactSidebarViewport();
    document.body.classList.toggle('atsrs-compact-shell',compact);
    if(!compact)return;
    document.body.classList.remove('v76-sidebar-collapsed');
    closeMobileSidebar();
    var main=app.querySelector(':scope > .main');
    if(main)main.scrollLeft=0;
    if(window.scrollX!==0)window.scrollTo(0,window.scrollY);
  }

  function queueResponsiveShellSync(){
    if(responsiveShellFrame)return;
    responsiveShellFrame=window.requestAnimationFrame(syncResponsiveShell);
  }

  function stabilizeVisibleRoute(){
    var intro=byId('introPage'),introButton=byId('navIntro');
    if(!intro||!introButton||!introButton.classList.contains('active'))return;
    document.querySelectorAll('#app.app:not(.hidden) > .main > section').forEach(function(section){
      section.classList.toggle('hidden',section!==intro);
    });
    intro.classList.remove('hidden');
  }

  function requestNotificationItem(request){
    var button=document.createElement('button');button.type='button';button.className='atsrs-shell-notification-item is-request';
    var title=document.createElement('strong'),detail=document.createElement('span'),email=document.createElement('small');title.textContent='Download request · '+(request.requester_name||'Verified requester');detail.textContent=request.requester_company||'Company not provided';email.textContent=request.requester_email||'';button.appendChild(title);button.appendChild(detail);button.appendChild(email);
    button.addEventListener('click',function(){var popover=byId('atsrsNotificationPopover');if(popover)popover.hidden=true;if(typeof window.showPage==='function'&&typeof navProfile!=='undefined')window.showPage('profile',navProfile);if(typeof window.showAccountTab==='function')window.showAccountTab('sharing');setTimeout(function(){var target=document.querySelector('.profile-sharing-link-request[data-request-id="'+CSS.escape(request.id)+'"]');if(target){target.classList.add('is-email-focus');target.scrollIntoView({behavior:'smooth',block:'center'});var approve=target.querySelector('button:not(.is-danger)');if(approve)approve.focus();}},180)});return button;
  }

  function renderNotificationPopover(){
    var popover=byId('atsrsNotificationPopover'),list=byId('atsrsShellNotificationList'),badge=byId('atsrsNotificationBadge');if(!popover||!list)return;
    var dismissed=[];try{dismissed=JSON.parse(localStorage.getItem('atsrs_dismissed_request_notifications')||'[]')}catch(_error){}
    list.textContent='';var requests=typeof window.atsrsGetOwnerShareRequests==='function'?window.atsrsGetOwnerShareRequests().filter(function(item){return item.status==='pending'&&!dismissed.includes(item.id)}):[];
    requests.forEach(function(request){list.appendChild(requestNotificationItem(request))});
    var serverItems=Array.prototype.slice.call(document.querySelectorAll('#atsrsNotificationList .atsrs-notification-item')).slice(0,5);
    serverItems.forEach(function(item){var copy=item.querySelector('.atsrs-notification-copy'),button=document.createElement('button');button.type='button';button.className='atsrs-shell-notification-item';button.innerHTML=copy?copy.innerHTML:item.innerHTML;button.addEventListener('click',function(){popover.hidden=true;var dashboard=byId('navDashboard');if(typeof window.showPage==='function'&&dashboard)window.showPage('dashboard',dashboard);setTimeout(function(){var panel=byId('atsrsNotificationPanel');if(panel)panel.scrollIntoView({behavior:'smooth',block:'center'})},120)});list.appendChild(button)});
    if(!list.children.length){var empty=document.createElement('div');empty.className='atsrs-shell-notification-empty';empty.textContent='No new notifications.';list.appendChild(empty)}
    if(badge){badge.textContent=String(requests.length);badge.hidden=!requests.length}
  }

  function clearNotificationPopover(){
    if(!window.confirm('Clear all notifications from the bell? Pending download requests will remain available in Profile Sharing.'))return;
    var requests=typeof window.atsrsGetOwnerShareRequests==='function'?window.atsrsGetOwnerShareRequests():[],dismissed=[];try{dismissed=JSON.parse(localStorage.getItem('atsrs_dismissed_request_notifications')||'[]')}catch(_error){}
    requests.forEach(function(request){if(request&&request.id&&!dismissed.includes(request.id))dismissed.push(request.id)});try{localStorage.setItem('atsrs_dismissed_request_notifications',JSON.stringify(dismissed.slice(-200)))}catch(_error){}
    document.querySelectorAll('#atsrsNotificationList [data-notification-dismiss]').forEach(function(button){button.click()});var popover=byId('atsrsNotificationPopover');if(popover)popover.hidden=true;renderNotificationPopover();
  }

  function openNotifications(){
    var popover=byId('atsrsNotificationPopover');if(!popover)return;popover.hidden=!popover.hidden;
    if(popover.hidden)return;
    if(typeof window.refreshShareRequests==='function')window.refreshShareRequests();
    if(typeof window.atsrsRefreshNotifications==='function')window.atsrsRefreshNotifications();
    setTimeout(renderNotificationPopover,180);
  }

  function updateNotificationLabel(){
    var button=byId('atsrsNotificationButton');
    if(!button)return;
    var count=byId('atsrsNotificationCount');
    var text=count?String(count.textContent||'').trim():'';
    button.setAttribute('aria-label',text?'Notifications, '+text:'Notifications');
    button.setAttribute('title',text?'Notifications — '+text:'Notifications');
  }

  function ensureNotificationButton(){
    var controls=byId('atsrsGlobalControls');
    var theme=byId('atsrsThemeToggle');
    if(!controls||!theme)return;
    var button=byId('atsrsNotificationButton');
    if(!button){
      button=document.createElement('button');
      button.id='atsrsNotificationButton';
      button.type='button';
      button.appendChild(icon('bell'));
      var badge=document.createElement('span');badge.id='atsrsNotificationBadge';badge.className='atsrs-notification-badge';badge.hidden=true;button.appendChild(badge);
      button.addEventListener('click',openNotifications);
    }
    if(button.parentElement!==controls||button.nextElementSibling!==theme)controls.insertBefore(button,theme);
    var popover=byId('atsrsNotificationPopover');if(!popover){popover=document.createElement('section');popover.id='atsrsNotificationPopover';popover.className='atsrs-notification-popover';popover.hidden=true;popover.innerHTML='<header><strong>Notifications</strong><button type="button" class="atsrs-notification-popover-close" aria-label="Clear all notifications" title="Clear all">×</button></header><div id="atsrsShellNotificationList" class="atsrs-shell-notification-list"></div>';controls.appendChild(popover);popover.querySelector('.atsrs-notification-popover-close').addEventListener('click',function(event){event.preventDefault();event.stopPropagation();clearNotificationPopover()})}
    renderNotificationPopover();
    updateNotificationLabel();
  }

  function observe(){
    if(document.body&&window.MutationObserver){
      new MutationObserver(function(){
        queueNavigation();
        ensureNotificationButton();
        updateNotificationLabel();
      }).observe(document.body,{attributes:true,attributeFilter:['class']});
    }
  }

  function boot(){
    if(!mobileStateInitialized){syncResponsiveShell();mobileStateInitialized=true;}
    decorateNavigation();
    ensureNotificationButton();
    ['applyLanguage','renderAll','changeLanguage','openApp','showPage'].forEach(wrapNavigationWriter);
    observe();
    window.addEventListener('atsrs:workspace-changed',function(){queueNavigation();ensureNotificationButton();closeMobileSidebar();stabilizeVisibleRoute()});
    window.addEventListener('atsrs:resume',function(){queueNavigation();ensureNotificationButton();updateNotificationLabel();queueResponsiveShellSync();stabilizeVisibleRoute()});
    window.addEventListener('atsrs:share-requests-updated',renderNotificationPopover);
    document.addEventListener('keydown',function(event){var popover=byId('atsrsNotificationPopover');if(event.key==='Escape'&&popover&&!popover.hidden){popover.hidden=true;var button=byId('atsrsNotificationButton');if(button)button.focus()}});
    document.addEventListener('pointerdown',function(event){var popover=byId('atsrsNotificationPopover'),button=byId('atsrsNotificationButton');if(popover&&!popover.hidden&&!popover.contains(event.target)&&event.target!==button&&!button.contains(event.target))popover.hidden=true});
    window.addEventListener('pageshow',function(){queueResponsiveShellSync();stabilizeVisibleRoute()});
    window.addEventListener('resize',queueResponsiveShellSync,{passive:true});
    window.addEventListener('orientationchange',queueResponsiveShellSync,{passive:true});
    if(window.visualViewport)window.visualViewport.addEventListener('resize',queueResponsiveShellSync,{passive:true});
    setTimeout(function(){decorateNavigation();ensureNotificationButton();updateNotificationLabel()},120);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
