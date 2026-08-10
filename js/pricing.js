/* ATSRS V465 Personal pricing cycle control. */
(function(){
  'use strict';
  var buttons=Array.from(document.querySelectorAll('[data-pricing-cycle]'));
  function applyCycle(cycle){
    var yearly=cycle==='yearly';
    buttons.forEach(function(button){
      var active=button.dataset.pricingCycle===cycle;
      button.classList.toggle('active',active);
      button.setAttribute('aria-pressed',active?'true':'false');
    });
    document.querySelectorAll('[data-plan-price]').forEach(function(price){
      var amount=price.querySelector('strong');
      var period=price.querySelector('span');
      var note=price.querySelector('small');
      if(amount)amount.textContent=yearly?price.dataset.yearly:price.dataset.monthly;
      if(period)period.textContent=yearly?price.dataset.yearlyPeriod:price.dataset.monthlyPeriod;
      if(note)note.textContent=yearly?price.dataset.yearlyNote:price.dataset.monthlyNote;
    });
    document.querySelectorAll('[data-price-copy]').forEach(function(cell){
      cell.textContent=yearly?cell.dataset.yearly:cell.dataset.monthly;
    });
  }
  buttons.forEach(function(button){button.addEventListener('click',function(){applyCycle(button.dataset.pricingCycle);});});
  applyCycle('monthly');
})();
