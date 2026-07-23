/* ATSRS V279 - linked corporate personnel directory. */
(function(){
  'use strict';
  var profiles=[];
  var linkedPersonnel=[];
  var loading=false;
  var lastSync=0;

  function byId(id){return document.getElementById(id)}
  function client(){return window.supabaseClient||null}
  function mode(){try{return localStorage.getItem('atsrs_use_mode')||window.useMode||'personal'}catch(e){return 'personal'}}
  function safe(value){return String(value==null?'':value).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
  function normalized(value){return String(value||'').trim().toLowerCase()}
  function unique(values){return Array.from(new Set(values.filter(Boolean))).sort(function(a,b){return a.localeCompare(b)})}
  function normalizeWorkPreferences(values){
    var allowed=['any','freelance','contract','permanent'];
    var next=(Array.isArray(values)?values:[values]).filter(function(value,index,list){
      return allowed.indexOf(value)>=0&&list.indexOf(value)===index;
    });
    if(next.indexOf('any')>=0)return ['any'];
    return next.length?next:['any'];
  }
  function checkedValues(root){
    return root?Array.from(root.querySelectorAll('input[type="checkbox"]:checked')).map(function(input){return input.value}):[];
  }
  function storedProfile(){
    try{
      var key=typeof window.localKey==='function'?window.localKey('profile'):'atsrs_'+((window.currentUser&&window.currentUser.id)||'local_test_user')+'_profile';
      var raw=window.atsrsCloudData&&window.atsrsCloudData.isManagedKey(key)
        ?window.atsrsCloudData.read(key)
        :localStorage.getItem(key);
      return raw?JSON.parse(raw):{};
    }catch(error){return {}}
  }
  function profileFromForm(){
    var stored=storedProfile();
    var availabilityStatus=(byId('profileAvailabilityStatus')&&byId('profileAvailabilityStatus').value||stored.availabilityStatus||'not_set').trim();
    var availableFrom=(byId('profileAvailableFrom')&&byId('profileAvailableFrom').value||stored.availableFrom||'').trim();
    var workRoot=byId('profileWorkPreferences');
    var workPreferences=normalizeWorkPreferences(workRoot?checkedValues(workRoot):(stored.workPreferences||stored.workPreference||'any'));
    if(availabilityStatus==='available_from'&&!availableFrom)availabilityStatus='not_set';
    return {
      name:(byId('profileName')&&byId('profileName').value||'').trim(),
      surname:(byId('profileSurname')&&byId('profileSurname').value||'').trim(),
      position:(byId('profilePosition')&&byId('profilePosition').value||'').trim(),
      country:(byId('profileCountry')&&byId('profileCountry').value||'').trim(),
      company:(byId('profileCompany')&&byId('profileCompany').value||'').trim(),
      availabilityStatus:availabilityStatus,
      availableFrom:availabilityStatus==='available_from'?availableFrom:null,
      workPreferences:workPreferences,
      workPreference:workPreferences[0]||'any',
      availabilityConfirmedAt:stored.availabilityConfirmedAt||null
    };
  }
  function complete(profile){return !!(profile.name&&profile.surname&&profile.position&&profile.country)}
  async function user(){
    var c=client();if(!c||!c.auth)return null;
    var result=await c.auth.getUser();return result&&result.data&&result.data.user||null;
  }
  async function actionCall(payload){
    var c=client();if(!c||!c.functions)throw new Error('ATSRS service is unavailable.');
    var sessionResult=await c.auth.getSession();
    var session=sessionResult&&sessionResult.data&&sessionResult.data.session;
    if(!session||!session.access_token)throw new Error('Your session has expired. Please sign in again.');
    var result=await c.functions.invoke('talent-profile-actions',{
      body:payload||{},
      headers:{Authorization:'Bearer '+session.access_token}
    });
    if(result.error){
      var message='';
      try{
        var response=result.error.context;
        if(response&&typeof response.clone==='function')response=response.clone();
        if(response&&typeof response.json==='function'){
          var details=await response.json();
          message=details&&details.error||details&&details.message||'';
        }
      }catch(ignore){}
      throw new Error(message||'The ATSRS service could not complete this request. Please try again.');
    }
    if(!result.data||result.data.error)throw new Error(result.data&&result.data.error||'The request could not be completed.');
    return result.data;
  }
  async function syncOwnProfile(force){
    if(mode()!=='personal'||loading)return false;
    if(!force&&Date.now()-lastSync<240000)return true;
    var c=client(),u=await user(),profile=profileFromForm();
    if(!c||!u||!complete(profile))return false;
    var isAvailable=['available_now','available_from','open_to_offers'].indexOf(profile.availabilityStatus)>=0;
    var result=await c.from('atsrs_talent_profiles').upsert({
      user_id:u.id,name:profile.name,surname:profile.surname,position:profile.position,
      country:profile.country,company:profile.company||null,available:isAvailable,discoverable:true,
      availability_status:profile.availabilityStatus,available_from:profile.availableFrom,
      work_preference:profile.workPreference,work_preferences:profile.workPreferences,
      availability_confirmed_at:profile.availabilityConfirmedAt,
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
    return {key:'away',label:'Profile listed'};
  }
  function linkedRecord(id){
    return linkedPersonnel.find(function(item){return item.professional_user_id===id})||null;
  }
  function saveWorkspaceLink(profile,remove){
    if(typeof window.getData!=='function'||typeof window.saveData!=='function')return;
    var personnel=window.getData('personnel');
    personnel=Array.isArray(personnel)?personnel.slice():[];
    var index=personnel.findIndex(function(item){
      if(item&&item.linkedUserId===profile.user_id)return true;
      return normalized((item&&item.name)+' '+(item&&item.surname))===normalized(profile.name+' '+profile.surname)
        &&normalized(item&&item.position)===normalized(profile.position);
    });
    if(remove){
      if(index>=0&&personnel[index]&&personnel[index].source==='talent_directory')personnel.splice(index,1);
    }else{
      var publicRecord={
        linkedUserId:profile.user_id,source:'talent_directory',linkedStatus:'linked',
        accessStatus:'public_profile_only',trackerStatus:'awaiting_document_access',
        name:profile.name||'',surname:profile.surname||'',position:profile.position||'',
        country:profile.country||'',company:profile.company||'',email:'',phone:''
      };
      if(index>=0)personnel[index]=Object.assign({},personnel[index],publicRecord);
      else personnel.push(publicRecord);
    }
    window.saveData('personnel',personnel);
    if(window.atsrsCloudData&&typeof window.atsrsCloudData.flush==='function')window.atsrsCloudData.flush();
  }
  function renderLinkedPersonnel(){
    var list=byId('linkedPersonnelList'),count=byId('linkedPersonnelCount');if(!list)return;
    var rows=linkedPersonnel.filter(function(item){return item&&item.profile});
    if(count)count.textContent=rows.length+' linked';
    if(!rows.length){list.innerHTML='<div class="linked-personnel-empty">No professionals added yet. Use “Add to Personnel” from a professional profile.</div>';return}
    list.innerHTML='<div class="linked-personnel-table" role="table"><div class="linked-personnel-row is-head" role="row"><span>Professional</span><span>Profession</span><span>Access</span><span>Tracking</span><span>Action</span></div>'+
      rows.map(function(item){
        var profile=item.profile,access=item.status==='access_granted'?'Access granted':item.status==='access_pending'?'Access requested':item.status==='access_revoked'?'Access revoked':'Public profile only';
        var tracking=item.status==='access_granted'?'Active':'Waiting for document access';
        return '<div class="linked-personnel-row" role="row">'+
          '<span><b>'+safe(profile.name+' '+profile.surname)+'</b><small>'+safe(profile.country||'Country not listed')+'</small></span>'+
          '<span>'+safe(profile.position||'Profession not listed')+'</span><span>'+safe(access)+'</span><span>'+safe(tracking)+'</span>'+
          '<span class="linked-personnel-actions"><button type="button" class="secondary" data-linked-open="'+safe(profile.user_id)+'">Open profile</button><button type="button" class="secondary is-remove" data-linked-remove="'+safe(profile.user_id)+'">Remove</button></span></div>';
      }).join('')+'</div>';
    list.querySelectorAll('[data-linked-open]').forEach(function(button){button.onclick=function(){openProfile(button.dataset.linkedOpen)}});
    list.querySelectorAll('[data-linked-remove]').forEach(function(button){button.onclick=function(){removeFromPersonnel(button.dataset.linkedRemove,button)}});
  }
  async function loadPersonnelLinks(){
    var data=await actionCall({action:'personnel_links'});
    linkedPersonnel=Array.isArray(data.personnel)?data.personnel:[];
    linkedPersonnel.forEach(function(item){if(item.profile)saveWorkspaceLink(item.profile,false)});
    renderLinkedPersonnel();
  }
  async function addToPersonnel(profile,button){
    if(button){button.disabled=true;button.textContent='Adding...'}
    try{
      var data=await actionCall({action:'add_to_personnel',target_user_id:profile.user_id});
      saveWorkspaceLink(data.profile||profile,false);
      await loadPersonnelLinks();
      if(button){button.textContent='Added to Personnel';button.classList.add('is-added')}
      panelMessage('Added to Company Personnel. Only public profile details were copied; private documents still require permission.',false);
    }catch(error){
      if(button){button.disabled=false;button.textContent='Add to Personnel'}
      panelMessage(error.message||'This professional could not be added.',true);
    }
  }
  async function removeFromPersonnel(id,button){
    var profile=profiles.find(function(item){return item.user_id===id})||(linkedRecord(id)&&linkedRecord(id).profile);
    if(!profile)return;
    if(!window.confirm('Remove '+profile.name+' '+profile.surname+' from Company Personnel?'))return;
    if(button){button.disabled=true;button.textContent='Removing...'}
    try{
      await actionCall({action:'remove_from_personnel',target_user_id:id});
      saveWorkspaceLink(profile,true);
      linkedPersonnel=linkedPersonnel.filter(function(item){return item.professional_user_id!==id});
      renderLinkedPersonnel();render();
      var modal=byId('atsrsTalentModal');if(modal)modal.remove();
    }catch(error){
      if(button){button.disabled=false;button.textContent='Remove'}
      panelMessage(error.message||'This professional could not be removed.',true);
    }
  }
  function preferenceLabel(value){
    var labels={freelance:'Freelance',contract:'Contract',permanent:'Permanent',any:'Any opportunity'};
    return normalizeWorkPreferences(value).map(function(item){return labels[item]}).join(' · ');
  }
  function availability(profile){
    var preferences=profile.work_preferences||profile.work_preference||'any';
    var confirmed=profile.availability_confirmed_at?new Date(profile.availability_confirmed_at).getTime():0;
    var stale=!confirmed||Date.now()-confirmed>60*24*60*60*1000;
    if(stale&&profile.availability_status&&profile.availability_status!=='not_set'){
      return {key:'stale',label:'Availability not recently confirmed',detail:preferenceLabel(preferences),stale:true};
    }
    var status=profile.availability_status||'not_set';
    if(status==='available_now')return {key:'now',label:'Available now',detail:preferenceLabel(preferences)};
    if(status==='open_to_offers')return {key:'offers',label:'Open to offers',detail:preferenceLabel(preferences)};
    if(status==='not_available')return {key:'unavailable',label:'Not currently available',detail:preferenceLabel(preferences)};
    if(status==='available_from'&&profile.available_from){
      var date=new Date(profile.available_from+'T00:00:00');
      var formatter=new Intl.DateTimeFormat('en',{day:'2-digit',month:'short',year:'numeric'});
      if(date.getTime()<=Date.now())return {key:'now',label:'Available now',detail:'Available since '+formatter.format(date)+' · '+preferenceLabel(preferences)};
      return {key:'from',label:'Available from '+formatter.format(date),detail:preferenceLabel(preferences),date:date};
    }
    return {key:'unset',label:'Availability not specified',detail:preferenceLabel(preferences)};
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
    var availabilityFilter=byId('talentAvailabilityFilter')&&byId('talentAvailabilityFilter').value||'';
    var workPreferences=checkedValues(byId('talentWorkPreferenceFilter'));
    return profiles.filter(function(profile){
      var hay=normalized([profile.name,profile.surname,profile.position,profile.country,profile.company].join(' '));
      if(query&&hay.indexOf(query)<0)return false;
      if(position&&normalized(profile.position)!==position)return false;
      if(country&&normalized(profile.country)!==country)return false;
      var workStatus=availability(profile);
      if(availabilityFilter==='online'&&activity(profile).key!=='online')return false;
      if(availabilityFilter==='available_now'&&workStatus.key!=='now')return false;
      if(availabilityFilter==='open_to_offers'&&workStatus.key!=='offers')return false;
      if(availabilityFilter==='within_30'){
        var within=workStatus&&workStatus.key==='now';
        if(workStatus&&workStatus.key==='from'&&workStatus.date){
          var days=Math.ceil((workStatus.date.getTime()-Date.now())/86400000);
          within=days>=0&&days<=30;
        }
        if(!within)return false;
      }
      if(workPreferences.length){
        var profilePreferences=normalizeWorkPreferences(profile.work_preferences||profile.work_preference||'any');
        if(profilePreferences.indexOf('any')<0&&!workPreferences.some(function(value){return profilePreferences.indexOf(value)>=0}))return false;
      }
      return true;
    });
  }
  function render(){
    var grid=byId('talentDirectoryGrid'),count=byId('talentDirectoryCount'),status=byId('talentDirectoryStatus');if(!grid)return;
    var visible=filtered();
    if(count)count.textContent=visible.length+' professional'+(visible.length===1?'':'s');
    if(status)status.classList.add('hidden');
    if(!visible.length){grid.innerHTML='<div class="talent-empty"><b>No matching professionals</b><span>Try a broader profession, country or name.</span></div>';return}
    grid.innerHTML=visible.map(function(profile){var active=activity(profile),work=availability(profile);return '<article class="talent-card">'+
      '<div class="talent-card-top"><div class="talent-avatar" aria-hidden="true">'+safe((profile.name||'?').charAt(0)+(profile.surname||'').charAt(0))+'</div><span class="talent-presence is-'+active.key+'"><i></i>'+safe(active.label)+'</span></div>'+
      '<h4>'+safe(profile.name+' '+profile.surname)+'</h4><p class="talent-role">'+safe(profile.position)+'</p>'+
      '<div class="talent-work-status is-'+safe(work.key)+'"><b>'+safe(work.label)+'</b><span>'+safe(work.detail)+'</span></div>'+
      '<dl><div><dt>Country</dt><dd>'+safe(profile.country)+'</dd></div><div><dt>Current workplace</dt><dd>'+safe(profile.company||'Independent professional')+'</dd></div></dl>'+
      '<button type="button" class="secondary talent-view" data-talent-id="'+safe(profile.user_id)+'">View professional profile</button></article>'}).join('');
    grid.querySelectorAll('.talent-view').forEach(function(button){button.onclick=function(){openProfile(button.dataset.talentId)}});
  }
  function openProfile(id){
    var profile=profiles.find(function(item){return item.user_id===id});if(!profile)return;
    var active=activity(profile),work=availability(profile),isLinked=!!linkedRecord(id),old=byId('atsrsTalentModal');if(old)old.remove();
    var modal=document.createElement('div');modal.id='atsrsTalentModal';modal.className='talent-modal';
    modal.innerHTML='<button type="button" class="talent-modal-backdrop" aria-label="Close"></button><div class="talent-modal-card" role="dialog" aria-modal="true" aria-labelledby="talentModalName"><button type="button" class="talent-modal-close" aria-label="Close">&times;</button><div class="talent-avatar">'+safe((profile.name||'?').charAt(0)+(profile.surname||'').charAt(0))+'</div><span class="talent-presence is-'+active.key+'"><i></i>'+safe(active.label)+'</span><h3 id="talentModalName">'+safe(profile.name+' '+profile.surname)+'</h3><p class="talent-role">'+safe(profile.position)+'</p><div class="talent-work-status is-'+safe(work.key)+'"><b>'+safe(work.label)+'</b><span>'+safe(work.detail)+'</span></div><dl><div><dt>Country</dt><dd>'+safe(profile.country)+'</dd></div><div><dt>Current workplace</dt><dd>'+safe(profile.company||'Independent professional')+'</dd></div></dl><div class="talent-profile-actions"><button type="button" class="secondary" data-talent-action="message">Send Message</button><button type="button" class="secondary" data-talent-action="summary">Document Summary</button><button type="button" class="secondary" data-talent-action="cv">View CV</button><button type="button" class="secondary talent-add-personnel'+(isLinked?' is-added':'')+'" data-talent-action="personnel"'+(isLinked?' disabled':'')+'>'+(isLinked?'Added to Personnel':'Add to Personnel')+'</button></div><div class="talent-action-panel hidden" id="talentActionPanel"></div><p class="talent-privacy-note">Contact details remain private. Adding this profile copies public professional details only; CV and documents require separate permission.</p></div>';
    document.body.appendChild(modal);modal.querySelectorAll('.talent-modal-backdrop,.talent-modal-close').forEach(function(button){button.onclick=function(){modal.remove()}});
    modal.querySelector('[data-talent-action="message"]').onclick=function(){showMessageForm(profile)};
    modal.querySelector('[data-talent-action="summary"]').onclick=function(){showDocumentSummary(profile)};
    modal.querySelector('[data-talent-action="cv"]').onclick=function(){openTalentCv(profile)};
    modal.querySelector('[data-talent-action="personnel"]').onclick=function(){addToPersonnel(profile,this)};
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
    var result=await c.from('atsrs_talent_profiles').select('user_id,name,surname,position,country,company,available,availability_status,available_from,work_preference,work_preferences,availability_confirmed_at,last_active_at,updated_at').eq('discoverable',true).order('last_active_at',{ascending:false});
    loading=false;
    if(result.error){if(status){status.textContent='Professional profiles could not be loaded. Please refresh and try again.';status.classList.remove('hidden')}console.warn('ATSRS talent directory load failed',result.error);return}
    profiles=Array.isArray(result.data)?result.data:[];
    try{await loadPersonnelLinks()}catch(error){console.warn('ATSRS linked personnel load failed',error);renderLinkedPersonnel()}
    fillSelect('talentPositionFilter',profiles.map(function(profile){return profile.position}),'All professions');
    fillSelect('talentCountryFilter',profiles.map(function(profile){return profile.country}),'All countries');
    render();
  }
  function bind(){
    ['talentSearch','talentPositionFilter','talentCountryFilter','talentAvailabilityFilter'].forEach(function(id){var el=byId(id);if(el)el.addEventListener(id==='talentSearch'?'input':'change',render)});
    var workFilter=byId('talentWorkPreferenceFilter');
    if(workFilter){
      workFilter.addEventListener('change',function(){
        var selected=checkedValues(workFilter),summary=workFilter.querySelector('summary');
        if(summary)summary.textContent=!selected.length?'All work types':selected.length===1?preferenceLabel(selected):selected.length+' work types';
        render();
      });
    }
    var oldSave=window.saveProfile;
    if(typeof oldSave==='function')window.saveProfile=async function(){var result=await oldSave.apply(this,arguments);if(result!==false)await syncOwnProfile(true);return result};
    var oldShow=window.showPage;
    if(typeof oldShow==='function')window.showPage=function(){var result=oldShow.apply(this,arguments);if(String(arguments[0]||'')==='personnel')setTimeout(loadDirectory,30);return result};
    setTimeout(function(){if(mode()==='personal'){syncOwnProfile(true);loadInbox()}else if(byId('personnelPage')&&!byId('personnelPage').classList.contains('hidden'))loadDirectory()},1200);
    window.addEventListener('atsrs:resume',function(){if(mode()==='personal'){syncOwnProfile(false);loadInbox()}else loadDirectory()});
    setInterval(function(){if(mode()==='personal')syncOwnProfile(false)},300000);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind,{once:true});else bind();
  window.atsrsTalentAvailability=availability;
  window.atsrsTalentDirectory={load:loadDirectory,sync:syncOwnProfile};
})();
