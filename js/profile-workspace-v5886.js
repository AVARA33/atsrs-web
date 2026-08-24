(function(){
  'use strict';
  var state={ready:false,activeTab:'personal',personalEditing:false,availabilityEditing:false,initialDraft:'',scroll:{}};
  function byId(id){return document.getElementById(id)}
  function controls(root){return root?Array.prototype.slice.call(root.querySelectorAll('input,select,textarea,button')):[]}
  function setEnabled(root,enabled){controls(root).forEach(function(el){if(el.type!=='hidden')el.disabled=!enabled})}
  function draft(){var root=byId('profileInlineEditor');if(!root)return '';return controls(root).filter(function(el){return /^(INPUT|SELECT|TEXTAREA)$/.test(el.tagName)}).map(function(el){return el.id+'='+String(el.type==='checkbox'?el.checked:el.value)}).join('&')}
  function dirty(){return state.personalEditing&&draft()!==state.initialDraft}
  function tabName(button){return button&&button.id?button.id.replace('profileTab','').replace('Btn','').toLowerCase():'personal'}
  function activate(name,focus){
    if(dirty()&&!window.confirm('Discard unsaved profile changes?'))return false;
    if(state.personalEditing)cancelPersonal(false);
    var buttons=Array.prototype.slice.call(document.querySelectorAll('.profile-information-tabs [role="tab"]'));
    var panels=Array.prototype.slice.call(document.querySelectorAll('.profile-settings-viewport > [role="tabpanel"]'));
    var next=byId('profileTab'+name.charAt(0).toUpperCase()+name.slice(1)+'Btn');
    var panel=byId('profileTab'+name.charAt(0).toUpperCase()+name.slice(1)+'Panel');
    if(!next||!panel)return false;
    var current=byId('profileTab'+state.activeTab.charAt(0).toUpperCase()+state.activeTab.slice(1)+'Panel');
    if(current)state.scroll[state.activeTab]=current.scrollTop;
    buttons.forEach(function(button){var active=button===next;button.classList.toggle('is-active',active);button.setAttribute('aria-selected',active?'true':'false');button.tabIndex=active?0:-1});
    panels.forEach(function(item){var active=item===panel;item.hidden=!active;item.classList.toggle('is-active',active)});
    state.activeTab=name;panel.scrollTop=state.scroll[name]||0;if(focus)next.focus();return true;
  }
  function enterPersonal(focusId){
    activate('personal',false);var read=byId('profilePersonalReadView'),editor=byId('profileInlineEditor');if(!editor)return;
    if(window.loadProfile)window.loadProfile();state.personalEditing=true;state.initialDraft=draft();
    if(read)read.classList.add('hidden');editor.classList.remove('hidden');setEnabled(editor,true);byId('profilePage').classList.add('profile-inline-editing');
    var target=byId(focusId||'profileName');if(target)setTimeout(function(){target.focus()},0);
  }
  function finishPersonal(){var read=byId('profilePersonalReadView'),editor=byId('profileInlineEditor');state.personalEditing=false;state.initialDraft='';if(read)read.classList.remove('hidden');if(editor){editor.classList.add('hidden');setEnabled(editor,false)}byId('profilePage').classList.remove('profile-inline-editing')}
  async function savePersonal(){var button=byId('profileInlineSaveBtn');if(button)button.disabled=true;var ok=window.saveProfile?await window.saveProfile({personalChanged:true}):false;if(button)button.disabled=false;if(ok){finishPersonal();activate('personal',false)}return ok}
  function cancelPersonal(reload){if(reload!==false&&window.loadProfile)window.loadProfile();finishPersonal()}
  function enterAvailability(){var card=document.querySelector('.profile-availability-card'),editor=document.querySelector('.work-availability-card');if(!card||!editor)return;state.availabilityEditing=true;if(window.loadProfile)window.loadProfile();card.classList.add('is-editing');editor.classList.remove('hidden');setEnabled(editor,true)}
  async function saveAvailability(){var ok=window.saveProfile?await window.saveProfile({availabilityChanged:true}):false;if(ok)finishAvailability();return ok}
  function finishAvailability(){var card=document.querySelector('.profile-availability-card'),editor=document.querySelector('.work-availability-card');state.availabilityEditing=false;if(card)card.classList.remove('is-editing');if(editor){editor.classList.add('hidden');setEnabled(editor,false)}}
  function cancelAvailability(){if(window.loadProfile)window.loadProfile();finishAvailability()}
  function moveRow(controlId,target){var control=byId(controlId),row=control&&control.closest('.setting-row'),host=byId(target);if(row&&host)host.appendChild(row)}
  function makeActions(parent,kind){var actions=document.createElement('div');actions.className='profile-inline-actions';var save=document.createElement('button'),cancel=document.createElement('button');save.type=cancel.type='button';save.textContent='Save Changes';cancel.textContent='Cancel';cancel.className='secondary';if(kind==='personal'){save.id='profileInlineSaveBtn';cancel.id='profileInlineCancelBtn';save.addEventListener('click',savePersonal);cancel.addEventListener('click',function(){cancelPersonal(true)})}else{save.textContent='Save';save.addEventListener('click',saveAvailability);cancel.addEventListener('click',cancelAvailability)}actions.appendChild(save);actions.appendChild(cancel);parent.appendChild(actions)}
  function bindTabs(){var buttons=Array.prototype.slice.call(document.querySelectorAll('.profile-information-tabs [role="tab"]'));buttons.forEach(function(button,index){button.addEventListener('click',function(){activate(tabName(button),false)});button.addEventListener('keydown',function(event){if(event.key==='Enter'||event.key===' '){event.preventDefault();activate(tabName(button),true)}if(event.key==='ArrowRight'||event.key==='ArrowLeft'){event.preventDefault();var delta=event.key==='ArrowRight'?1:-1,next=buttons[(index+delta+buttons.length)%buttons.length];activate(tabName(next),true)}})})}
  function init(){
    if(state.ready||!document.body.classList.contains('personal-mode'))return false;
    var editor=byId('profileInlineEditor'),grid=document.querySelector('#accountGeneralTab .profile-grid');if(!editor||!grid)return false;
    state.ready=true;editor.appendChild(grid);makeActions(editor,'personal');setEnabled(editor,false);
    var availability=document.querySelector('#accountGeneralTab .work-availability-card'),availabilityCard=document.querySelector('.profile-availability-card');if(availability&&availabilityCard){availability.classList.add('hidden');availabilityCard.appendChild(availability);makeActions(availability,'availability');setEnabled(availability,false)}
    moveRow('profileVisibility','profilePrivacyControls');moveRow('exportDataBtn','profilePrivacyControls');
    ['setup2faBtn','viewSessionsBtn','profileTimezone','manageNotifyBtn','deleteAccountBtn'].forEach(function(id){moveRow(id,'profileSecurityControls')});
    var share=byId('shareProfilePanel'),sharing=byId('profileSharingControls');if(share&&sharing)sharing.appendChild(share);
    var oldEdit=byId('editProfileBtn');if(oldEdit)oldEdit.hidden=true;
    bindTabs();activate('personal',false);
    byId('profileSummaryEditBtn').addEventListener('click',function(){enterPersonal()});
    byId('profileStageAvailabilityEditBtn').addEventListener('click',enterAvailability);
    document.querySelectorAll('[data-profile-stage-edit]').forEach(function(button){button.addEventListener('click',function(){enterPersonal(button.dataset.profileStageEdit==='whatsapp'?'profileWhatsappLocal':'profilePhoneLocal')})});
    return true;
  }
  window.initPersonalProfileWorkspace=init;
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
