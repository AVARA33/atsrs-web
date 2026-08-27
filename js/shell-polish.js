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
    var button=document.createElement('button');button.type='button';button.className='atsrs-shell-notification-item is-request is-success';
    var icon=document.createElement('i'),copy=document.createElement('span'),title=document.createElement('strong'),detail=document.createElement('span'),meta=document.createElement('span'),time=document.createElement('time'),unread=document.createElement('span'),requester=request.requester_name||'Verified requester',company=request.requester_company||'company not provided';icon.className='ph ph-download-simple atsrs-shell-notification-icon';icon.setAttribute('aria-hidden','true');copy.className='atsrs-shell-notification-copy';title.textContent='Download request';detail.textContent=requester+' from '+company+' requested download access.';meta.className='atsrs-shell-notification-meta';time.textContent='Now';unread.className='atsrs-shell-notification-unread';unread.setAttribute('aria-label','Unread');copy.appendChild(title);copy.appendChild(detail);meta.appendChild(time);meta.appendChild(unread);button.appendChild(icon);button.appendChild(copy);button.appendChild(meta);
    button.addEventListener('click',function(event){
      event.preventDefault();event.stopPropagation();
      var popover=byId('atsrsNotificationPopover');if(popover)popover.hidden=true;
      var params=new URLSearchParams(location.search);params.set('route','profile');params.set('tab','sharing');params.set('request',request.id);params.set('intent','approve');history.replaceState(null,'',location.pathname+'?'+params.toString());
      var profileButton=byId('navProfile');if(typeof window.showPage==='function'&&profileButton)window.showPage('profile',profileButton);
      function reveal(){
        if(typeof window.showProfileWorkspaceTab==='function')window.showProfileWorkspaceTab('sharing',false);
        if(typeof window.showAccountTab==='function')window.showAccountTab('sharing');
        var target=document.querySelector('.profile-sharing-link-request[data-request-id="'+CSS.escape(request.id)+'"]');
        if(target){target.classList.add('is-email-focus');target.scrollIntoView({behavior:'smooth',block:'center'});var approve=target.querySelector('button:not(.is-danger)');if(approve)approve.focus();return true}
        return false;
      }
      [0,120,320,700,1400,2400].forEach(function(delay){setTimeout(reveal,delay)});
      if(typeof window.refreshShareRequests==='function')Promise.resolve(window.refreshShareRequests()).then(reveal).catch(function(){});
    });return button;
  }

  function notificationVisualType(title,severity){
    var value=((title||'')+' '+(severity||'')).toLowerCase();
    if(value.indexOf('reference')>=0||value.indexOf('personnel')>=0)return {name:'people',icon:'user-circle'};
    if(value.indexOf('expir')>=0||value.indexOf('warning')>=0||value.indexOf('urgent')>=0)return {name:'warning',icon:'warning'};
    if(value.indexOf('upload')>=0)return {name:'upload',icon:'upload-simple'};
    if(value.indexOf('approv')>=0||value.indexOf('success')>=0)return {name:'success',icon:'seal-check'};
    return {name:'info',icon:'info'};
  }

  function relativeNotificationTime(value){
    if(!value)return '';
    var parsed=Date.parse(value);if(!Number.isFinite(parsed))return value.length<=8?value:'';
    var seconds=Math.max(0,Math.floor((Date.now()-parsed)/1000));
    if(seconds<60)return 'Now';
    var minutes=Math.floor(seconds/60);if(minutes<60)return minutes+'m ago';
    var hours=Math.floor(minutes/60);if(hours<24)return hours+'h ago';
    return Math.floor(hours/24)+'d ago';
  }

  function serverNotificationItem(item,popover){
    var source=item.querySelector('.atsrs-notification-copy'),titleNode=source&&source.querySelector('b'),descriptionNode=source&&source.querySelector('p'),timeNode=source&&source.querySelector('time');
    var titleText=titleNode?titleNode.textContent.trim():'Document notification',descriptionText=descriptionNode?descriptionNode.textContent.trim():'',timeText=relativeNotificationTime(timeNode?timeNode.textContent.trim():''),visual=notificationVisualType(titleText,item.getAttribute('data-severity')),unread=item.classList.contains('is-unread');
    var button=document.createElement('button'),icon=document.createElement('i'),copy=document.createElement('span'),title=document.createElement('strong'),description=document.createElement('span'),meta=document.createElement('span'),time=document.createElement('time');
    button.type='button';button.className='atsrs-shell-notification-item is-'+visual.name+(unread?' is-unread':'');icon.className='ph ph-'+visual.icon+' atsrs-shell-notification-icon';icon.setAttribute('aria-hidden','true');copy.className='atsrs-shell-notification-copy';title.textContent=titleText;description.textContent=descriptionText;meta.className='atsrs-shell-notification-meta';time.textContent=timeText;copy.appendChild(title);if(descriptionText)copy.appendChild(description);meta.appendChild(time);if(unread){var dot=document.createElement('span');dot.className='atsrs-shell-notification-unread';dot.setAttribute('aria-label','Unread');meta.appendChild(dot)}button.appendChild(icon);button.appendChild(copy);button.appendChild(meta);
    button.addEventListener('click',function(){closeNotifications(false);var dashboard=byId('navDashboard');if(typeof window.showPage==='function'&&dashboard)window.showPage('dashboard',dashboard);setTimeout(function(){var panel=byId('atsrsNotificationPanel');if(panel)panel.scrollIntoView({behavior:'smooth',block:'center'})},120)});
    return button;
  }

  function renderNotificationPopover(){
    var popover=byId('atsrsNotificationPopover'),list=byId('atsrsShellNotificationList'),badge=byId('atsrsNotificationBadge');if(!popover||!list)return;
    var dismissed=[];try{dismissed=JSON.parse(localStorage.getItem('atsrs_dismissed_request_notifications')||'[]')}catch(_error){}
    list.textContent='';var requests=typeof window.atsrsGetOwnerShareRequests==='function'?window.atsrsGetOwnerShareRequests().filter(function(item){return item.status==='pending'&&!dismissed.includes(item.id)}):[];
    requests.forEach(function(request){list.appendChild(requestNotificationItem(request))});
    var serverItems=Array.prototype.slice.call(document.querySelectorAll('#atsrsNotificationList .atsrs-notification-item'));
    serverItems.forEach(function(item){list.appendChild(serverNotificationItem(item,popover))});
    if(!list.children.length){var empty=document.createElement('div');empty.className='atsrs-shell-notification-empty';empty.textContent='No new notifications.';list.appendChild(empty)}
    var unreadCount=requests.length+serverItems.filter(function(item){return item.classList.contains('is-unread')}).length;
    if(badge){badge.textContent=String(unreadCount);badge.hidden=unreadCount===0}
    var markAll=popover.querySelector('.atsrs-notification-popover-mark-all');if(markAll)markAll.disabled=unreadCount===0;
  }

  function markNotificationPopoverRead(){
    var requests=typeof window.atsrsGetOwnerShareRequests==='function'?window.atsrsGetOwnerShareRequests():[],dismissed=[];try{dismissed=JSON.parse(localStorage.getItem('atsrs_dismissed_request_notifications')||'[]')}catch(_error){}
    requests.forEach(function(request){if(request&&request.id&&!dismissed.includes(request.id))dismissed.push(request.id)});try{localStorage.setItem('atsrs_dismissed_request_notifications',JSON.stringify(dismissed.slice(-200)))}catch(_error){}
    var markAll=byId('atsrsMarkAllRead');if(markAll&&!markAll.disabled)markAll.click();renderNotificationPopover();setTimeout(renderNotificationPopover,240);
  }

  function closeNotifications(restoreFocus){
    var popover=byId('atsrsNotificationPopover'),button=byId('atsrsNotificationButton');if(!popover)return;popover.hidden=true;if(button){button.setAttribute('aria-expanded','false');if(restoreFocus)button.focus()}
  }

  function navigateToNotificationCenter(){
    closeNotifications(false);var dashboard=byId('navDashboard');if(typeof window.showPage==='function'&&dashboard)window.showPage('dashboard',dashboard);setTimeout(function(){var panel=byId('atsrsNotificationPanel');if(panel)panel.scrollIntoView({behavior:'smooth',block:'center'})},120);
  }

  function syncNotificationPopoverCaret(){
    var controls=byId('atsrsGlobalControls'),button=byId('atsrsNotificationButton'),popover=byId('atsrsNotificationPopover');
    if(!controls||!button||!popover)return;
    var controlsRect=controls.getBoundingClientRect(),buttonRect=button.getBoundingClientRect();
    var desktopPanelWidth=340,desktopRightNudge=16,panelWidth=Math.min(desktopPanelWidth,Math.max(0,window.innerWidth-24)),desiredLeft=controlsRect.right-panelWidth+desktopRightNudge,clampedLeft=Math.max(12,Math.min(desiredLeft,window.innerWidth-12-panelWidth)),caretLeft=Math.max(18,Math.min(panelWidth-30,(buttonRect.left+(buttonRect.width/2))-clampedLeft-6));
    popover.style.setProperty('--atsrs-notification-left',Math.round(clampedLeft)+'px');
    popover.style.setProperty('--atsrs-notification-top',Math.round(buttonRect.bottom+10)+'px');
    popover.style.setProperty('--atsrs-notification-caret-left',Math.round(caretLeft)+'px');
  }

  function openNotifications(){
    var popover=byId('atsrsNotificationPopover'),button=byId('atsrsNotificationButton');if(!popover||!button)return;syncNotificationPopoverCaret();popover.hidden=!popover.hidden;button.setAttribute('aria-expanded',popover.hidden?'false':'true');
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
      button.setAttribute('aria-label','Notifications');
      button.setAttribute('aria-expanded','false');
      button.setAttribute('aria-controls','atsrsNotificationPopover');
      button.appendChild(icon('bell'));
      var badge=document.createElement('span');badge.id='atsrsNotificationBadge';badge.className='atsrs-notification-badge';badge.hidden=true;button.appendChild(badge);
      button.addEventListener('click',openNotifications);
    }
    button.setAttribute('aria-label','Notifications');
    button.setAttribute('aria-expanded',button.getAttribute('aria-expanded')==='true'?'true':'false');
    button.setAttribute('aria-controls','atsrsNotificationPopover');
    if(button.parentElement!==controls||button.nextElementSibling!==theme)controls.insertBefore(button,theme);
    var popover=byId('atsrsNotificationPopover');if(!popover){popover=document.createElement('section');popover.id='atsrsNotificationPopover';popover.className='atsrs-notification-popover';popover.hidden=true;popover.setAttribute('role','dialog');popover.setAttribute('aria-label','Notifications');popover.innerHTML='<div class="atsrs-notification-popover-surface"><header><strong>Notifications</strong><div class="atsrs-notification-popover-actions"><button type="button" class="atsrs-notification-popover-mark-all">Mark all as read</button><button type="button" class="atsrs-notification-popover-settings" aria-label="Notification settings"><i class="ph ph-gear" aria-hidden="true"></i></button></div></header><div id="atsrsShellNotificationList" class="atsrs-shell-notification-list"></div><button type="button" class="atsrs-notification-popover-view-all">View all notifications</button></div>';controls.appendChild(popover);popover.querySelector('.atsrs-notification-popover-mark-all').addEventListener('click',function(event){event.preventDefault();event.stopPropagation();markNotificationPopoverRead()});popover.querySelector('.atsrs-notification-popover-settings').addEventListener('click',navigateToNotificationCenter);popover.querySelector('.atsrs-notification-popover-view-all').addEventListener('click',navigateToNotificationCenter)}
    syncNotificationPopoverCaret();
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
    document.addEventListener('keydown',function(event){var popover=byId('atsrsNotificationPopover');if(event.key==='Escape'&&popover&&!popover.hidden)closeNotifications(true)});
    document.addEventListener('pointerdown',function(event){var popover=byId('atsrsNotificationPopover'),button=byId('atsrsNotificationButton');if(popover&&button&&!popover.hidden&&!popover.contains(event.target)&&event.target!==button&&!button.contains(event.target))closeNotifications(false)});
    window.addEventListener('pageshow',function(){queueResponsiveShellSync();stabilizeVisibleRoute()});
    window.addEventListener('resize',function(){queueResponsiveShellSync();syncNotificationPopoverCaret()},{passive:true});
    window.addEventListener('orientationchange',queueResponsiveShellSync,{passive:true});
    if(window.visualViewport)window.visualViewport.addEventListener('resize',queueResponsiveShellSync,{passive:true});
    setTimeout(function(){decorateNavigation();ensureNotificationButton();updateNotificationLabel()},120);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
