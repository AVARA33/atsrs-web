(function(){
  'use strict';
  function apply(theme){
    var next=theme==='light'?'light':'dark';
    document.documentElement.dataset.theme=next;
    document.documentElement.style.colorScheme='dark';
    var meta=document.querySelector('meta[name="theme-color"]');
    if(meta)meta.setAttribute('content',next==='light'?'#03101a':'#050606');
  }
  var saved='';
  try{saved=localStorage.getItem('atsrs_theme')||'';}catch(error){}
  apply(saved==='light'||saved==='dark'?saved:(matchMedia('(prefers-color-scheme: light)').matches?'light':'dark'));
  window.addEventListener('storage',function(event){if(event.key==='atsrs_theme')apply(event.newValue);});
})();
