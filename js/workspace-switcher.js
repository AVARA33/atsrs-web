/* ATSRS workspace switcher. */
(function(){
  'use strict';
  var activeSwitch=null;
  var switchSequence=0;
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
    if(root){
      root.classList.toggle('busy',!!busy);
      root.setAttribute('aria-busy',busy?'true':'false');
    }
    ['workspaceSwitcherButton','workspacePersonalOption','workspaceCompanyOption','workspaceLogoutBtn'].forEach(function(id){
      var control=byId(id);
      if(control)control.disabled=!!busy;
    });
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
      var photo=window.atsrsProfilePhoto&&window.atsrsProfilePhoto.currentUrl?window.atsrsProfilePhoto.currentUrl():'';
      avatar.innerHTML=photo?'<img src="'+String(photo).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})+'" alt="" referrerpolicy="no-referrer">':initials(name);
      var avatarImage=avatar.querySelector('img');
      if(avatarImage)avatarImage.onerror=function(){avatar.textContent=initials(name)};
      if(window.atsrsProfilePhoto&&typeof window.atsrsProfilePhoto.hydrate==='function')window.atsrsProfilePhoto.hydrate();
    }
    if(label)label.textContent=mode==='company'?'Corporate Account':'Personal Account';
    ['personal','company'].forEach(function(workspace){
      var option=byId(workspace==='personal'?'workspacePersonalOption':'workspaceCompanyOption');
      if(!option)return;
      option.hidden=!state[workspace];
      option.classList.toggle('active',workspace===mode);
      option.setAttribute('aria-current',workspace===mode?'true':'false');
    });
    if(!activeSwitch)setBusy(false,'');
  }
  async function chooseWorkspace(mode){
    if(activeSwitch)return activeSwitch.mode===mode?activeSwitch.promise:false;
    if(mode===activeMode()){setOpen(false);return true;}
    if(typeof window.atsrsSwitchWorkspace!=='function'){
      setStatus('Workspace switching is not available. Refresh and try again.',true);
      return false;
    }
    var sequence=++switchSequence;
    setBusy(true,'Saving changes and switching workspace...');
    var promise=Promise.resolve().then(function(){return window.atsrsSwitchWorkspace(mode);});
    activeSwitch={mode:mode,sequence:sequence,promise:promise};
    try{
      var switched=await promise;
      if(!activeSwitch||activeSwitch.sequence!==sequence)return false;
      if(switched===false){
        setStatus('Workspace could not be switched. Please try again.',true);
        return false;
      }
      setStatus('',false);
      setOpen(false);
      return true;
    }catch(error){
      if(activeSwitch&&activeSwitch.sequence===sequence){
        setStatus('Workspace could not be switched. Please try again.',true);
      }
      return false;
    }finally{
      if(activeSwitch&&activeSwitch.sequence===sequence){
        activeSwitch=null;
        setBusy(false);
      }
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
  window.atsrsWorkspaceSwitcherChoose=chooseWorkspace;
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind);else bind();
  window.addEventListener('load',function(){bind();render();});
})();
