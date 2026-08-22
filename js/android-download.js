(function(){
  "use strict";
  var root=document.documentElement,button=document.getElementById("themeToggle");
  function apply(theme){
    var light=theme==="light";
    root.setAttribute("data-theme",theme);
    root.style.colorScheme=theme;
    try{localStorage.setItem("atsrs_theme",theme);}catch(_){}
    button.setAttribute("aria-checked",light?"true":"false");
    button.setAttribute("aria-label",light?"Switch to dark mode":"Switch to light mode");
  }
  var saved="";try{saved=localStorage.getItem("atsrs_theme")||localStorage.getItem("atsrs_public_theme")||"";}catch(_){}
  apply(saved==="dark"||saved==="light"?saved:(window.matchMedia&&window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"));
  button.addEventListener("click",function(){apply(root.getAttribute("data-theme")==="dark"?"light":"dark");});
})();
