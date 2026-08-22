(function(){
  'use strict';

  var workspace;
  var panel;
  var openButton;
  var closeButton;
  var page;

  function personalMode(){return document.body.classList.contains('personal-mode');}

  function setOpen(open,returnFocus){
    if(!workspace||!panel||!openButton)return;
    if(!personalMode()){
      workspace.classList.remove('is-add-open');
      panel.setAttribute('aria-hidden','false');
      openButton.setAttribute('aria-expanded','false');
      return;
    }
    var next=personalMode()&&open;
    workspace.classList.toggle('is-add-open',next);
    panel.setAttribute('aria-hidden',next?'false':'true');
    openButton.setAttribute('aria-expanded',next?'true':'false');
    if(next){
      var title=document.getElementById('addDocTitle');
      if(title){title.setAttribute('tabindex','-1');title.focus({preventScroll:true});}
    }else if(returnFocus){
      openButton.focus({preventScroll:true});
    }
  }

  function bind(){
    workspace=document.getElementById('documentsWorkspace');
    panel=document.getElementById('documentsAddPanel');
    openButton=document.getElementById('openDocumentsAddPanelBtn');
    closeButton=document.getElementById('closeDocumentsAddPanelBtn');
    page=document.getElementById('certificatesPage');
    if(!workspace||!panel||!openButton||!closeButton||!page||workspace.dataset.splitPaneBound==='1')return;
    workspace.dataset.splitPaneBound='1';
    openButton.addEventListener('click',function(){setOpen(true,false)});
    closeButton.addEventListener('click',function(){setOpen(false,true)});
    document.addEventListener('keydown',function(event){
      if(event.key!=='Escape'||!workspace.classList.contains('is-add-open'))return;
      var qr=document.getElementById('qrUploadDialog');
      if(qr&&!qr.classList.contains('hidden'))return;
      setOpen(false,true);
    });
    new MutationObserver(function(){
      if(page.classList.contains('hidden')||!personalMode())setOpen(false,false);
    }).observe(page,{attributes:true,attributeFilter:['class']});
    new MutationObserver(function(){
      if(!personalMode())setOpen(false,false);
    }).observe(document.body,{attributes:true,attributeFilter:['class']});
    setOpen(false,false);
  }

  window.atsrsDocumentsSplitPane={open:function(){setOpen(true,false)},close:function(){setOpen(false,false)}};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind);else bind();
})();
