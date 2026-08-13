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
})();
