/* ATSRS workspace switcher. */
(function(){
  'use strict';
  function byId(id){return document.getElementById(id);}
  function activeMode(){
    var mode='';
    try{mode=localStorage.getItem('atsrs_use_mode')||'';}catch(e){}
    return mode==='company'?'company':'personal';
  }
  function userName(user){
    var meta=(user&&user.user_metadata)||{};
    var full=String(meta.full_name||meta.name||'').trim();
    if(full)return full;
    var email=String((user&&user.email)||'').trim();
    return email?email.split('@')[0]:'ATSRS';
  }
  function initials(name){
    var parts=String(name||'').trim().split(/\s+/).filter(Boolean);
    if(!parts.length)return 'A';
    return parts.slice(0,2).map(function(part){return part.charAt(0).toUpperCase();}).join('');
  }
  function setOpen(open){
    var root=byId('workspaceSwitcher'), menu=byId('workspaceSwitcherMenu'), button=byId('workspaceSwitcherButton');
    if(!root||!menu||!button)return;
    root.classList.toggle('open',!!open);
    menu.classList.toggle('hidden',!open);
    button.setAttribute('aria-expanded',open?'true':'false');
  }
  function setStatus(message,isError){
    var status=byId('workspaceSwitcherStatus');
    if(!status)return;
    status.textContent=message||'';
    status.classList.toggle('error',!!isError);
  }
  function setBusy(busy,message){
    var root=byId('workspaceSwitcher');
    if(root)root.classList.toggle('busy',!!busy);
    if(message!==undefined)setStatus(message,false);
  }
  function render(state,user){
    var mode=activeMode();
    state=state||window.__atsrsWorkspaceState||{personal:mode==='personal',company:mode==='company'};
    user=user||window.currentUser||null;
    var name=userName(user);
    var nameEl=byId('workspaceSwitcherName'), avatar=byId('workspaceSwitcherAvatar'), label=byId('workspaceSwitcherLabel');
    if(nameEl)nameEl.textContent=name;
    if(avatar){
      var photo=mode==='personal'&&window.atsrsProfilePhoto&&window.atsrsProfilePhoto.currentUrl?window.atsrsProfilePhoto.currentUrl():'';
      avatar.innerHTML=photo?'<img src="'+String(photo).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})+'" alt="" referrerpolicy="no-referrer">':initials(name);
      var avatarImage=avatar.querySelector('img');
      if(avatarImage)avatarImage.onerror=function(){avatar.textContent=initials(name)};
    }
    if(label)label.textContent=mode==='company'?'Corporate Account':'Personal Account';
    ['personal','company'].forEach(function(workspace){
      var option=byId(workspace==='personal'?'workspacePersonalOption':'workspaceCompanyOption');
      if(!option)return;
      option.hidden=!state[workspace];
      option.classList.toggle('active',workspace===mode);
      option.setAttribute('aria-current',workspace===mode?'true':'false');
    });
    setBusy(false,'');
  }
  async function chooseWorkspace(mode){
    if(mode===activeMode()){setOpen(false);return;}
    if(typeof window.atsrsSwitchWorkspace!=='function'){
      setStatus('Workspace switching is not available. Refresh and try again.',true);
      return;
    }
    setBusy(true,'Saving changes and switching workspace...');
    try{
      var switched=await window.atsrsSwitchWorkspace(mode);
      if(switched===false)setBusy(false,'Workspace could not be switched.');
    }catch(error){
      setBusy(false,'Workspace could not be switched.');
      setStatus((error&&error.message)||'Workspace could not be switched.',true);
    }
  }
  function bind(){
    var button=byId('workspaceSwitcherButton');
    if(!button||button.dataset.atsrsBound==='1')return;
    button.dataset.atsrsBound='1';
    button.addEventListener('click',function(event){
      event.stopPropagation();
      var root=byId('workspaceSwitcher');
      setOpen(!(root&&root.classList.contains('open')));
    });
    ['personal','company'].forEach(function(mode){
      var option=byId(mode==='personal'?'workspacePersonalOption':'workspaceCompanyOption');
      if(option)option.addEventListener('click',function(){chooseWorkspace(mode);});
    });
    var logout=byId('workspaceLogoutBtn');
    if(logout)logout.addEventListener('click',function(){
      setBusy(true,'Logging out...');
      if(typeof window.atsrsLogout==='function')window.atsrsLogout();
    });
    document.addEventListener('click',function(event){
      var root=byId('workspaceSwitcher');
      if(root&&!root.contains(event.target))setOpen(false);
    });
    document.addEventListener('keydown',function(event){
      if(event.key==='Escape')setOpen(false);
    });
    render();
  }
  window.atsrsWorkspaceSwitcherUpdate=render;
  window.atsrsWorkspaceSwitcherBusy=setBusy;
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind);else bind();
  window.addEventListener('load',function(){bind();render();});
})();
