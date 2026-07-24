/* ATSRS global light and dark appearance control. */
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
    if(meta)meta.setAttribute('content',theme==='light'?'#f6f8fb':'#07111d');
    if(persist)saveTheme(theme);
    syncButton();
    window.dispatchEvent(new CustomEvent('atsrs:themechange',{detail:{theme:theme}}));
  }

  function syncPlacement(){
    var app=document.getElementById('app');
    var appVisible=!!(app&&!app.classList.contains('hidden'));
    document.body.classList.toggle('atsrs-app-visible',appVisible);
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
          '<span class="atsrs-theme-sun">&#9728;</span>'+
          '<span class="atsrs-theme-moon">&#9790;</span>'+
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

  function bind(){
    ensureControls();
    applyTheme(currentTheme(),false);
    syncPlacement();

    var app=document.getElementById('app');
    if(app&&window.MutationObserver){
      new MutationObserver(syncPlacement).observe(app,{attributes:true,attributeFilter:['class']});
    }
  }

  window.atsrsSetTheme=function(theme){applyTheme(theme,true);};
  window.addEventListener('storage',function(event){
    if(event.key===KEY)applyTheme(event.newValue==='light'?'light':'dark',false);
  });
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind);else bind();
})();
