(function(){
  'use strict';

  function byId(id){return document.getElementById(id)}
  function companyMode(){return document.body.classList.contains('company-mode')}
  function credentialPage(section){return section==='references'?'refs':'certificates'}
  function credentialSection(page){return page==='refs'?'references':'documents'}

  function syncCredentialState(page){
    var credentials=byId('navCredentials');
    if(!credentials)return;
    var updates=byId('navIntro');
    if(updates)updates.textContent='Product Updates';
    var isCredentials=companyMode()&&(page==='certificates'||page==='refs');
    credentials.classList.toggle('active',isCredentials);
    if(isCredentials){
      [byId('navCertificates'),byId('navRefs')].forEach(function(legacy){
        if(legacy)legacy.classList.remove('active');
      });
      var title=byId('pageTitle');
      if(title)title.textContent='Company Credentials';
    }else if(page==='certificates'||page==='refs'){
      var legacyTitle=byId('pageTitle');
      var legacyNav=page==='refs'?byId('navRefs'):byId('navCertificates');
      if(legacyTitle&&legacyNav)legacyTitle.textContent=legacyNav.textContent;
    }
    document.querySelectorAll('[data-company-credentials-tab]').forEach(function(button){
      var selected=isCredentials&&button.dataset.companyCredentialsTab===credentialSection(page);
      button.setAttribute('aria-selected',selected?'true':'false');
      button.tabIndex=selected?0:-1;
    });
  }

  var baseShowPage=window.showPage;
  if(typeof baseShowPage==='function'){
    window.showPage=function(page,button){
      var result=baseShowPage.apply(this,arguments);
      syncCredentialState(page);
      return result;
    };
  }

  window.showCompanyCredentials=function(section){
    var page=credentialPage(section);
    var target=page==='refs'?byId('navRefs'):byId('navCertificates');
    if(typeof window.showPage==='function'&&target)window.showPage(page,target);
  };

  function syncCurrentPage(){
    syncCredentialState(localStorage.getItem('atsrs_current_page')||'intro');
  }

  window.addEventListener('atsrs:workspace-changed',syncCurrentPage);
  new MutationObserver(syncCurrentPage).observe(document.body,{attributes:true,attributeFilter:['class']});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',syncCurrentPage);
  else syncCurrentPage();
})();
