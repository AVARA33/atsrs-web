(function(){
  'use strict';
  var resources={
    plans:{title:'Plans',description:'Review ATSRS plans without leaving your signed-in workspace.',src:'/pricing.html#atsrs-embed-app'},
    faq:{title:'FAQ',description:'Find clear answers while your ATSRS session remains active.',src:'/faq.html#atsrs-embed-app'},
    contact:{title:'Contact',description:'Contact ATSRS without leaving your signed-in workspace.',src:'/contact.html#atsrs-embed-app'}
  };
  function clean(value){return resources[value]?value:'plans'}
  function setRoute(name){var url=new URL(location.href);url.searchParams.set('route','resource');url.searchParams.set('resource',name);history.replaceState({},'',url.pathname+url.search+url.hash)}
  function syncFrameTheme(frame){try{if(frame&&frame.contentDocument)frame.contentDocument.documentElement.dataset.theme=document.documentElement.dataset.theme==='light'?'light':'dark'}catch(_error){}}
  function sync(name,force){
    name=clean(name||new URLSearchParams(location.search).get('resource'));
    var frame=document.getElementById('accountResourceFrame'),loading=document.getElementById('accountResourceLoading'),meta=resources[name];
    document.body.dataset.atsrsAccountRoute='resource';
    var title=document.getElementById('accountResourceTitle'),description=document.getElementById('accountResourceDescription');
    if(title)title.textContent=meta.title;if(description)description.textContent=meta.description;
    document.querySelectorAll('[data-account-resource]').forEach(function(button){var active=button.dataset.accountResource===name;button.classList.toggle('is-active',active);button.setAttribute('aria-current',active?'page':'false')});
    document.querySelectorAll('#sidebarQuickLinks [data-resource]').forEach(function(link){var active=link.dataset.resource===name;link.classList.toggle('is-active',active);if(active)link.setAttribute('aria-current','page');else link.removeAttribute('aria-current')});
    if(frame&&(force||frame.dataset.resource!==name)){if(loading)loading.classList.remove('is-ready');frame.dataset.resource=name;frame.title='ATSRS '+meta.title;frame.src=meta.src}
  }
  window.atsrsSyncAccountResource=function(){sync(null,false)};
  window.atsrsOpenAccountResource=function(name){name=clean(name);if(typeof showPage==='function'&&window.navResource)showPage('resource',window.navResource);setRoute(name);sync(name,false)};
  document.addEventListener('DOMContentLoaded',function(){
    var frame=document.getElementById('accountResourceFrame'),loading=document.getElementById('accountResourceLoading');
    if(frame)frame.addEventListener('load',function(){syncFrameTheme(frame);if(loading)loading.classList.add('is-ready')});
    document.querySelectorAll('[data-account-resource]').forEach(function(button){button.addEventListener('click',function(){window.atsrsOpenAccountResource(button.dataset.accountResource)})});
    document.querySelectorAll('#sidebarQuickLinks [data-resource]').forEach(function(link){link.addEventListener('click',function(event){event.preventDefault();window.atsrsOpenAccountResource(link.dataset.resource)})});
    var params=new URLSearchParams(location.search);if(params.get('route')==='resource')setTimeout(function(){window.atsrsOpenAccountResource(params.get('resource'))},0);
    if(window.MutationObserver)new MutationObserver(function(){syncFrameTheme(frame)}).observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});
  });
})();
