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

  function bindTabKeyboard(){
    document.querySelectorAll('.company-credentials-tabs').forEach(function(tablist){
      if(tablist.dataset.keyboardBound==='true')return;
      tablist.dataset.keyboardBound='true';
      tablist.addEventListener('keydown',function(event){
        if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
        var tabs=Array.from(tablist.querySelectorAll('[role="tab"]'));
        var current=tabs.indexOf(document.activeElement);
        if(current<0)return;
        event.preventDefault();
        var next=event.key==='Home'?0:event.key==='End'?tabs.length-1:(current+(event.key==='ArrowRight'?1:-1)+tabs.length)%tabs.length;
        tabs[next].focus();
        tabs[next].click();
      });
    });
  }

  function syncCurrentPage(){
    syncCredentialState(localStorage.getItem('atsrs_current_page')||'intro');
  }

  window.addEventListener('atsrs:workspace-changed',syncCurrentPage);
  new MutationObserver(syncCurrentPage).observe(document.body,{attributes:true,attributeFilter:['class']});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',function(){bindTabKeyboard();syncCurrentPage()});
  else {bindTabKeyboard();syncCurrentPage()}
})();
