(function(){
  "use strict";
  var root=document.documentElement,button=document.getElementById("themeToggle");
  function apply(theme){root.setAttribute("data-theme",theme);try{localStorage.setItem("atsrs_public_theme",theme);}catch(_){} button.setAttribute("aria-label",theme==="dark"?"Switch to light mode":"Switch to dark mode");}
  var saved="";try{saved=localStorage.getItem("atsrs_public_theme")||"";}catch(_){}
  apply(saved==="dark"||saved==="light"?saved:(window.matchMedia&&window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"));
  button.addEventListener("click",function(){apply(root.getAttribute("data-theme")==="dark"?"light":"dark");});
})();
