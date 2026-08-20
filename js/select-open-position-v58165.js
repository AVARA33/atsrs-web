(function(){
  'use strict';

  document.addEventListener('click',function(event){
    var trigger=event.target&&event.target.closest
      ?event.target.closest('.atsrs-select-trigger[aria-controls]')
      :null;
    if(!trigger)return;
    requestAnimationFrame(function(){
      if(trigger.getAttribute('aria-expanded')!=='true')return;
      var menu=document.getElementById(trigger.getAttribute('aria-controls'));
      var selected=menu&&menu.querySelector('.atsrs-select-option[aria-selected="true"]');
      if(selected)selected.scrollIntoView({block:'nearest'});
    });
  });
})();
