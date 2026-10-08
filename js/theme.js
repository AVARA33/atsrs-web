/* ATSRS V6242 dark-only appearance and account control placement. */
(function(){
  'use strict';
  function applyTheme(){
    document.documentElement.dataset.theme='dark';
    document.documentElement.style.colorScheme='dark';
    var meta=document.querySelector('meta[name="theme-color"]');
    if(meta)meta.setAttribute('content','#050606');
    if(typeof window.atsrsSyncFavicon==='function')window.atsrsSyncFavicon('dark');
    try{localStorage.removeItem('atsrs_theme');localStorage.removeItem('atsrs_public_theme');}catch(error){}
    window.dispatchEvent(new CustomEvent('atsrs:themechange',{detail:{theme:'dark'}}));
  }

  function isPublicView(){
    return !!(document.body&&document.body.classList.contains('atsrs-public-view'));
  }

  function removeControls(){
    var controls=document.getElementById('atsrsGlobalControls');
    var workspace=document.getElementById('workspaceSwitcher');
    if(workspace&&controls&&controls.contains(workspace)){
      document.body.appendChild(workspace);
      workspace.hidden=true;
    }
    if(controls)controls.remove();
    if(document.body)document.body.classList.remove('atsrs-app-visible');
  }

  function syncPlacement(){
    if(isPublicView()){removeControls();return;}
    var app=document.getElementById('app');
    var appVisible=!!(app&&!app.classList.contains('hidden'));
    var controls=document.getElementById('atsrsGlobalControls');
    var main=app&&app.querySelector(':scope > .main');
    document.body.classList.toggle('atsrs-app-visible',appVisible);
    if(controls){
      if(appVisible&&main&&controls.parentElement!==main)main.insertBefore(controls,main.firstChild);
      else if(!appVisible&&controls.parentElement!==document.body)document.body.appendChild(controls);
    }
    var workspace=document.getElementById('workspaceSwitcher');
    if(workspace)workspace.hidden=!appVisible;
  }

  function ensureControls(){
    if(isPublicView()){removeControls();return null;}
    var controls=document.getElementById('atsrsGlobalControls');
    if(!controls){
      controls=document.createElement('div');
      controls.id='atsrsGlobalControls';
      controls.className='atsrs-global-controls';
      controls.setAttribute('aria-label','Display and account controls');
      document.body.appendChild(controls);
    }

    var button=document.getElementById('atsrsThemeToggle');
    if(button)button.remove();

    var workspace=document.getElementById('workspaceSwitcher');
    if(workspace)controls.appendChild(workspace);
    if(typeof window.atsrsMountAccountLanguage==='function')window.atsrsMountAccountLanguage();
  }

  function usesOwnDisclosure(control){
    return !!(
      control.hasAttribute('data-atsrs-native-select')||
      control.closest('.personnel-filterbar')||
      control.closest('.jobs-select-host')||
      control.id==='profilePhoneCountryCode'||
      control.id==='profileWhatsappCountryCode'
    );
  }

  function upgradeDisclosure(control){
    if(!control||control.dataset.atsrsDisclosureReady==='true'||usesOwnDisclosure(control))return;
    var isSelect=control.localName==='select'&&!control.hasAttribute('multiple');
    var isDate=control.classList.contains('atsrs-date-input');
    if(!isSelect&&!isDate)return;
    var shell=document.createElement('span');
    shell.className='atsrs-disclosure-shell';
    var indicator=document.createElement('span');
    indicator.className='atsrs-disclosure-indicator';
    indicator.setAttribute('aria-hidden','true');
    control.parentNode.insertBefore(shell,control);
    shell.appendChild(control);
    shell.appendChild(indicator);
    control.dataset.atsrsDisclosureReady='true';
  }

  function upgradeDisclosures(root){
    if(root&&root.nodeType===1)upgradeDisclosure(root);
    var scope=root&&root.querySelectorAll?root:document;
    Array.prototype.forEach.call(
      scope.querySelectorAll('select:not([multiple]),.atsrs-date-input'),
      upgradeDisclosure
    );
  }

  function bind(){
    ensureControls();
    applyTheme();
    syncPlacement();
    upgradeDisclosures(document);

    var app=document.getElementById('app');
    if(app&&window.MutationObserver){
      new MutationObserver(syncPlacement).observe(app,{attributes:true,attributeFilter:['class']});
    }
    if(document.body&&window.MutationObserver){
      new MutationObserver(function(records){
        records.forEach(function(record){
          Array.prototype.forEach.call(record.addedNodes,function(node){
            if(node.nodeType===1)upgradeDisclosures(node);
          });
        });
      }).observe(document.body,{childList:true,subtree:true});
    }
  }

  window.atsrsSetTheme=function(){applyTheme();};
  window.atsrsRemoveThemeControls=removeControls;
  window.atsrsEnsureThemeControls=ensureControls;
  window.atsrsSyncThemePlacement=syncPlacement;
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind);else bind();
})();
