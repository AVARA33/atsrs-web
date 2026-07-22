/* ATSRS V273 - server-backed corporate talent directory. */
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
  async function actionCall(payload){
    var c=client();if(!c||!c.functions)throw new Error('ATSRS service is unavailable.');
    var result=await c.functions.invoke('talent-profile-actions',{body:payload||{}});
    if(result.error)throw result.error;
    if(!result.data||result.data.error)throw new Error(result.data&&result.data.error||'The request could not be completed.');
    return result.data;
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
    modal.innerHTML='<button type="button" class="talent-modal-backdrop" aria-label="Close"></button><div class="talent-modal-card" role="dialog" aria-modal="true" aria-labelledby="talentModalName"><button type="button" class="talent-modal-close" aria-label="Close">&times;</button><div class="talent-avatar">'+safe((profile.name||'?').charAt(0)+(profile.surname||'').charAt(0))+'</div><span class="talent-presence is-'+active.key+'"><i></i>'+safe(active.label)+'</span><h3 id="talentModalName">'+safe(profile.name+' '+profile.surname)+'</h3><p class="talent-role">'+safe(profile.position)+'</p><dl><div><dt>Country</dt><dd>'+safe(profile.country)+'</dd></div><div><dt>Current workplace</dt><dd>'+safe(profile.company||'Independent professional')+'</dd></div></dl><div class="talent-profile-actions"><button type="button" class="secondary" data-talent-action="message">Send Message</button><button type="button" class="secondary" data-talent-action="summary">Document Summary</button><button type="button" class="secondary" data-talent-action="cv">View CV</button></div><div class="talent-action-panel hidden" id="talentActionPanel"></div><p class="talent-privacy-note">Contact details remain private. Document Summary shows metadata only; certificates are not exposed.</p></div>';
    document.body.appendChild(modal);modal.querySelectorAll('.talent-modal-backdrop,.talent-modal-close').forEach(function(button){button.onclick=function(){modal.remove()}});
    modal.querySelector('[data-talent-action="message"]').onclick=function(){showMessageForm(profile)};
    modal.querySelector('[data-talent-action="summary"]').onclick=function(){showDocumentSummary(profile)};
    modal.querySelector('[data-talent-action="cv"]').onclick=function(){openTalentCv(profile)};
  }
  function actionPanel(){return byId('talentActionPanel')}
  function panelMessage(text,error){var panel=actionPanel();if(!panel)return;panel.classList.remove('hidden');panel.innerHTML='<p class="talent-action-message'+(error?' is-error':'')+'">'+safe(text)+'</p>'}
  function showMessageForm(profile){
    var panel=actionPanel();if(!panel)return;panel.classList.remove('hidden');
    panel.innerHTML='<form class="talent-message-form"><label>Company name<input id="talentMessageCompany" maxlength="140" autocomplete="organization" placeholder="Your company"></label><label>Message<textarea id="talentMessageBody" maxlength="1200" rows="4" placeholder="Introduce the opportunity and how the professional can contact you."></textarea></label><div class="talent-form-actions"><button type="submit" class="secondary">Send Message</button><span id="talentMessageStatus" role="status"></span></div></form>';
    panel.querySelector('form').onsubmit=async function(event){
      event.preventDefault();var button=event.submitter||panel.querySelector('button'),status=byId('talentMessageStatus');button.disabled=true;button.textContent='Sending...';if(status)status.textContent='';
      try{await actionCall({action:'send_message',target_user_id:profile.user_id,company:byId('talentMessageCompany').value,message:byId('talentMessageBody').value});panelMessage('Message sent securely through ATSRS.',false)}
      catch(error){if(status)status.textContent=error.message||'Message could not be sent.';button.disabled=false;button.textContent='Send Message'}
    };
  }
  async function showDocumentSummary(profile){
    panelMessage('Loading document summary...',false);
    try{
      var data=await actionCall({action:'summary',target_user_id:profile.user_id}),panel=actionPanel(),counts=data.counts||{},documents=Array.isArray(data.documents)?data.documents:[];
      if(!panel)return;panel.innerHTML='<div class="talent-summary-head"><b>Document Summary</b><span>'+safe(counts.total||0)+' documents</span></div><div class="talent-summary-stats"><span><b>'+safe(counts.current||0)+'</b> current</span><span><b>'+safe(counts.expiryRisk||0)+'</b> expiry risk</span><span><b>'+safe(counts.expired||0)+'</b> expired</span></div>'+(documents.length?'<div class="talent-summary-list">'+documents.map(function(document){return '<div><span><b>'+safe(document.title)+'</b><small>'+safe(document.provider)+'</small></span><em>'+safe(document.status)+(document.expiry?' &middot; '+safe(document.expiry):'')+'</em></div>'}).join('')+'</div>':'<p class="talent-action-message">No document metadata is available.</p>');
    }catch(error){panelMessage(error.message||'Document summary could not be loaded.',true)}
  }
  async function openTalentCv(profile){
    panelMessage('Preparing CV preview...',false);
    try{
      var data=await actionCall({action:'cv',target_user_id:profile.user_id});
      var panel=actionPanel();if(panel)panel.classList.add('hidden');
      if(typeof window.atsrsOpenFilePreview!=='function')throw new Error('CV preview is unavailable.');
      window.atsrsOpenFilePreview({url:data.url,title:data.file_name||'Curriculum Vitae',mimeType:data.mime_type||'application/pdf'});
    }catch(error){panelMessage(error.message||'CV could not be opened.',true)}
  }
  function ensureInbox(){
    var dashboard=byId('dashboardPage'),existing=byId('talentMessagesPanel');if(existing||!dashboard)return existing;
    var panel=document.createElement('div');panel.id='talentMessagesPanel';panel.className='panel talent-messages-panel personal-only';
    panel.innerHTML='<div class="talent-messages-head"><div><span class="pill">PROFESSIONAL MESSAGES</span><h3>Messages from companies <span id="talentUnreadCount" class="request-count">0 new</span></h3></div><button type="button" class="secondary" id="refreshTalentMessages">Refresh</button></div><p class="sub">Corporate accounts can contact you without seeing your private email address.</p><div id="talentMessagesList" class="talent-messages-list"><div class="access-empty">No messages yet.</div></div>';
    dashboard.appendChild(panel);byId('refreshTalentMessages').onclick=loadInbox;return panel;
  }
  async function loadInbox(){
    if(mode()!=='personal')return;ensureInbox();var list=byId('talentMessagesList'),count=byId('talentUnreadCount');if(!list)return;
    try{
      var data=await actionCall({action:'inbox'}),messages=Array.isArray(data.messages)?data.messages:[],unread=messages.filter(function(message){return !message.read_at}).length;
      if(count)count.textContent=unread+' new';
      list.innerHTML=messages.length?messages.map(function(message){return '<article class="talent-message'+(message.read_at?'':' is-unread')+'"><div><b>'+safe(message.sender_company)+'</b><span>'+safe(message.sender_email)+' &middot; '+safe(new Date(message.created_at).toLocaleString())+'</span></div><p>'+safe(message.body)+'</p>'+(message.read_at?'':'<button type="button" class="secondary" data-message-read="'+safe(message.id)+'">Mark as read</button>')+'</article>'}).join(''):'<div class="access-empty">No messages yet.</div>';
      list.querySelectorAll('[data-message-read]').forEach(function(button){button.onclick=async function(){button.disabled=true;try{await actionCall({action:'mark_read',message_id:button.dataset.messageRead});await loadInbox()}catch(error){button.disabled=false}}});
    }catch(error){list.innerHTML='<div class="access-empty">Messages could not be loaded.</div>'}
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
    setTimeout(function(){if(mode()==='personal'){syncOwnProfile(true);loadInbox()}else if(byId('personnelPage')&&!byId('personnelPage').classList.contains('hidden'))loadDirectory()},1200);
    window.addEventListener('atsrs:resume',function(){if(mode()==='personal'){syncOwnProfile(false);loadInbox()}else loadDirectory()});
    setInterval(function(){if(mode()==='personal')syncOwnProfile(false)},300000);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind,{once:true});else bind();
  window.atsrsTalentDirectory={load:loadDirectory,sync:syncOwnProfile};
})();
