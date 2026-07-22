/* ATSRS V270 - server-backed corporate talent directory. */
(function(){
  'use strict';
  var profiles=[];
  var loading=false;
  var lastSync=0;

  function byId(id){return document.getElementById(id)}
  function client(){return window.supabaseClient||null}
  function mode(){try{return localStorage.getItem('atsrs_use_mode')||window.useMode||'personal'}catch(e){return 'personal'}}
  function safe(value){return String(value==null?'':value).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
  function normalized(value){return String(value||'').trim().toLowerCase()}
  function unique(values){return Array.from(new Set(values.filter(Boolean))).sort(function(a,b){return a.localeCompare(b)})}
  function profileFromForm(){
    return {
      name:(byId('profileName')&&byId('profileName').value||'').trim(),
      surname:(byId('profileSurname')&&byId('profileSurname').value||'').trim(),
      position:(byId('profilePosition')&&byId('profilePosition').value||'').trim(),
      country:(byId('profileCountry')&&byId('profileCountry').value||'').trim(),
      company:(byId('profileCompany')&&byId('profileCompany').value||'').trim()
    };
  }
  function complete(profile){return !!(profile.name&&profile.surname&&profile.position&&profile.country)}
  async function user(){
    var c=client();if(!c||!c.auth)return null;
    var result=await c.auth.getUser();return result&&result.data&&result.data.user||null;
  }
  async function syncOwnProfile(force){
    if(mode()!=='personal'||loading)return false;
    if(!force&&Date.now()-lastSync<240000)return true;
    var c=client(),u=await user(),profile=profileFromForm();
    if(!c||!u||!complete(profile))return false;
    var result=await c.from('atsrs_talent_profiles').upsert({
      user_id:u.id,name:profile.name,surname:profile.surname,position:profile.position,
      country:profile.country,company:profile.company||null,available:true,discoverable:true,
      last_active_at:new Date().toISOString(),updated_at:new Date().toISOString()
    },{onConflict:'user_id'});
    if(result.error){console.warn('ATSRS talent profile sync failed',result.error);return false}
    lastSync=Date.now();return true;
  }
  function activity(profile){
    var age=Date.now()-new Date(profile.last_active_at||0).getTime();
    if(age<=10*60*1000)return {key:'online',label:'Online now'};
    if(age<=24*60*60*1000)return {key:'today',label:'Active today'};
    if(age<=7*24*60*60*1000)return {key:'recent',label:'Recently active'};
    return {key:'away',label:'Profile available'};
  }
  function fillSelect(id,values,allLabel){
    var select=byId(id);if(!select)return;
    var current=select.value;
    select.innerHTML='<option value="">'+safe(allLabel)+'</option>'+unique(values).map(function(value){return '<option value="'+safe(value)+'">'+safe(value)+'</option>'}).join('');
    if(Array.prototype.some.call(select.options,function(option){return option.value===current}))select.value=current;
  }
  function filtered(){
    var query=normalized(byId('talentSearch')&&byId('talentSearch').value);
    var position=normalized(byId('talentPositionFilter')&&byId('talentPositionFilter').value);
    var country=normalized(byId('talentCountryFilter')&&byId('talentCountryFilter').value);
    var availability=byId('talentAvailabilityFilter')&&byId('talentAvailabilityFilter').value||'';
    return profiles.filter(function(profile){
      var hay=normalized([profile.name,profile.surname,profile.position,profile.country,profile.company].join(' '));
      if(query&&hay.indexOf(query)<0)return false;
      if(position&&normalized(profile.position)!==position)return false;
      if(country&&normalized(profile.country)!==country)return false;
      if(availability==='available'&&!profile.available)return false;
      if(availability==='online'&&activity(profile).key!=='online')return false;
      return true;
    });
  }
  function render(){
    var grid=byId('talentDirectoryGrid'),count=byId('talentDirectoryCount'),status=byId('talentDirectoryStatus');if(!grid)return;
    var visible=filtered();
    if(count)count.textContent=visible.length+' professional'+(visible.length===1?'':'s');
    if(status)status.classList.add('hidden');
    if(!visible.length){grid.innerHTML='<div class="talent-empty"><b>No matching professionals</b><span>Try a broader profession, country or name.</span></div>';return}
    grid.innerHTML=visible.map(function(profile){var active=activity(profile);return '<article class="talent-card">'+
      '<div class="talent-card-top"><div class="talent-avatar" aria-hidden="true">'+safe((profile.name||'?').charAt(0)+(profile.surname||'').charAt(0))+'</div><span class="talent-presence is-'+active.key+'"><i></i>'+safe(active.label)+'</span></div>'+
      '<h4>'+safe(profile.name+' '+profile.surname)+'</h4><p class="talent-role">'+safe(profile.position)+'</p>'+
      '<dl><div><dt>Country</dt><dd>'+safe(profile.country)+'</dd></div><div><dt>Current workplace</dt><dd>'+safe(profile.company||'Independent professional')+'</dd></div></dl>'+
      '<button type="button" class="secondary talent-view" data-talent-id="'+safe(profile.user_id)+'">View professional profile</button></article>'}).join('');
    grid.querySelectorAll('.talent-view').forEach(function(button){button.onclick=function(){openProfile(button.dataset.talentId)}});
  }
  function openProfile(id){
    var profile=profiles.find(function(item){return item.user_id===id});if(!profile)return;
    var active=activity(profile),old=byId('atsrsTalentModal');if(old)old.remove();
    var modal=document.createElement('div');modal.id='atsrsTalentModal';modal.className='talent-modal';
    modal.innerHTML='<button type="button" class="talent-modal-backdrop" aria-label="Close"></button><div class="talent-modal-card" role="dialog" aria-modal="true" aria-labelledby="talentModalName"><button type="button" class="talent-modal-close" aria-label="Close">&times;</button><div class="talent-avatar">'+safe((profile.name||'?').charAt(0)+(profile.surname||'').charAt(0))+'</div><span class="talent-presence is-'+active.key+'"><i></i>'+safe(active.label)+'</span><h3 id="talentModalName">'+safe(profile.name+' '+profile.surname)+'</h3><p class="talent-role">'+safe(profile.position)+'</p><dl><div><dt>Country</dt><dd>'+safe(profile.country)+'</dd></div><div><dt>Current workplace</dt><dd>'+safe(profile.company||'Independent professional')+'</dd></div></dl><p class="talent-privacy-note">Contact details and documents remain private. Controlled contact requests will be added here next.</p></div>';
    document.body.appendChild(modal);modal.querySelectorAll('.talent-modal-backdrop,.talent-modal-close').forEach(function(button){button.onclick=function(){modal.remove()}});
  }
  async function loadDirectory(){
    if(mode()!=='company')return;
    var grid=byId('talentDirectoryGrid'),status=byId('talentDirectoryStatus'),c=client();if(!grid||!c)return;
    loading=true;if(status){status.textContent='Loading professional profiles...';status.classList.remove('hidden')}
    var result=await c.from('atsrs_talent_profiles').select('user_id,name,surname,position,country,company,available,last_active_at,updated_at').eq('discoverable',true).order('last_active_at',{ascending:false});
    loading=false;
    if(result.error){if(status){status.textContent='Professional profiles could not be loaded. Please refresh and try again.';status.classList.remove('hidden')}console.warn('ATSRS talent directory load failed',result.error);return}
    profiles=Array.isArray(result.data)?result.data:[];
    fillSelect('talentPositionFilter',profiles.map(function(profile){return profile.position}),'All professions');
    fillSelect('talentCountryFilter',profiles.map(function(profile){return profile.country}),'All countries');
    render();
  }
  function bind(){
    ['talentSearch','talentPositionFilter','talentCountryFilter','talentAvailabilityFilter'].forEach(function(id){var el=byId(id);if(el)el.addEventListener(id==='talentSearch'?'input':'change',render)});
    var oldSave=window.saveProfile;
    if(typeof oldSave==='function')window.saveProfile=async function(){var result=await oldSave.apply(this,arguments);if(result!==false)await syncOwnProfile(true);return result};
    var oldShow=window.showPage;
    if(typeof oldShow==='function')window.showPage=function(){var result=oldShow.apply(this,arguments);if(String(arguments[0]||'')==='personnel')setTimeout(loadDirectory,30);return result};
    setTimeout(function(){if(mode()==='personal')syncOwnProfile(true);else if(byId('personnelPage')&&!byId('personnelPage').classList.contains('hidden'))loadDirectory()},1200);
    window.addEventListener('atsrs:resume',function(){if(mode()==='personal')syncOwnProfile(false);else loadDirectory()});
    setInterval(function(){if(mode()==='personal')syncOwnProfile(false)},300000);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind,{once:true});else bind();
  window.atsrsTalentDirectory={load:loadDirectory,sync:syncOwnProfile};
})();
