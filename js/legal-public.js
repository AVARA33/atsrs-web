(function(){
  'use strict';
  function apply(theme){
    var next=theme==='light'?'light':'dark';
    document.documentElement.dataset.theme=next;
    document.documentElement.style.colorScheme=next;
    var meta=document.querySelector('meta[name="theme-color"]');
    if(meta)meta.setAttribute('content',next==='light'?'#edf2f8':'#050606');
  }
  var saved='';
  try{saved=localStorage.getItem('atsrs_theme')||'';}catch(error){}
  apply(saved==='light'||saved==='dark'?saved:(matchMedia('(prefers-color-scheme: light)').matches?'light':'dark'));
  window.addEventListener('storage',function(event){if(event.key==='atsrs_theme')apply(event.newValue);});
  function bindPublicThemeToggle(){
    document.querySelectorAll('[data-public-theme-toggle]').forEach(function(button){
      if(button.dataset.legalThemeBound==='true')return;
      button.dataset.legalThemeBound='true';
      function sync(){
        var light=document.documentElement.dataset.theme==='light';
        button.setAttribute('aria-checked',light?'true':'false');
        button.setAttribute('aria-label',light?'Switch to dark mode':'Switch to light mode');
      }
      button.addEventListener('click',function(){
        var next=document.documentElement.dataset.theme==='light'?'dark':'light';
        apply(next);
        try{localStorage.setItem('atsrs_theme',next);}catch(error){}
        sync();
      });
      sync();
    });
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bindPublicThemeToggle);
  else bindPublicThemeToggle();
})();
