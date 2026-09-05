/* ATSRS V467 Personal pricing cycle control. */
(function(){
  'use strict';
  var buttons=Array.from(document.querySelectorAll('[data-pricing-cycle]'));
  var cycleStorageKey='atsrs_pricing_cycle';
  function storedCycle(){
    try{
      var value=localStorage.getItem(cycleStorageKey);
      return value==='yearly'?'yearly':'monthly';
    }catch(_error){return 'monthly';}
  }
  function rememberCycle(cycle){
    try{localStorage.setItem(cycleStorageKey,cycle);}catch(_error){}
  }
  function applyCycle(cycle){
    var yearly=cycle==='yearly';
    var az=window.atsrsI18n&&window.atsrsI18n.getLocale&&window.atsrsI18n.getLocale()==='az';
    buttons.forEach(function(button){
      var active=button.dataset.pricingCycle===cycle;
      button.classList.toggle('active',active);
      button.setAttribute('aria-pressed',active?'true':'false');
    });
    document.querySelectorAll('[data-plan-price]').forEach(function(price){
      var amount=price.querySelector('strong');
      var period=price.querySelector('span');
      var note=price.querySelector('small');
      if(amount)amount.textContent=az?(yearly?price.dataset.yearlyAzn:price.dataset.monthlyAzn):(yearly?price.dataset.yearly:price.dataset.monthly);
      if(period)period.textContent=yearly?price.dataset.yearlyPeriod:price.dataset.monthlyPeriod;
      if(note)note.textContent=az&&yearly?price.dataset.yearlyNoteAzn:(yearly?price.dataset.yearlyNote:price.dataset.monthlyNote);
    });
    document.querySelectorAll('[data-price-copy]').forEach(function(cell){
      cell.textContent=az?(yearly?cell.dataset.yearlyAzn:cell.dataset.monthlyAzn):(yearly?cell.dataset.yearly:cell.dataset.monthly);
    });
  }
  buttons.forEach(function(button){button.addEventListener('click',function(){
    var cycle=button.dataset.pricingCycle==='yearly'?'yearly':'monthly';
    rememberCycle(cycle);
    applyCycle(cycle);
  });});
  applyCycle(storedCycle());
  window.addEventListener('atsrs:locale-changed',function(){applyCycle(storedCycle());});
  if(window.atsrsPricingCurrency)window.atsrsPricingCurrency.mount(document);
})();

