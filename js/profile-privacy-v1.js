(function(){
  'use strict';
  var DEFAULT_FIELDS={phone:'recruiters',email:'recruiters',location:'public',availability:'public',position:'public',salary:'recruiters',birthDate:'private',about:'public'};
  var FIELD_DEFINITIONS=[
    {key:'phone',icon:'ph-phone',title:'Phone number',note:'Display your phone number'},
    {key:'email',icon:'ph-envelope',title:'Email address',note:'Display your email address'},
    {key:'location',icon:'ph-map-pin',title:'Location',note:'Display your city and country'},
    {key:'availability',icon:'ph-clock',title:'Availability status',note:'Show your availability to employers'},
    {key:'position',icon:'ph-briefcase',title:'Current position',note:'Display your current job title'},
    {key:'birthDate',icon:'ph-calendar-blank',title:'Date of birth',note:'Display your date of birth'}
  ];
  var draft=null;
  var saveTimer=0;
  function byId(id){return document.getElementById(id)}
  function profileKey(){try{return typeof window.localKey==='function'?window.localKey('profile'):''}catch(error){return ''}}
  function readProfile(){try{var key=profileKey();if(!key)return {};var raw=window.atsrsCloudData&&window.atsrsCloudData.isManagedKey(key)?window.atsrsCloudData.read(key):localStorage.getItem(key);return raw?JSON.parse(raw):{}}catch(error){return {}}}
  function writeProfile(profile){try{var key=profileKey(),value=JSON.stringify(profile);if(!key)return false;if(window.atsrsCloudData&&window.atsrsCloudData.isManagedKey(key))return window.atsrsCloudData.write(key,value);localStorage.setItem(key,value);return true}catch(error){return false}}
  function normalizeMode(value){return value==='public'||value==='private'?value:'custom'}
  function normalizeAudience(value){return value==='everyone'||value==='only_me'?value:'recruiters'}
  function normalizeFields(value){var fields={};Object.keys(DEFAULT_FIELDS).forEach(function(key){var current=value&&value[key];fields[key]=current==='public'||current==='private'?current:'recruiters'});return fields}
  function fromProfile(profile){var saved=profile&&profile.privacySettings||{},legacy=profile&&profile.visibility||'Private';return {mode:normalizeMode(saved.mode||(legacy==='Public'?'public':legacy==='Private'?'private':'custom')),audience:normalizeAudience(saved.audience||(legacy==='Public'?'everyone':legacy==='Private'?'only_me':'recruiters')),fields:normalizeFields(saved.fields||DEFAULT_FIELDS)}}
  function clone(value){return JSON.parse(JSON.stringify(value))}
  function visibilityValue(mode){return mode==='public'?'Public':mode==='private'?'Private':'Link Only'}
  function renderRows(){var host=byId('profilePrivacyRows');if(!host||host.children.length)return;FIELD_DEFINITIONS.forEach(function(field){var row=document.createElement('div');row.className='profile-privacy-matrix-row';row.dataset.privacyField=field.key;var copy=document.createElement('div');copy.className='profile-privacy-field-copy';copy.innerHTML='<i class="ph '+field.icon+'" aria-hidden="true"></i><span><strong>'+field.title+'</strong><small>'+field.note+'</small></span>';row.appendChild(copy);['public','recruiters','private'].forEach(function(value){var label=document.createElement('label');label.className='profile-privacy-radio';label.setAttribute('aria-label',field.title+': '+(value==='public'?'Public':value==='recruiters'?'Only Recruiters':'Private'));var input=document.createElement('input');input.type='radio';input.name='privacy_'+field.key;input.value=value;input.addEventListener('change',function(){readDraft();scheduleSave()});label.appendChild(input);row.appendChild(label)});host.appendChild(row)})}
  function applyModeEffects(){var mode=draft&&draft.mode||'custom',matrix=byId('profilePrivacyRows');if(matrix)matrix.classList.toggle('is-locked',mode!=='custom');document.querySelectorAll('.profile-privacy-mode-card').forEach(function(card){var input=card.querySelector('input');card.classList.toggle('is-selected',!!input&&input.checked)})}
  function render(settings){draft=clone(settings);document.querySelectorAll('input[name="profilePrivacyMode"]').forEach(function(input){input.checked=input.value===draft.mode});Object.keys(draft.fields).forEach(function(key){var input=document.querySelector('input[name="privacy_'+key+'"][value="'+draft.fields[key]+'"]');if(input)input.checked=true});applyModeEffects()}
  function readDraft(){if(!draft)return;var mode=document.querySelector('input[name="profilePrivacyMode"]:checked');draft.mode=normalizeMode(mode&&mode.value);draft.audience=draft.mode==='public'?'everyone':draft.mode==='private'?'only_me':'recruiters';Object.keys(DEFAULT_FIELDS).forEach(function(key){var input=document.querySelector('input[name="privacy_'+key+'"]:checked');draft.fields[key]=input?input.value:DEFAULT_FIELDS[key]});applyModeEffects()}
  async function save(){readDraft();var profile=readProfile();profile.privacySettings=clone(draft);profile.visibility=visibilityValue(draft.mode);profile.savedAt=new Date().toISOString();var legacy=byId('profileVisibility');if(legacy)legacy.value=profile.visibility;if(!writeProfile(profile))return false;if(window.atsrsCloudData&&typeof window.atsrsCloudData.flush==='function')return await window.atsrsCloudData.flush();return true}
  function scheduleSave(){clearTimeout(saveTimer);saveTimer=setTimeout(function(){save().catch(function(error){console.warn('ATSRS privacy settings could not be saved',error)})},350)}
  function bind(){renderRows();document.querySelectorAll('input[name="profilePrivacyMode"]').forEach(function(input){input.addEventListener('change',function(){readDraft();applyModeEffects();scheduleSave()})});render(fromProfile(readProfile()));window.addEventListener('atsrs:cloud-data-loaded',function(){render(fromProfile(readProfile()))})}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind,{once:true});else bind();
})();
