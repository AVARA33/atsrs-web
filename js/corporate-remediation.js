/* Corporate context, content-isolation and responsive presentation guardrails. */
(function(){
  'use strict';

  function byId(id){return document.getElementById(id)}
  function companyMode(){return document.body.classList.contains('company-mode')}
  function setText(id,value){var element=byId(id);if(element&&element.textContent!==value)element.textContent=value}

  function syncSidebar(){
    setText('cabinetText',companyMode()?'Corporate Workspace':'Personal Workspace');
  }

  function syncCorporateCopy(){
    if(!companyMode())return;
    setText('compliancePageSub','This view checks uploaded document expiry dates only. It does not certify role or project eligibility.');
    setText('reportsSub','This report checks uploaded document expiry dates only. It does not certify role or project eligibility.');
  }

  function syncPageTitle(){
    var active=document.querySelector('#app .nav button.active');
    if(!active)return;
    var page=window.localStorage&&window.localStorage.getItem('atsrs_current_page')||'';
    var label=page==='privacy'?'Privacy Notice':page==='dataRights'?'Data Rights':active.textContent.trim();
    if(companyMode()&&active.id==='navProfile')label='Corporate Account';
    if(label)setText('pageTitle',label);
  }

  function syncAccount(){
    var corporate=companyMode();
    setText('accountTitle',corporate?'Corporate Account':'Account');
    var owner=byId('corporateAccountOwnerEmail');
    if(owner){
      var email=window.currentUser&&window.currentUser.email||byId('userEmail')&&byId('userEmail').textContent||'Signed-in owner';
      owner.textContent=email;
    }
    var sharing=byId('accountTabSharingBtn');
    if(sharing)sharing.classList.toggle('hidden',corporate);
    if(corporate&&byId('accountTabSharing')&&byId('accountTabSharing').classList.contains('active')){
      if(typeof window.showAccountTab==='function')window.showAccountTab('general');
    }
  }

  function referenceCard(kind){
    return document.querySelector('#refsPage [data-atsrs-v134-kind="'+kind+'"]');
  }

  function syncCredentials(){
    if(!companyMode())return;
    setText('refsTitle','Reference Materials');
    setText('refsSub','Company-owned client references, testimonials and retained legacy materials.');

    var reference=referenceCard('reference');
    if(reference){
      var title=byId('referenceCardTitle'),description=reference.querySelector('.atsrs-v134-desc');
      if(title)title.textContent='Client References';
      if(description)description.textContent='Store company-owned client and vendor reference material.';
    }
    var recommendation=referenceCard('recommendation');
    if(recommendation){
      var recommendationTitle=byId('recommendationCardTitle'),recommendationDescription=recommendation.querySelector('.atsrs-v134-desc');
      if(recommendationTitle)recommendationTitle.textContent='Testimonials & Recommendation Letters';
      if(recommendationDescription)recommendationDescription.textContent='Store company-owned testimonials and recommendation letters.';
    }
    var appraisal=referenceCard('appraisal');
    if(appraisal){
      var appraisalStatus=byId('v134_appraisal_status');
      var hasLegacy=!!(appraisalStatus&&!/^No File$/i.test(appraisalStatus.textContent.trim()));
      appraisal.classList.toggle('corporate-legacy-material',hasLegacy);
      appraisal.classList.toggle('hidden',!hasLegacy);
      if(hasLegacy){
        var appraisalTitle=byId('appraisalCardTitle'),appraisalDescription=appraisal.querySelector('.atsrs-v134-desc');
        if(appraisalTitle)appraisalTitle.textContent='Legacy materials (internal)';
        if(appraisalDescription)appraisalDescription.textContent='Existing appraisal-category files are retained for internal review and are not treated as company credentials.';
      }
    }
  }

  function bind(){
    var security=byId('corporateAccountSecurityButton');
    if(security&&!security.dataset.bound){
      security.dataset.bound='true';
      security.onclick=function(){if(typeof window.showAccountTab==='function')window.showAccountTab('security')};
    }
    syncAll();
    var appraisalStatus=byId('v134_appraisal_status');
    if(appraisalStatus)new MutationObserver(syncCredentials).observe(appraisalStatus,{childList:true,characterData:true,subtree:true});
  }

  function syncAll(){syncSidebar();syncCorporateCopy();syncPageTitle();syncAccount();syncCredentials()}

  var oldApplyLanguage=window.applyLanguage;
  if(typeof oldApplyLanguage==='function'){
    window.applyLanguage=function(){var result=oldApplyLanguage.apply(this,arguments);syncAll();return result};
  }
  var oldShow=window.showPage;
  if(typeof oldShow==='function'){
    window.showPage=function(){var result=oldShow.apply(this,arguments);syncAll();return result};
  }
  window.addEventListener('atsrs:workspace-changed',syncAll);
  window.addEventListener('atsrs:data-hydrated',syncAll);
  if(document.body&&window.MutationObserver){
    new MutationObserver(syncAll).observe(document.body,{attributes:true,attributeFilter:['class']});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind);else bind();
})();
