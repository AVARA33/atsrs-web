(function(){
  "use strict";
  var root=document.documentElement,button=document.getElementById("themeToggle");
  root.setAttribute("data-theme","dark");
  root.style.colorScheme="dark";
  if(button)button.remove();
  try{localStorage.removeItem("atsrs_theme");localStorage.removeItem("atsrs_public_theme");}catch(_){}
})();
