/* ATSRS V460 global light and dark appearance control. */
(function(){
  'use strict';
  var KEY='atsrs_theme';

  function currentTheme(){
    return document.documentElement.dataset.theme==='light'?'light':'dark';
  }

  function saveTheme(theme){
    try{localStorage.setItem(KEY,theme);}catch(error){}
  }

  function syncButton(){
    var button=document.getElementById('atsrsThemeToggle');
    if(!button)return;
    var light=currentTheme()==='light';
    button.setAttribute('aria-label','Switch to '+(light?'dark':'light')+' mode');
    button.setAttribute('title','Switch to '+(light?'dark':'light')+' mode');
    button.setAttribute('aria-checked',light?'true':'false');
  }

  function applyTheme(theme,persist){
    theme=theme==='light'?'light':'dark';
    document.documentElement.dataset.theme=theme;
    document.documentElement.style.colorScheme=theme;
    var meta=document.querySelector('meta[name="theme-color"]');
    if(meta)meta.setAttribute('content',theme==='light'?'#f6f8fb':'#04101d');
    if(persist)saveTheme(theme);
    syncButton();
    window.dispatchEvent(new CustomEvent('atsrs:themechange',{detail:{theme:theme}}));
  }

  function syncPlacement(){
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
    var controls=document.getElementById('atsrsGlobalControls');
    if(!controls){
      controls=document.createElement('div');
      controls.id='atsrsGlobalControls';
      controls.className='atsrs-global-controls';
      controls.setAttribute('aria-label','Display and account controls');
      document.body.appendChild(controls);
    }

    var button=document.getElementById('atsrsThemeToggle');
    if(!button){
      button=document.createElement('button');
      button.id='atsrsThemeToggle';
    }
    button.className='atsrs-theme-toggle';
    button.type='button';
    button.setAttribute('role','switch');
    if(!button.querySelector('.atsrs-theme-track')){
      button.innerHTML=
        '<span class="atsrs-theme-track" aria-hidden="true">'+
          '<i class="ph ph-sun atsrs-theme-sun"></i>'+
          '<i class="ph ph-moon atsrs-theme-moon"></i>'+
          '<span class="atsrs-theme-thumb"></span>'+
        '</span>';
    }
    if(button.dataset.atsrsThemeBound!=='true'){
      button.addEventListener('click',function(){
        applyTheme(currentTheme()==='light'?'dark':'light',true);
      });
      button.dataset.atsrsThemeBound='true';
    }
    controls.appendChild(button);

    var workspace=document.getElementById('workspaceSwitcher');
    if(workspace)controls.appendChild(workspace);
  }

  function usesOwnDisclosure(control){
    return !!(
      control.closest('.personnel-filterbar')||
      control.id==='profilePhoneCountryCode'||
      control.id==='profileWhatsappCountryCode'
    );
  }

  function upgradeDisclosure(control){
    if(!control||control.dataset.atsrsDisclosureReady==='true'||usesOwnDisclosure(control))return;
    var isSelect=control.matches('select:not([multiple])');
    var isDate=control.matches('.atsrs-date-input');
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
    if(root&&root.matches)upgradeDisclosure(root);
    var scope=root&&root.querySelectorAll?root:document;
    Array.prototype.forEach.call(
      scope.querySelectorAll('select:not([multiple]),.atsrs-date-input'),
      upgradeDisclosure
    );
  }

  function bind(){
    ensureControls();
    applyTheme(currentTheme(),false);
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

  window.atsrsSetTheme=function(theme){applyTheme(theme,true);};
  window.addEventListener('storage',function(event){
    if(event.key===KEY)applyTheme(event.newValue==='light'?'light':'dark',false);
  });
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind);else bind();
})();
