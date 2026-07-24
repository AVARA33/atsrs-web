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
    button.innerHTML='<span class="atsrs-theme-toggle-icon" aria-hidden="true">'+(light?'☾':'☀')+'</span><span class="atsrs-theme-toggle-label">'+(light?'Dark':'Light')+'</span>';
    button.setAttribute('aria-label','Switch to '+(light?'dark':'light')+' mode');
    button.setAttribute('title','Switch to '+(light?'dark':'light')+' mode');
    button.setAttribute('aria-pressed',light?'true':'false');
  }

  function applyTheme(theme,persist){
    theme=theme==='light'?'light':'dark';
    document.documentElement.dataset.theme=theme;
    document.documentElement.style.colorScheme=theme;
    var meta=document.querySelector('meta[name="theme-color"]');
    if(meta)meta.setAttribute('content',theme==='light'?'#f4f7fa':'#07111d');
    if(persist)saveTheme(theme);
    syncButton();
    window.dispatchEvent(new CustomEvent('atsrs:themechange',{detail:{theme:theme}}));
  }

  function syncPlacement(){
    var app=document.getElementById('app');
    document.body.classList.toggle('atsrs-app-visible',!!(app&&!app.classList.contains('hidden')));
  }

  function bind(){
    if(!document.getElementById('atsrsThemeToggle')){
      var button=document.createElement('button');
      button.id='atsrsThemeToggle';
      button.className='atsrs-theme-toggle';
      button.type='button';
      button.addEventListener('click',function(){
        applyTheme(currentTheme()==='light'?'dark':'light',true);
      });
      document.body.appendChild(button);
    }
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
