(function(){
  'use strict';
  function apply(){
    document.documentElement.dataset.theme='dark';
    document.documentElement.style.colorScheme='dark';
    var meta=document.querySelector('meta[name="theme-color"]');
    if(meta)meta.setAttribute('content','#050606');
    try{localStorage.removeItem('atsrs_theme');localStorage.removeItem('atsrs_public_theme');}catch(error){}
  }
  apply();
  function removePublicThemeToggle(){
    document.querySelectorAll('[data-public-theme-toggle]').forEach(function(button){button.remove();});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',removePublicThemeToggle);
  else removePublicThemeToggle();
})();
