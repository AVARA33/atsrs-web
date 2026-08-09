/* ATSRS V438 — stable workspace navigation and authenticated header controls. */
(function(){
  'use strict';

  var ICONS={
    navDashboard:'squares-four',
    navCandidates:'user-list',
    navPersonnel:'users-three',
    navCredentials:'file',
    navCertificates:'file',
    navRefs:'file-text',
    navCompliance:'shield-check',
    navReports:'chart-bar',
    navProfile:'user-circle',
    navIntro:'sparkle',
    navPrivacy:'lock-simple'
  };

  var DEFAULT_LABELS={
    navDashboard:'Dashboard',
    navCandidates:'Candidates',
    navPersonnel:'Personnel',
    navCredentials:'Company Credentials',
    navCertificates:'Documents',
    navRefs:'References & CV',
    navCompliance:'Compliance',
    navReports:'Reports',
    navProfile:'Profile',
    navIntro:'Product Updates',
    navPrivacy:'Privacy'
  };

  var PERSONAL_LABELS={
    navDashboard:'Dashboard',
    navCertificates:'Documents',
    navRefs:'References & CV',
    navCompliance:'Security',
    navProfile:'Profile',
    navIntro:'Product Updates',
    navPrivacy:'Privacy'
  };

  var COMPANY_LABELS={
    navDashboard:'Dashboard',
    navCandidates:'Candidates',
    navPersonnel:'Personnel',
    navCredentials:'Company Credentials',
    navCompliance:'Compliance',
    navReports:'Reports',
    navProfile:'Company',
    navIntro:'Product Updates',
    navPrivacy:'Privacy'
  };

  var navSyncQueued=false;

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
  }

  function queueNavigation(){
    if(navSyncQueued)return;
    navSyncQueued=true;
    setTimeout(function(){navSyncQueued=false;decorateNavigation()},0);
  }

  function openNotifications(){
    var dashboard=byId('navDashboard');
    if(typeof window.showPage==='function'&&dashboard)window.showPage('dashboard',dashboard);
    if(typeof window.atsrsRefreshNotifications==='function')window.atsrsRefreshNotifications();
    setTimeout(function(){
      var panel=byId('atsrsNotificationPanel');
      if(panel)panel.scrollIntoView({behavior:'smooth',block:'center'});
    },160);
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
      button.addEventListener('click',openNotifications);
    }
    if(button.parentElement!==controls||button.nextElementSibling!==theme)controls.insertBefore(button,theme);
    updateNotificationLabel();
  }

  function observe(){
    var nav=document.querySelector('#app .sidebar .nav');
    if(nav&&window.MutationObserver){
      new MutationObserver(queueNavigation).observe(nav,{childList:true,subtree:true,characterData:true});
    }
    if(document.body&&window.MutationObserver){
      new MutationObserver(function(){
        queueNavigation();
        ensureNotificationButton();
        updateNotificationLabel();
      }).observe(document.body,{attributes:true,attributeFilter:['class'],childList:true,subtree:true});
    }
  }

  function boot(){
    decorateNavigation();
    ensureNotificationButton();
    observe();
    window.addEventListener('atsrs:workspace-changed',function(){queueNavigation();ensureNotificationButton()});
    window.addEventListener('atsrs:resume',function(){queueNavigation();ensureNotificationButton();updateNotificationLabel()});
    setTimeout(function(){decorateNavigation();ensureNotificationButton();updateNotificationLabel()},120);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
