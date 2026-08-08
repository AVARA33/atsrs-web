(function(){
  'use strict';
  function byId(id){return document.getElementById(id)}
  function number(id){
    var node=byId(id);if(!node)return 0;
    var value=parseInt(String(node.textContent||'').replace(/[^0-9-]/g,''),10);
    return Number.isFinite(value)?Math.max(0,value):0;
  }
  function companyMode(){return document.body.classList.contains('company-mode')}
  function icon(name,className){
    var node=document.createElement('i');
    node.className='ph ph-'+name+(className?' '+className:'');
    node.setAttribute('aria-hidden','true');
    return node;
  }
  function restoreAuthThemeTrack(theme){
    var track=theme&&theme.querySelector('.atsrs-theme-track');
    if(!track||track.querySelector('.atsrs-theme-sun'))return;
    track.textContent='';
    var sun=document.createElement('span'),moon=document.createElement('span'),thumb=document.createElement('span');
    sun.className='atsrs-theme-sun';sun.textContent='\u2600';
    moon.className='atsrs-theme-moon';moon.textContent='\u263e';
    thumb.className='atsrs-theme-thumb';
    track.appendChild(sun);track.appendChild(moon);track.appendChild(thumb);
  }
  function initials(value){
    return String(value||'ATSRS').trim().split(/\s+/).slice(0,2).map(function(part){return part.charAt(0)}).join('').toUpperCase()||'A';
  }
  function setButtonIcon(button,name,position){
    if(!button||button.querySelector('.sage-button-icon'))return;
    var node=icon(name,'sage-button-icon');
    if(position==='end')button.appendChild(node);else button.insertBefore(node,button.firstChild);
  }
  function setNav(button,label,name){
    if(!button)return;
    var labelNode=button.querySelector('.sage-nav-label');
    if(!labelNode){
      button.textContent='';
      button.appendChild(icon(name,'sage-nav-icon'));
      labelNode=document.createElement('span');
      labelNode.className='sage-nav-label';
      button.appendChild(labelNode);
    }
    if(labelNode.textContent!==label)labelNode.textContent=label;
  }
  function openAccountTab(tab,button){
    if(typeof window.showPage==='function'&&byId('navProfile'))window.showPage('profile',byId('navProfile'));
    if(typeof window.showAccountTab==='function')window.showAccountTab(tab);
    document.querySelectorAll('#app .nav button').forEach(function(node){node.classList.toggle('active',node===button)});
  }
  function ensurePersonalAccountNav(){
    var nav=byId('navProfile')&&byId('navProfile').parentElement;
    if(!nav)return;
    var security=byId('sageNavSecurity');
    if(!security){
      security=document.createElement('button');
      security.id='sageNavSecurity';security.type='button';
      security.addEventListener('click',function(){openAccountTab('security',security)});
      byId('navProfile').insertAdjacentElement('afterend',security);
    }
    var sharing=byId('sageNavSharing');
    if(!sharing){
      sharing=document.createElement('button');
      sharing.id='sageNavSharing';sharing.type='button';
      sharing.addEventListener('click',function(){openAccountTab('sharing',sharing)});
      security.insertAdjacentElement('afterend',sharing);
    }
    setNav(security,'Security','shield-check');
    setNav(sharing,'Privacy & Sharing','link');
  }
  function decorateNavigation(){
    ensurePersonalAccountNav();
    setNav(byId('navDashboard'),'Dashboard','gauge');
    setNav(byId('navCandidates'),'Candidates','user-list');
    setNav(byId('navPersonnel'),'Personnel','users-three');
    setNav(byId('navCredentials'),'Company Credentials','folder-open');
    setNav(byId('navCertificates'),'Documents','folder-open');
    setNav(byId('navRefs'),companyMode()?'References':'References & CV','books');
    setNav(byId('navCompliance'),'Compliance','shield-check');
    setNav(byId('navReports'),'Reports','chart-bar');
    setNav(byId('navProfile'),companyMode()?'Company':'Profile',companyMode()?'buildings':'user-circle');
    setNav(byId('navIntro'),'Product Updates','sparkle');
    setNav(byId('navPrivacy'),'Privacy','shield-check');
    if(companyMode()&&byId('navDashboard')&&byId('navPersonnel')&&byId('navCandidates')){
      byId('navDashboard').insertAdjacentElement('afterend',byId('navPersonnel'));
      byId('navPersonnel').insertAdjacentElement('afterend',byId('navCandidates'));
    }
  }
  function decorateHeader(){
    var title=byId('pageTitle');
    var accountTitle=companyMode()?'Corporate Account':'Personal Account';
    if(title&&title.textContent!==accountTitle)title.textContent=accountTitle;
    var app=byId('app'),appVisible=!!(app&&!app.classList.contains('hidden'));
    var controls=byId('atsrsGlobalControls'),theme=byId('atsrsThemeToggle'),bell=byId('sageNotificationButton');
    if(controls&&theme&&appVisible){
      if(!bell){
        bell=document.createElement('button');
        bell.id='sageNotificationButton';bell.className='sage-header-icon-button';bell.type='button';
        bell.setAttribute('aria-label','Notifications');bell.appendChild(icon('bell'));
        bell.addEventListener('click',function(){
          if(typeof window.showPage==='function'&&byId('navDashboard'))window.showPage('dashboard',byId('navDashboard'));
          var panel=byId('atsrsNotificationPanel');
          if(panel){panel.classList.remove('hidden');panel.scrollIntoView({behavior:'smooth',block:'center'});}
        });
        controls.insertBefore(bell,theme);
      }
      bell.classList.remove('hidden');
      var track=theme.querySelector('.atsrs-theme-track');
      if(track){
        var themeName=document.documentElement.dataset.theme==='dark'?'sun':'moon';
        if(!track.querySelector('.ph-'+themeName)){track.textContent='';track.appendChild(icon(themeName));}
      }
    }else{
      if(bell)bell.classList.add('hidden');
      restoreAuthThemeTrack(theme);
    }
    var avatar=byId('workspaceSwitcherAvatar'),name=byId('workspaceSwitcherName');
    if(avatar){
      var avatarImage=avatar.querySelector('img');
      if(!avatarImage){
        var value=initials(name&&name.textContent);
        if(avatar.textContent!==value)avatar.textContent=value;
      }
    }
    var chevron=document.querySelector('#workspaceSwitcherButton .workspace-switcher-chevron');
    if(chevron&&!chevron.querySelector('.ph')){chevron.textContent='';chevron.appendChild(icon('caret-down'));}
  }
  function decorateStats(){
    var stats={totalPersonnel:'users-three',totalCerts:'file-text',exp90:'clock',exp30:'warning',expToday:'calendar-blank',expired:'x-circle',cvStatusDash:'user-circle'};
    Object.keys(stats).forEach(function(id){
      var value=byId(id),card=value&&value.closest('.card');
      if(!card||card.querySelector('.sage-stat-icon'))return;
      var copy=document.createElement('span');copy.className='sage-stat-copy';
      Array.from(card.children).forEach(function(child){copy.appendChild(child)});
      card.appendChild(icon(stats[id],'sage-stat-icon'));card.appendChild(copy);
    });
  }
  function decorateActions(){
    var actions=document.querySelectorAll('.sage-hero-actions button');
    var badge=byId('soloBadge'),copy=byId('soloHeroText');
    if(badge){badge.textContent=companyMode()?'PERSONNEL DOCUMENT CONTROL':'';badge.classList.toggle('hidden',!companyMode());}
    if(copy)copy.textContent=companyMode()
      ?'See which document dates need action, request updates from personnel and keep a traceable review history.'
      :'Keep your documents up to date and share only what is needed. We will help you stay ready for opportunities that matter.';
    if(actions[0]){
      actions[0].childNodes.forEach(function(node){if(node.nodeType===3)node.textContent=companyMode()?'Review priority queue':'Resolve next item'});
      actions[0].onclick=companyMode()?function(){var target=byId('riskTitle');if(target)target.scrollIntoView({behavior:'smooth',block:'start'});}:window.atsrsSageOpenDocuments;
    }
    if(actions[1]){
      actions[1].childNodes.forEach(function(node){if(node.nodeType===3)node.textContent=companyMode()?'Add from Candidates':'Add document'});
      actions[1].onclick=companyMode()?function(){if(typeof window.showPage==='function'&&byId('navCandidates'))window.showPage('candidates',byId('navCandidates'));}:window.atsrsSageOpenDocuments;
    }
    setButtonIcon(actions[0],'arrow-right','end');
    setButtonIcon(actions[1],'plus');
    setButtonIcon(document.querySelector('.sage-ledger-heading>button'),'folder-open');
  }
  function decorateLedger(){
    document.querySelectorAll('#sageDashboardLedgerBody tr').forEach(function(row){
      var first=row.children[0];
      if(first&&row.children.length>1&&!first.querySelector('.sage-row-icon'))first.insertBefore(icon('file-text','sage-row-icon'),first.firstChild);
      var action=row.children[4]&&row.children[4].querySelector('button');
      setButtonIcon(action,'arrow-right','end');
      var status=row.children[3];
      if(status){
        var value=String(status.textContent||'').toLowerCase();
        status.classList.toggle('sage-status-danger',/expired/.test(value));
        status.classList.toggle('sage-status-warn',/today|day|soon/.test(value)&&!/expired/.test(value));
        status.classList.toggle('sage-status-good',/valid|current|ready/.test(value));
      }
    });
  }
  function decorate(){decorateNavigation();decorateHeader();decorateStats();decorateActions();decorateLedger()}
  function syncReadiness(){
    var total=number('totalCerts');
    var risk=number('expired')+number('expToday')+number('exp30')+number('exp90');
    var current=Math.max(0,total-risk);
    var score=total?Math.round(current/total*100):0;
    var value=byId('sageReadinessValue'),progress=byId('sageReadinessProgress'),note=byId('sageReadinessNote');
    if(value)value.textContent=String(score);
    if(progress)progress.style.width=score+'%';
    if(note)note.textContent=total
      ?current+' of '+total+' uploaded documents are outside the displayed risk windows.'
      :'Calculated from uploaded document dates.';
  }
  function cleanCell(cell){
    var clone=cell.cloneNode(true);
    clone.querySelectorAll('input[type="checkbox"],.atsrs-document-select-column').forEach(function(node){node.remove()});
    return clone;
  }
  function syncLedger(){
    var source=byId('certTable'),target=byId('sageDashboardLedgerBody');
    if(!target)return;
    var query=String((byId('sageLedgerSearch')||{}).value||'').trim().toLowerCase();
    var rows=source?Array.from(source.querySelectorAll('tr')):[];
    var shown=rows.filter(function(row){return !query||String(row.textContent||'').toLowerCase().indexOf(query)!==-1}).slice(0,6);
    target.innerHTML='';
    if(!shown.length){
      var empty=document.createElement('tr');
      empty.innerHTML='<td colspan="5">'+(query?'No matching documents.':'No documents uploaded yet.')+'</td>';
      target.appendChild(empty);return;
    }
    shown.forEach(function(row){
      var next=document.createElement('tr');
      var cells=Array.from(row.children);
      var selected=cells.length>=7?[cells[1],cells[2],cells[3],cells[5]]:cells.filter(function(cell){return !cell.classList.contains('atsrs-document-select-column')}).slice(0,4);
      selected.forEach(function(cell){if(cell)next.appendChild(cleanCell(cell))});
      while(next.children.length<4){next.appendChild(document.createElement('td'))}
      var action=document.createElement('td'),button=document.createElement('button');
      button.type='button';button.className='sage-ledger-view';button.textContent='View';button.addEventListener('click',window.atsrsSageOpenDocuments);
      action.appendChild(button);next.appendChild(action);
      target.appendChild(next);
    });
    decorateLedger();
  }
  function sync(){syncReadiness();syncLedger();decorate()}
  window.atsrsSageOpenDocuments=function(){
    if(companyMode()&&typeof window.showCompanyCredentials==='function')return window.showCompanyCredentials('documents');
    if(typeof window.showPage==='function'&&byId('navCertificates'))return window.showPage('certificates',byId('navCertificates'));
  };
  function observe(id){var node=byId(id);if(node)new MutationObserver(sync).observe(node,{childList:true,subtree:true,characterData:true})}
  document.addEventListener('DOMContentLoaded',function(){
    ['totalCerts','expired','expToday','exp30','exp90','certTable'].forEach(observe);
    var navigation=byId('navIntro')&&byId('navIntro').parentElement;
    if(navigation&&!navigation.__atsrsSageNavigationObserver){
      navigation.__atsrsSageNavigationObserver=true;
      new MutationObserver(function(){
        var updates=byId('navIntro');
        if(updates&&!updates.querySelector('.sage-nav-icon'))decorateNavigation();
      }).observe(navigation,{childList:true,subtree:true,characterData:true});
    }
    var title=byId('pageTitle');if(title)new MutationObserver(decorateHeader).observe(title,{childList:true,characterData:true,subtree:true});
    var app=byId('app');if(app)new MutationObserver(decorateHeader).observe(app,{attributes:true,attributeFilter:['class']});
    var search=byId('sageLedgerSearch');if(search)search.addEventListener('input',syncLedger);
    sync();setTimeout(sync,250);setTimeout(sync,900);
  });
  window.addEventListener('atsrs:workspace-switched',function(){setTimeout(sync,0)});
  window.addEventListener('atsrs:workspace-changed',function(){setTimeout(sync,0)});
  window.addEventListener('atsrs:themechange',function(){setTimeout(decorateHeader,0)});
})();
