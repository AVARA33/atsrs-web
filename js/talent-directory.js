/* ATSRS V354 - certificate-qualified candidate directory. */
(function(){
  'use strict';
  var profiles=[];
  var directoryMeta={eligible_profiles:0,document_owners:0,returned_profiles:0};
  var linkedPersonnel=[];
  var loading=false;
  var lastSync=0;
  var activeActionPanel=null;
  var candidateView='cards';
  var personnelView='list';
  var personnelSortBy='name';
  var personnelSortDirection='asc';
  var talentMailbox='active';
  try{
    candidateView=localStorage.getItem('atsrs_candidate_view')||'cards';
    personnelView=localStorage.getItem('atsrs_personnel_view')||'list';
  }catch(ignore){}

  function byId(id){return document.getElementById(id)}
  function client(){return window.supabaseClient||null}
  function mode(){try{return localStorage.getItem('atsrs_use_mode')||window.useMode||'personal'}catch(e){return 'personal'}}
  function safe(value){return String(value==null?'':value).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
  function friendlyError(error,fallback){
    var text=String(error&&error.message||'').toLowerCase();
    if(/not authenticated|unauthorized|jwt|session|sign in/.test(text))return 'Your session has expired. Please sign in again.';
    if(/network|fetch|connection|timeout|offline/.test(text))return 'Connection problem. Check your internet and try again.';
    return fallback;
  }
  function safeAvatar(value){
    try{var parsed=new URL(String(value||''),location.origin);return parsed.protocol==='https:'?parsed.href:''}catch(error){return ''}
  }
  function avatarMarkup(profile){
    var url=safeAvatar(profile&&profile.avatar_url),letters=safe((profile&&profile.name||'?').charAt(0)+(profile&&profile.surname||'').charAt(0));
    return '<div class="talent-avatar" aria-hidden="true">'+(url?'<img src="'+safe(url)+'" alt="" loading="lazy" referrerpolicy="no-referrer">':letters)+'</div>';
  }
  function normalized(value){return String(value||'').trim().toLowerCase()}
  function unique(values){return Array.from(new Set(values.filter(Boolean))).sort(function(a,b){return a.localeCompare(b)})}
  function formValue(id,fallback){
    var el=byId(id);
    var value=el?el.value:fallback;
    return String(value||'').trim();
  }
  function cleanPhonePart(value){return String(value||'').replace(/[^\d]/g,'').trim()}
  function combinedPhone(code,local){return local?String(code||'+994')+cleanPhonePart(local):''}
  function ageFromBirthDate(value){
    if(!value)return '';
    var date=new Date(value+'T00:00:00');
    if(isNaN(date.getTime()))return '';
    var now=new Date(),age=now.getFullYear()-date.getFullYear();
    var beforeBirthday=now.getMonth()<date.getMonth()||(now.getMonth()===date.getMonth()&&now.getDate()<date.getDate());
    return String(beforeBirthday?age-1:age);
  }
  function verificationBadge(label,verified){
    return '<span class="talent-verification-badge '+(verified?'is-verified':'is-pending')+'">'+safe(label)+': '+safe(verified?'Verified':'Not verified')+'</span>';
  }
  function officialDetailsMarkup(profile){
    var phone=profile.phone_number||combinedPhone(profile.phone_country_code,profile.phone_local);
    var whatsapp=profile.whatsapp_number||combinedPhone(profile.whatsapp_country_code,profile.whatsapp_local);
    var age=ageFromBirthDate(profile.birth_date);
    return '<div class="talent-official-details" aria-label="Official candidate information">'+
      '<div><dt>Mobile phone</dt><dd>'+safe(phone||'Not provided')+' '+verificationBadge('Mobile',!!profile.phone_verified)+'</dd></div>'+
      '<div><dt>WhatsApp</dt><dd>'+safe(whatsapp||'Not provided')+' '+verificationBadge('WhatsApp',!!profile.whatsapp_verified)+'</dd></div>'+
      '<div><dt>Age</dt><dd>'+safe(age?age+' years':'Not provided')+'</dd></div>'+
      '<div><dt>ZIP / postal code</dt><dd>'+safe(profile.zip_code||'Not provided')+'</dd></div>'+
    '</div>';
  }
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
    var phoneCode=formValue('profilePhoneCountryCode',stored.phoneCountryCode||'+994')||'+994';
    var phoneLocal=cleanPhonePart(formValue('profilePhoneLocal',stored.phoneLocal||''));
    var phoneNumber=formValue('profilePhone',stored.phone||stored.phoneNumber||combinedPhone(phoneCode,phoneLocal));
    var whatsappCode=formValue('profileWhatsappCountryCode',stored.whatsappCountryCode||phoneCode)||phoneCode;
    var whatsappLocal=cleanPhonePart(formValue('profileWhatsappLocal',stored.whatsappLocal||''));
    var whatsappNumber=formValue('profileWhatsapp',stored.whatsapp||stored.whatsappNumber||combinedPhone(whatsappCode,whatsappLocal));
    if(availabilityStatus==='available_from'&&!availableFrom)availabilityStatus='not_set';
    return {
      name:(byId('profileName')&&byId('profileName').value||'').trim(),
      surname:(byId('profileSurname')&&byId('profileSurname').value||'').trim(),
      position:(byId('profilePosition')&&byId('profilePosition').value||'').trim(),
      country:(byId('profileCountry')&&byId('profileCountry').value||'').trim(),
      company:(byId('profileCompany')&&byId('profileCompany').value||'').trim(),
      phoneCountryCode:phoneCode,
      phoneLocal:phoneLocal,
      phoneNumber:phoneNumber||combinedPhone(phoneCode,phoneLocal),
      phoneVerified:!!stored.phoneVerified,
      whatsappCountryCode:whatsappCode,
      whatsappLocal:whatsappLocal,
      whatsappNumber:whatsappNumber||combinedPhone(whatsappCode,whatsappLocal),
      whatsappVerified:!!stored.whatsappVerified,
      zipCode:formValue('profileZipCode',stored.zipCode||''),
      birthDate:formValue('profileBirthDate',stored.birthDate||''),
      visibility:formValue('profileVisibility',stored.visibility||'Private')||'Private',
      availabilityStatus:availabilityStatus,
      availableFrom:availabilityStatus==='available_from'?availableFrom:null,
      workPreferences:workPreferences,
      workPreference:workPreferences[0]||'any',
      availabilityConfirmedAt:stored.availabilityConfirmedAt||null,
      avatarUrl:(window.atsrsProfilePhoto&&window.atsrsProfilePhoto.currentUrl&&window.atsrsProfilePhoto.currentUrl())||stored.avatarUrl||''
    };
  }
  function complete(profile){return !!(profile.name&&profile.surname&&profile.position&&profile.country)}
  function profileReadiness(profile){
    var status=String(profile&&profile.availability_status||'not_set');
    var preferences=normalizeWorkPreferences(profile&&(
      profile.work_preferences||profile.work_preference||[]
    ));
    var checks=[
      profile&&profile.name,
      profile&&profile.surname,
      profile&&profile.position,
      profile&&profile.country,
      profile&&profile.company,
      safeAvatar(profile&&profile.avatar_url),
      status!=='not_set',
      status!=='available_from'||!!(profile&&profile.available_from),
      profile&&profile.availability_confirmed_at,
      preferences.length>0
    ];
    return checks.reduce(function(score,value){return score+(value?10:0)},0);
  }
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
    if(!c||!u)return false;
    var isPublic=profile.visibility==='Public';
    if(!complete(profile)){
      if(!isPublic){
        var hidden=await c.from('atsrs_talent_profiles').update({
          discoverable:false,profile_visibility:profile.visibility,updated_at:new Date().toISOString()
        }).eq('user_id',u.id);
        if(hidden.error){console.warn('ATSRS talent privacy sync failed',hidden.error);return false}
        lastSync=Date.now();return true;
      }
      return false;
    }
    var isAvailable=['available_now','available_from','open_to_offers'].indexOf(profile.availabilityStatus)>=0;
    var result=await c.from('atsrs_talent_profiles').upsert({
      user_id:u.id,name:profile.name,surname:profile.surname,position:profile.position,
      country:profile.country,company:profile.company||null,available:isAvailable,
      discoverable:isPublic,profile_visibility:profile.visibility,
      availability_status:profile.availabilityStatus,available_from:profile.availableFrom,
      work_preference:profile.workPreference,work_preferences:profile.workPreferences,
      availability_confirmed_at:profile.availabilityConfirmedAt,
      avatar_url:safeAvatar(profile.avatarUrl)||null,
      phone_country_code:profile.phoneCountryCode||null,
      phone_local:profile.phoneLocal||null,
      phone_number:profile.phoneNumber||null,
      phone_verified:!!profile.phoneVerified,
      whatsapp_country_code:profile.whatsappCountryCode||null,
      whatsapp_local:profile.whatsappLocal||null,
      whatsapp_number:profile.whatsappNumber||null,
      whatsapp_verified:!!profile.whatsappVerified,
      zip_code:profile.zipCode||null,
      birth_date:profile.birthDate||null,
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
  function updateViewSwitches(){
    document.querySelectorAll('[data-candidate-view]').forEach(function(button){
      button.classList.toggle('active',button.dataset.candidateView===candidateView);
      button.setAttribute('aria-pressed',button.dataset.candidateView===candidateView?'true':'false');
    });
    document.querySelectorAll('[data-personnel-view]').forEach(function(button){
      button.classList.toggle('active',button.dataset.personnelView===personnelView);
      button.setAttribute('aria-pressed',button.dataset.personnelView===personnelView?'true':'false');
    });
  }
  function upsertLinkedPersonnel(link,profile){
    if(!profile||!profile.user_id)return null;
    var record=Object.assign({},link||{},{
      professional_user_id:(link&&link.professional_user_id)||profile.user_id,
      profile:profile
    });
    var index=linkedPersonnel.findIndex(function(item){return item&&item.professional_user_id===record.professional_user_id});
    if(index>=0)linkedPersonnel[index]=Object.assign({},linkedPersonnel[index],record);
    else linkedPersonnel.push(record);
    saveWorkspaceLink(profile,false);
    renderLinkedPersonnel();
    return record;
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
        country:profile.country||'',company:profile.company||'',email:'',
        phone:profile.phone_number||'',phoneVerified:!!profile.phone_verified,
        whatsapp:profile.whatsapp_number||'',whatsappVerified:!!profile.whatsapp_verified,
        zipCode:profile.zip_code||'',birthDate:profile.birth_date||''
      };
      if(index>=0)personnel[index]=Object.assign({},personnel[index],publicRecord);
      else personnel.push(publicRecord);
    }
    window.saveData('personnel',personnel);
    if(window.atsrsCloudData&&typeof window.atsrsCloudData.flush==='function')window.atsrsCloudData.flush();
  }
  function workspacePersonnelRecord(profile){
    if(!profile||typeof window.getData!=='function')return {};
    var personnel=window.getData('personnel');
    personnel=Array.isArray(personnel)?personnel:[];
    return personnel.find(function(item){
      if(item&&item.linkedUserId===profile.user_id)return true;
      return normalized((item&&item.name)+' '+(item&&item.surname))===normalized(profile.name+' '+profile.surname)
        &&normalized(item&&item.position)===normalized(profile.position);
    })||{};
  }
  function personnelProject(profile){
    var record=workspacePersonnelRecord(profile);
    return String(record.project||record.vessel||'').trim();
  }
  function personnelWorkStatusKey(profile){
    var status=String(profile&&profile.availability_status||'not_set');
    if(status==='available_now'||status==='available_from')return 'available';
    if(status==='open_to_offers')return 'open_to_offers';
    if(status==='not_available')return 'not_available';
    return 'not_set';
  }
  function personnelAccessKey(item){
    return item&&item.status&&item.status!=='linked'?item.status:'public_profile_only';
  }
  function recentUpload(value){var time=new Date(value||'').getTime();return Number.isFinite(time)&&time>=Date.now()-7*86400000}
  function uploadDateLabel(value){var date=new Date(value||'');return Number.isFinite(date.getTime())?date.toLocaleDateString(undefined,{day:'2-digit',month:'short',year:'numeric'}):'No uploads'}
  function personnelDocumentMarkup(item){
    var count=Number(item&&item.document_count||0),recent=Number(item&&item.recent_document_count||0),latest=item&&item.latest_document_uploaded_at;
    if(!count)return '<span class="personnel-document-update">No documents</span>';
    return '<span class="personnel-document-update'+(recentUpload(latest)?' is-recent':'')+'">'+(recent?'<b>NEW</b> ':'')+safe(uploadDateLabel(latest))+' · '+count+' document'+(count===1?'':'s')+'</span>';
  }
  function personnelSortHeading(key,label){
    var active=personnelSortBy===key;
    return '<span><button type="button" class="personnel-column-sort'+(active?' is-active':'')+(active&&personnelSortDirection==='desc'?' is-desc':'')+'" data-personnel-sort="'+key+'" aria-label="Sort by '+safe(label)+'">'+safe(label)+'<i class="personnel-sort-arrows" aria-hidden="true"><b></b><em></em></i></button></span>';
  }
  var personnelComboboxValues={profession:[],project:[]};
  function personnelComboboxConfig(kind){
    return kind==='project'
      ?{input:'personnelProjectFilter',options:'personnelProjectOptions',all:'All projects'}
      :{input:'personnelProfessionFilter',options:'personnelProfessionOptions',all:'All professions'};
  }
  function setPersonnelComboboxOpen(kind,open){
    var config=personnelComboboxConfig(kind),input=byId(config.input),options=byId(config.options);
    if(!input||!options)return;
    options.classList.toggle('hidden',!open);
    input.setAttribute('aria-expanded',open?'true':'false');
  }
  function renderPersonnelComboboxOptions(kind){
    var config=personnelComboboxConfig(kind),input=byId(config.input),options=byId(config.options);if(!input||!options)return;
    var query=normalized(input.value),values=(personnelComboboxValues[kind]||[]).filter(function(value){return !query||normalized(value).indexOf(query)>=0});
    options.innerHTML='<button type="button" role="option" data-personnel-filter-value="">'+safe(config.all)+'</button>'+
      (values.length
        ?values.map(function(value){return '<button type="button" role="option" data-personnel-filter-value="'+safe(value)+'">'+safe(value)+'</button>'}).join('')
        :'<span class="personnel-combobox-empty">No matching saved options</span>');
  }
  function fillPersonnelCombobox(kind,values){
    personnelComboboxValues[kind]=unique(values);
    renderPersonnelComboboxOptions(kind);
  }
  function filteredPersonnelRows(){
    var query=normalized(byId('personnelSearch')&&byId('personnelSearch').value);
    var profession=normalized(byId('personnelProfessionFilter')&&byId('personnelProfessionFilter').value);
    var workStatus=byId('personnelWorkStatusFilter')&&byId('personnelWorkStatusFilter').value||'';
    var project=normalized(byId('personnelProjectFilter')&&byId('personnelProjectFilter').value);
    var access=byId('personnelAccessFilter')&&byId('personnelAccessFilter').value||'';
    var documentFilter=byId('personnelDocumentFilter')&&byId('personnelDocumentFilter').value||'';
    var sortBy=personnelSortBy;
    var rows=linkedPersonnel.filter(function(item){
      var profile=item&&item.profile;if(!profile)return false;
      if(query&&normalized(profile.name+' '+profile.surname).indexOf(query)<0)return false;
      if(profession&&normalized(profile.position).indexOf(profession)<0)return false;
      if(workStatus&&personnelWorkStatusKey(profile)!==workStatus)return false;
      if(project&&normalized(personnelProject(profile)||'Unassigned').indexOf(project)<0)return false;
      if(access&&personnelAccessKey(item)!==access)return false;
      if(documentFilter==='recent'&&!Number(item.recent_document_count||0))return false;
      if(documentFilter==='has_documents'&&!Number(item.document_count||0))return false;
      if(documentFilter==='no_documents'&&Number(item.document_count||0))return false;
      return true;
    });
    rows.sort(function(a,b){
      var ap=a.profile,bp=b.profile,av='',bv='';
      if(sortBy==='profession'){av=ap.position;bv=bp.position}
      else if(sortBy==='status'){av=availability(ap).label;bv=availability(bp).label}
      else if(sortBy==='project'){av=personnelProject(ap);bv=personnelProject(bp)}
      else{av=ap.name+' '+ap.surname;bv=bp.name+' '+bp.surname}
      var result=String(av||'').localeCompare(String(bv||''),undefined,{sensitivity:'base'});
      return personnelSortDirection==='desc'?-result:result;
    });
    return rows;
  }
  function renderLinkedPersonnelModern(){
    var list=byId('linkedPersonnelList'),count=byId('linkedPersonnelCount');if(!list)return;
    var allRows=linkedPersonnel.filter(function(item){return item&&item.profile});
    fillPersonnelCombobox('profession',allRows.map(function(item){return item.profile.position}));
    fillPersonnelCombobox('project',allRows.map(function(item){return personnelProject(item.profile)||'Unassigned'}));
    var rows=filteredPersonnelRows();
    if(count)count.textContent=rows.length===allRows.length?allRows.length+' linked':rows.length+' of '+allRows.length;
    updateViewSwitches();
    if(!rows.length){
      list.innerHTML=allRows.length
        ?'<div class="linked-personnel-empty"><b>No matching personnel</b><span>Clear or change the filters to see more people.</span></div>'
        :'<div class="linked-personnel-empty"><b>No personnel added yet.</b><span>Open Candidates, review a candidate profile and choose Add to Personnel.</span></div>';
      return;
    }
    if(personnelView==='cards'){
      list.innerHTML='<div class="linked-personnel-cards">'+rows.map(function(item){
        var profile=item.profile,work=availability(profile),project=personnelProject(profile)||'Unassigned';
        var access=item.status==='access_granted'?'Access granted':item.status==='access_pending'?'Access requested':item.status==='access_revoked'?'Access revoked':'Public profile only';
        var tracking=item.status==='access_granted'?'Active':'Waiting for document access';
        return '<article class="linked-personnel-card">'+
          '<div class="linked-personnel-card-head">'+avatarMarkup(profile)+'<span>'+safe(access)+'</span></div>'+
          '<h4>'+safe(profile.name+' '+profile.surname)+'</h4><p>'+safe(profile.position||'Profession not listed')+'</p>'+personnelDocumentMarkup(item)+
          '<dl><div><dt>Work status</dt><dd>'+safe(work.label)+'</dd></div><div><dt>Project</dt><dd>'+safe(project)+'</dd></div><div><dt>Country</dt><dd>'+safe(profile.country||'Not listed')+'</dd></div><div><dt>Tracking</dt><dd>'+safe(tracking)+'</dd></div></dl>'+
          '<div class="linked-personnel-actions"><button type="button" class="secondary" data-linked-open="'+safe(profile.user_id)+'">View Profile</button><button type="button" class="secondary is-remove" data-linked-remove="'+safe(profile.user_id)+'">Remove</button></div></article>';
      }).join('')+'</div>';
    }else{
      list.innerHTML='<div class="linked-personnel-table" role="table"><div class="linked-personnel-row is-head" role="row">'+
        personnelSortHeading('name','Candidate')+personnelSortHeading('profession','Profession')+personnelSortHeading('status','Work status')+personnelSortHeading('project','Project')+
        '<span>Access</span><span>Action</span></div>'+
        rows.map(function(item){
          var profile=item.profile,work=availability(profile),project=personnelProject(profile)||'Unassigned';
          var access=item.status==='access_granted'?'Access granted':item.status==='access_pending'?'Access requested':item.status==='access_revoked'?'Access revoked':'Public profile only';
          return '<div class="linked-personnel-row" role="row">'+
            '<span><b>'+safe(profile.name+' '+profile.surname)+'</b><small>'+safe(profile.country||'Country not listed')+'</small>'+personnelDocumentMarkup(item)+'</span>'+
            '<span>'+safe(profile.position||'Profession not listed')+'</span><span>'+safe(work.label)+'</span><span>'+safe(project)+'</span><span>'+safe(access)+'</span>'+
            '<span class="linked-personnel-actions"><button type="button" class="secondary" data-linked-open="'+safe(profile.user_id)+'">View Profile</button><button type="button" class="secondary is-remove" data-linked-remove="'+safe(profile.user_id)+'">Remove</button></span></div>';
        }).join('')+'</div>';
    }
    list.querySelectorAll('[data-linked-open]').forEach(function(button){button.onclick=function(){openProfile(button.dataset.linkedOpen)}});
    list.querySelectorAll('[data-linked-remove]').forEach(function(button){button.onclick=function(){removeFromPersonnel(button.dataset.linkedRemove,button)}});
  }
  function renderLinkedPersonnel(){
    return renderLinkedPersonnelModern();
    /* Retained below only for compatibility with older cached markup. */
    var list=byId('linkedPersonnelList'),count=byId('linkedPersonnelCount');if(!list)return;
    var rows=linkedPersonnel.filter(function(item){return item&&item.profile});
    if(count)count.textContent=rows.length+' linked';
    if(!rows.length){list.innerHTML='<div class="linked-personnel-empty"><b>No personnel added yet.</b><span>Open Candidates, review a candidate profile and choose “Add to Personnel”.</span></div>';return}
    list.innerHTML='<div class="linked-personnel-table" role="table"><div class="linked-personnel-row is-head" role="row"><span>Profile</span><span>Profession</span><span>Access</span><span>Tracking</span><span>Action</span></div>'+
      rows.map(function(item){
        var profile=item.profile,access=item.status==='access_granted'?'Access granted':item.status==='access_pending'?'Access requested':item.status==='access_revoked'?'Access revoked':'Public profile only';
        var tracking=item.status==='access_granted'?'Active':'Waiting for document access';
        return '<div class="linked-personnel-row" role="row">'+
          '<span><b>'+safe(profile.name+' '+profile.surname)+'</b><small>'+safe(profile.country||'Country not listed')+'</small></span>'+
          '<span>'+safe(profile.position||'Profession not listed')+'</span><span>'+safe(access)+'</span><span>'+safe(tracking)+'</span>'+
          '<span class="linked-personnel-actions"><button type="button" class="secondary" data-linked-open="'+safe(profile.user_id)+'">View Profile</button><button type="button" class="secondary is-remove" data-linked-remove="'+safe(profile.user_id)+'">Remove</button></span></div>';
      }).join('')+'</div>';
    list.querySelectorAll('[data-linked-open]').forEach(function(button){button.onclick=function(){openProfile(button.dataset.linkedOpen)}});
    list.querySelectorAll('[data-linked-remove]').forEach(function(button){button.onclick=function(){removeFromPersonnel(button.dataset.linkedRemove,button)}});
  }
  async function loadPersonnelLinks(){
    var data=await actionCall({action:'personnel_links'});
    if(!data||!Array.isArray(data.personnel))throw new Error('Personnel list could not be verified.');
    linkedPersonnel=data.personnel;
    linkedPersonnel.forEach(function(item){if(item.profile)saveWorkspaceLink(item.profile,false)});
    renderLinkedPersonnel();
    return linkedPersonnel;
  }
  async function addToPersonnel(profile,button){
    if(button){button.disabled=true;button.textContent='Adding...'}
    try{
      var data=await actionCall({action:'add_to_personnel',target_user_id:profile.user_id});
      var confirmedProfile=data.profile||profile;
      var confirmedRecord=upsertLinkedPersonnel(data.link,confirmedProfile);
      try{
        await loadPersonnelLinks();
      }catch(refreshError){
        console.warn('ATSRS personnel refresh failed after confirmed add',refreshError);
      }
      if(!linkedRecord(profile.user_id))upsertLinkedPersonnel(confirmedRecord,confirmedProfile);
      if(button){button.disabled=false;button.textContent='Remove from Personnel';button.classList.remove('is-added');button.classList.add('is-remove')}
      panelMessage('Added to Company Personnel. Only public profile details were copied; private documents still require permission.',false);
    }catch(error){
      if(button){button.disabled=false;button.textContent='Add to Personnel'}
      panelMessage(friendlyError(error,'This candidate could not be added to Personnel. Please try again.'),true);
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
      if(button){button.disabled=false;button.textContent='Remove from Personnel'}
      panelMessage(friendlyError(error,'This candidate could not be removed from Personnel. Please try again.'),true);
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
  function personnelActionMarkup(profile){
    var linked=!!linkedRecord(profile.user_id);
    return '<button type="button" class="secondary talent-add-personnel'+(linked?' is-remove':'')+'" data-list-action="personnel">'+
      (linked?'Remove from Personnel':'Add to Personnel')+'</button>';
  }
  function activateListPanel(panel){
    document.querySelectorAll('.talent-list-action-panel').forEach(function(item){
      if(item!==panel){item.classList.add('hidden');item.innerHTML=''}
    });
    activeActionPanel=panel;
  }
  function bindCandidateListActions(grid){
    grid.querySelectorAll('[data-candidate-row]').forEach(function(row){
      var profile=profiles.find(function(item){return item.user_id===row.dataset.candidateRow});
      var panel=row.querySelector('.talent-list-action-panel');if(!profile||!panel)return;
      row.querySelectorAll('[data-list-action]').forEach(function(button){
        button.onclick=function(){
          var action=button.dataset.listAction;
          if(action==='view'){openProfile(profile.user_id);return;}
          activateListPanel(panel);
          if(action==='message')showMessageForm(profile);
          if(action==='summary')showDocumentSummary(profile);
          if(action==='cv')openTalentCv(profile);
          if(action==='personnel'){
            if(linkedRecord(profile.user_id))removeFromPersonnel(profile.user_id,button);
            else addToPersonnel(profile,button);
          }
        };
      });
    });
  }
  function renderDirectoryModern(){
    var grid=byId('talentDirectoryGrid'),count=byId('talentDirectoryCount'),status=byId('talentDirectoryStatus');if(!grid)return;
    var visible=filtered();
    if(count)count.textContent=visible.length+' candidate'+(visible.length===1?'':'s');
    if(status)status.classList.add('hidden');
    updateViewSwitches();
    grid.classList.toggle('is-list',candidateView==='list');
    if(!visible.length){
      var hasDirectoryProfiles=profiles.length>0||Number(directoryMeta.returned_profiles||0)>0;
      grid.innerHTML=hasDirectoryProfiles
        ?'<div class="talent-empty"><b>No matching candidates</b><span>Try a broader profession, country or name.</span></div>'
        :'<div class="talent-empty"><b>No certificate-qualified candidates yet</b><span>Every Personal user appears here automatically after uploading at least one certificate.</span></div>';
      return;
    }
    if(candidateView==='list'){
      grid.innerHTML='<div class="talent-list-table" role="table"><div class="talent-list-row is-head" role="row"><span>Candidate</span><span>Availability</span><span>Country</span><span>Work type</span><span>Actions</span></div>'+
        visible.map(function(profile){
          var active=activity(profile),work=availability(profile);
          return '<div class="talent-list-row" role="row" data-candidate-row="'+safe(profile.user_id)+'">'+
            '<span class="talent-list-person">'+avatarMarkup(profile)+'<span><b>'+safe(profile.name+' '+profile.surname)+'</b><small>'+safe(profile.position)+'</small></span></span>'+
            '<span class="talent-list-availability"><b>'+safe(work.label)+'</b><small class="talent-presence is-'+active.key+'"><i></i>'+safe(active.label)+'</small></span>'+
            '<span>'+safe(profile.country||'Not listed')+'</span><span>'+safe(work.detail)+'</span>'+
            '<span class="talent-list-actions"><button type="button" class="secondary" data-list-action="view">View Profile</button><button type="button" class="secondary" data-list-action="message">Message</button><button type="button" class="secondary" data-list-action="summary">Summary</button><button type="button" class="secondary" data-list-action="cv">CV</button>'+personnelActionMarkup(profile)+'</span>'+
            '<div class="talent-action-panel talent-list-action-panel hidden"></div></div>';
        }).join('')+'</div>';
      bindCandidateListActions(grid);
      return;
    }
    grid.innerHTML=visible.map(function(profile){var active=activity(profile),work=availability(profile),readiness=profileReadiness(profile);return '<article class="talent-card">'+
      '<div class="talent-card-top">'+avatarMarkup(profile)+'<div class="talent-card-signals"><span class="talent-readiness">'+safe(readiness)+'% complete</span><span class="talent-presence is-'+active.key+'"><i></i>'+safe(active.label)+'</span></div></div>'+
      '<h4>'+safe(profile.name+' '+profile.surname)+'</h4><p class="talent-role">'+safe(profile.position)+'</p>'+
      '<div class="talent-work-status is-'+safe(work.key)+'"><b>'+safe(work.label)+'</b><span>'+safe(work.detail)+'</span></div>'+
      '<dl><div><dt>Country</dt><dd>'+safe(profile.country)+'</dd></div><div><dt>Current workplace</dt><dd>'+safe(profile.company||'Independent')+'</dd></div></dl>'+
      '<button type="button" class="secondary talent-view" data-talent-id="'+safe(profile.user_id)+'">View Profile</button></article>'}).join('');
    grid.querySelectorAll('.talent-view').forEach(function(button){button.onclick=function(){openProfile(button.dataset.talentId)}});
  }
  function render(){
    return renderDirectoryModern();
  }
  function openProfile(id){
    var profile=profiles.find(function(item){return item.user_id===id})||(linkedRecord(id)&&linkedRecord(id).profile);if(!profile)return;
    var active=activity(profile),work=availability(profile),isLinked=!!linkedRecord(id),old=byId('atsrsTalentModal');if(old)old.remove();
    var modal=document.createElement('div');modal.id='atsrsTalentModal';modal.className='talent-modal';
    modal.innerHTML='<button type="button" class="talent-modal-backdrop" aria-label="Close"></button><div class="talent-modal-card" role="dialog" aria-modal="true" aria-labelledby="talentModalName"><button type="button" class="talent-modal-close" aria-label="Close">&times;</button>'+avatarMarkup(profile)+'<span class="talent-presence is-'+active.key+'"><i></i>'+safe(active.label)+'</span><h3 id="talentModalName">'+safe(profile.name+' '+profile.surname)+'</h3><p class="talent-role">'+safe(profile.position)+'</p><div class="talent-work-status is-'+safe(work.key)+'"><b>'+safe(work.label)+'</b><span>'+safe(work.detail)+'</span></div><dl><div><dt>Country</dt><dd>'+safe(profile.country)+'</dd></div><div><dt>Current workplace</dt><dd>'+safe(profile.company||'Independent')+'</dd></div></dl><h4 class="talent-official-title">Official profile details</h4>'+officialDetailsMarkup(profile)+'<div class="talent-profile-actions"><button type="button" class="secondary" data-talent-action="message">Send Message</button><button type="button" class="secondary" data-talent-action="summary">Document Summary</button><button type="button" class="secondary" data-talent-action="cv">View CV</button><button type="button" class="secondary talent-add-personnel'+(isLinked?' is-remove':'')+'" data-talent-action="personnel">'+(isLinked?'Remove from Personnel':'Add to Personnel')+'</button></div><div class="talent-action-panel hidden" id="talentActionPanel"></div><p class="talent-privacy-note">Contact details remain controlled by ATSRS. Official fields show only the profile data the candidate has provided; document access still requires separate permission.</p></div>';
    document.body.appendChild(modal);
    activeActionPanel=modal.querySelector('#talentActionPanel');
    modal.querySelectorAll('.talent-modal-backdrop,.talent-modal-close').forEach(function(button){button.onclick=function(){if(activeActionPanel&&modal.contains(activeActionPanel))activeActionPanel=null;modal.remove()}});
    modal.querySelector('[data-talent-action="message"]').onclick=function(){showMessageForm(profile)};
    modal.querySelector('[data-talent-action="summary"]').onclick=function(){showDocumentSummary(profile)};
    modal.querySelector('[data-talent-action="cv"]').onclick=function(){openTalentCv(profile)};
    modal.querySelector('[data-talent-action="personnel"]').onclick=function(){if(linkedRecord(profile.user_id))removeFromPersonnel(profile.user_id,this);else addToPersonnel(profile,this)};
  }
  function actionPanel(){return activeActionPanel&&activeActionPanel.isConnected?activeActionPanel:byId('talentActionPanel')}
  function panelMessage(text,error){var panel=actionPanel();if(!panel)return;panel.classList.remove('hidden');panel.innerHTML='<p class="talent-action-message'+(error?' is-error':'')+'">'+safe(text)+'</p>'}
  function showMessageForm(profile){
    var panel=actionPanel();if(!panel)return;panel.classList.remove('hidden');
    panel.innerHTML='<form class="talent-message-form"><label>Company name<input name="company" maxlength="140" autocomplete="organization" placeholder="Your company"></label><label>Message<textarea name="message" maxlength="1200" rows="4" placeholder="Introduce the opportunity and how the candidate can contact you."></textarea></label><div class="talent-form-actions"><button type="submit" class="secondary">Send Message</button><span class="talent-message-status" role="status"></span></div></form>';
    panel.querySelector('form').onsubmit=async function(event){
      event.preventDefault();var form=event.currentTarget,button=event.submitter||form.querySelector('button'),status=form.querySelector('.talent-message-status');button.disabled=true;button.textContent='Sending...';if(status)status.textContent='';
      try{await actionCall({action:'send_message',target_user_id:profile.user_id,company:form.elements.company.value,message:form.elements.message.value});panelMessage('Message sent securely through ATSRS.',false)}
      catch(error){if(status)status.textContent=friendlyError(error,'Message could not be sent. Please try again.');button.disabled=false;button.textContent='Send Message'}
    };
  }
  async function showDocumentSummary(profile){
    panelMessage('Loading document summary...',false);
    try{
      var data=await actionCall({action:'summary',target_user_id:profile.user_id}),panel=actionPanel(),counts=data.counts||{},documents=Array.isArray(data.documents)?data.documents:[];
      if(!panel)return;
      function renderSummary(filter){
        var visible=documents.filter(function(document){
          if(filter==='recent')return recentUpload(document.uploaded_at);
          if(filter==='expired')return document.status==='Expired';
          if(filter==='expiry_risk')return document.status==='Expires today'||document.status.indexOf('remaining')>=0||document.status.indexOf('within')>=0;
          if(filter==='current')return document.status==='Valid'||document.status==='No expiry'||document.status==='Date not confirmed';
          return true;
        });
        panel.innerHTML='<div class="talent-summary-head"><b>Document Summary</b><span>'+safe(visible.length)+' of '+safe(counts.total||0)+' documents</span></div><div class="talent-summary-stats"><span><b>'+safe(counts.current||0)+'</b> current</span><span><b>'+safe(counts.expiryRisk||0)+'</b> expiry risk</span><span><b>'+safe(counts.expired||0)+'</b> expired</span></div><label class="talent-summary-filter"><span>Show</span><select><option value="all">All documents</option><option value="recent">New uploads (7 days)</option><option value="current">Current</option><option value="expiry_risk">Expiry risk</option><option value="expired">Expired</option></select></label>'+(visible.length?'<div class="talent-summary-list">'+visible.map(function(document){var recent=recentUpload(document.uploaded_at);return '<div><span><b>'+safe(document.title)+'</b><small>'+safe(document.provider)+'</small><small class="talent-upload-date'+(recent?' is-recent':'')+'">'+(recent?'<b>NEW UPDATE</b> ':'')+'Uploaded '+safe(uploadDateLabel(document.uploaded_at))+'</small></span><em>'+safe(document.status)+(document.expiry?' &middot; '+safe(document.expiry):'')+'</em></div>'}).join('')+'</div>':'<p class="talent-action-message">No documents match this filter.</p>');
        var select=panel.querySelector('.talent-summary-filter select');if(select){select.value=filter;select.onchange=function(){renderSummary(select.value)}}
      }
      renderSummary('all');
    }catch(error){panelMessage(friendlyError(error,'Document summary could not be loaded. Please try again.'),true)}
  }
  async function openTalentCv(profile){
    panelMessage('Preparing CV preview...',false);
    try{
      var data=await actionCall({action:'cv',target_user_id:profile.user_id});
      var panel=actionPanel();if(panel)panel.classList.add('hidden');
      if(typeof window.atsrsOpenFilePreview!=='function')throw new Error('CV preview is unavailable.');
      window.atsrsOpenFilePreview({url:data.url,title:data.file_name||'Curriculum Vitae',mimeType:data.mime_type||'application/pdf'});
    }catch(error){panelMessage(friendlyError(error,'CV could not be opened. Please try again.'),true)}
  }
  function ensureInbox(){
    var dashboard=byId('dashboardPage'),existing=byId('talentMessagesPanel');if(existing||!dashboard)return existing;
    var panel=document.createElement('div');panel.id='talentMessagesPanel';panel.className='panel talent-messages-panel personal-only';
    panel.innerHTML='<div class="talent-messages-head"><div><span class="pill">PROFILE MESSAGES</span><h3>Messages from companies <span id="talentUnreadCount" class="request-count">0 new</span></h3></div><div class="talent-mailbox-tools"><button type="button" class="secondary is-active" id="talentActiveMessages">Inbox</button><button type="button" class="secondary" id="talentArchivedMessages">Archived</button><button type="button" class="secondary" id="refreshTalentMessages">Refresh</button></div></div><p class="sub">Corporate accounts can contact you without seeing your private email address.</p><div id="talentMessagesList" class="talent-messages-list"><div class="access-empty">No messages yet.</div></div>';
    dashboard.appendChild(panel);
    byId('refreshTalentMessages').onclick=loadInbox;
    byId('talentActiveMessages').onclick=function(){talentMailbox='active';loadInbox()};
    byId('talentArchivedMessages').onclick=function(){talentMailbox='archived';loadInbox()};
    return panel;
  }
  async function loadInbox(){
    if(mode()!=='personal')return;ensureInbox();var list=byId('talentMessagesList'),count=byId('talentUnreadCount');if(!list)return;
    var activeButton=byId('talentActiveMessages'),archiveButton=byId('talentArchivedMessages');
    if(activeButton)activeButton.classList.toggle('is-active',talentMailbox==='active');
    if(archiveButton)archiveButton.classList.toggle('is-active',talentMailbox==='archived');
    try{
      var data=await actionCall({action:'inbox',mailbox:talentMailbox}),messages=Array.isArray(data.messages)?data.messages:[],unread=messages.filter(function(message){return !message.read_at}).length;
      if(count){count.textContent=talentMailbox==='active'?unread+' new':'Archived';count.classList.toggle('is-archived',talentMailbox==='archived')}
      list.innerHTML=messages.length?messages.map(function(message){
        var readButton=message.read_at?'':'<button type="button" class="secondary" data-message-action="mark_read" data-message-id="'+safe(message.id)+'">Mark as read</button>';
        var archiveControl=talentMailbox==='archived'
          ?'<button type="button" class="secondary" data-message-action="restore_message" data-message-id="'+safe(message.id)+'">Restore</button>'
          :'<button type="button" class="secondary" data-message-action="archive_message" data-message-id="'+safe(message.id)+'">Archive</button>';
        return '<article class="talent-message'+(message.read_at?'':' is-unread')+'"><div><b>'+safe(message.sender_company)+'</b><span>'+safe(message.sender_email)+' &middot; '+safe(new Date(message.created_at).toLocaleString())+'</span></div><p>'+safe(message.body)+'</p><div class="talent-message-actions">'+readButton+archiveControl+'<button type="button" class="talent-message-delete" data-message-action="delete_message" data-message-id="'+safe(message.id)+'">Delete</button></div></article>';
      }).join(''):'<div class="access-empty">'+(talentMailbox==='archived'?'No archived messages.':'No messages yet.')+'</div>';
      list.querySelectorAll('[data-message-action]').forEach(function(button){button.onclick=async function(){
        var action=button.dataset.messageAction;
        if(action==='delete_message'&&!window.confirm('Delete this message permanently?'))return;
        button.disabled=true;
        try{await actionCall({action:action,message_id:button.dataset.messageId});await loadInbox()}catch(error){button.disabled=false}
      }});
    }catch(error){list.innerHTML='<div class="access-empty">Messages could not be loaded.</div>'}
  }
  async function loadDirectory(){
    if(mode()!=='company')return;
    var grid=byId('talentDirectoryGrid'),status=byId('talentDirectoryStatus'),c=client();if(!grid||!c)return;
    loading=true;if(status){status.textContent='Loading profiles...';status.classList.remove('hidden')}
    try{
      var result=await actionCall({action:'directory'});
      profiles=Array.isArray(result.profiles)?result.profiles:[];
      directoryMeta=result.meta&&typeof result.meta==='object'?result.meta:{eligible_profiles:profiles.length,document_owners:profiles.length,returned_profiles:profiles.length};
    }catch(error){
      if(status){status.textContent=friendlyError(error,'Candidate profiles could not be loaded. Please refresh and try again.');status.classList.remove('hidden')}
      console.warn('ATSRS talent directory load failed',error);
      loading=false;
      return;
    }
    loading=false;
    try{await loadPersonnelLinks()}catch(error){console.warn('ATSRS linked personnel load failed',error);renderLinkedPersonnel()}
    fillSelect('talentPositionFilter',profiles.map(function(profile){return profile.position}),'All professions');
    fillSelect('talentCountryFilter',profiles.map(function(profile){return profile.country}),'All countries');
    render();
  }
  function bind(){
    document.querySelectorAll('[data-candidate-view]').forEach(function(button){
      button.addEventListener('click',function(){
        candidateView=button.dataset.candidateView||'cards';
        try{localStorage.setItem('atsrs_candidate_view',candidateView)}catch(ignore){}
        render();
      });
    });
    document.querySelectorAll('[data-personnel-view]').forEach(function(button){
      button.addEventListener('click',function(){
        personnelView=button.dataset.personnelView||'list';
        try{localStorage.setItem('atsrs_personnel_view',personnelView)}catch(ignore){}
        renderLinkedPersonnel();
      });
    });
    updateViewSwitches();
    ['personnelSearch','personnelWorkStatusFilter','personnelAccessFilter','personnelDocumentFilter'].forEach(function(id){
      var element=byId(id);if(!element)return;
      element.addEventListener(id==='personnelSearch'?'input':'change',renderLinkedPersonnel);
    });
    ['profession','project'].forEach(function(kind){
      var config=personnelComboboxConfig(kind),input=byId(config.input),options=byId(config.options);
      if(!input||!options)return;
      var root=input.closest('.personnel-combobox'),toggle=root&&root.querySelector('.personnel-combobox-toggle');
      input.addEventListener('focus',function(){renderPersonnelComboboxOptions(kind);setPersonnelComboboxOpen(kind,true)});
      input.addEventListener('input',function(){renderPersonnelComboboxOptions(kind);setPersonnelComboboxOpen(kind,true);renderLinkedPersonnel()});
      input.addEventListener('keydown',function(event){
        if(event.key==='Escape'){setPersonnelComboboxOpen(kind,false);input.blur();return}
        if(event.key==='ArrowDown'){
          event.preventDefault();setPersonnelComboboxOpen(kind,true);
          var first=options.querySelector('[data-personnel-filter-value]');if(first)first.focus();
        }
      });
      if(toggle)toggle.addEventListener('click',function(){
        var opening=options.classList.contains('hidden');renderPersonnelComboboxOptions(kind);
        if(opening){input.focus();setPersonnelComboboxOpen(kind,true)}
        else setPersonnelComboboxOpen(kind,false);
      });
      options.addEventListener('click',function(event){
        var option=event.target.closest('[data-personnel-filter-value]');if(!option)return;
        input.value=option.dataset.personnelFilterValue||'';renderLinkedPersonnel();input.focus();setPersonnelComboboxOpen(kind,false);
      });
      options.addEventListener('keydown',function(event){
        var option=event.target.closest('[data-personnel-filter-value]');if(!option)return;
        if(event.key==='Enter'||event.key===' '){event.preventDefault();option.click();return}
        if(event.key==='Escape'){setPersonnelComboboxOpen(kind,false);input.focus();return}
        if(event.key==='ArrowDown'||event.key==='ArrowUp'){
          event.preventDefault();
          var choices=Array.prototype.slice.call(options.querySelectorAll('[data-personnel-filter-value]')),index=choices.indexOf(option),step=event.key==='ArrowDown'?1:-1;
          if(choices.length)choices[(index+step+choices.length)%choices.length].focus();
        }
      });
    });
    document.addEventListener('click',function(event){
      document.querySelectorAll('.personnel-combobox').forEach(function(root){
        if(root.contains(event.target))return;
        var input=root.querySelector('[role="combobox"]'),kind=root.dataset.personnelCombobox;
        if(input&&kind)setPersonnelComboboxOpen(kind,false);
      });
    });
    var linkedList=byId('linkedPersonnelList');
    if(linkedList)linkedList.addEventListener('click',function(event){
      var button=event.target.closest('[data-personnel-sort]');if(!button)return;
      var nextSort=button.dataset.personnelSort;
      if(personnelSortBy===nextSort)personnelSortDirection=personnelSortDirection==='asc'?'desc':'asc';
      else{personnelSortBy=nextSort;personnelSortDirection='asc'}
      renderLinkedPersonnel();
    });
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
    if(typeof oldShow==='function')window.showPage=function(){
      var page=String(arguments[0]||''),result=oldShow.apply(this,arguments);
      if(page==='candidates')setTimeout(loadDirectory,30);
      if(page==='personnel'){
        renderLinkedPersonnel();
        setTimeout(function(){loadPersonnelLinks().catch(function(error){console.warn('ATSRS linked personnel load failed',error)})},30);
      }
      return result;
    };
    setTimeout(function(){
      if(mode()==='personal'){syncOwnProfile(true);loadInbox();return}
      if(byId('candidatesPage')&&!byId('candidatesPage').classList.contains('hidden'))loadDirectory();
      else if(byId('personnelPage')&&!byId('personnelPage').classList.contains('hidden'))loadPersonnelLinks().catch(function(error){console.warn('ATSRS linked personnel load failed',error)});
    },1200);
    window.addEventListener('atsrs:resume',function(){
      if(mode()==='personal'){syncOwnProfile(false);loadInbox();return}
      if(byId('candidatesPage')&&!byId('candidatesPage').classList.contains('hidden'))loadDirectory();
      if(byId('personnelPage')&&!byId('personnelPage').classList.contains('hidden'))loadPersonnelLinks().catch(function(error){console.warn('ATSRS linked personnel load failed',error)});
    });
    window.addEventListener('atsrs:profile-photo-changed',function(){if(mode()==='personal')syncOwnProfile(true);else if(byId('candidatesPage')&&!byId('candidatesPage').classList.contains('hidden'))loadDirectory()});
    setInterval(function(){if(mode()==='personal')syncOwnProfile(false)},300000);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind,{once:true});else bind();
  window.atsrsTalentAvailability=availability;
  window.atsrsTalentDirectory={load:loadDirectory,loadPersonnel:loadPersonnelLinks,sync:syncOwnProfile};
})();
