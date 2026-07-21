(function(){
  'use strict';

  var OWNER_TOKEN_KEY='atsrs_share_profile_token';
  var activeShare=null;
  var ownerFiles=[];
  var ownerRequests=[];
  var knownShareUrl='';
  var publicToken='';
  var publicDocuments=[];
  var viewerToken='';
  var viewerIdentity=null;
  var requestContext=null;
  var pendingVerificationId='';

  function byId(id){return document.getElementById(id);}
  function client(){return window.supabaseClient||null;}
  function endpoint(){var base=typeof SUPABASE_URL!=='undefined'?SUPABASE_URL:'';return base?base+'/functions/v1/share-profile':'';}
  function publishableKey(){return typeof SUPABASE_KEY!=='undefined'?SUPABASE_KEY:'';}
  function safeSessionGet(key){try{return sessionStorage.getItem(key)||'';}catch(error){return '';}}
  function safeSessionSet(key,value){try{if(value)sessionStorage.setItem(key,value);else sessionStorage.removeItem(key);}catch(error){}}
  function viewerKey(suffix){return 'atsrs_share_viewer_'+publicToken.slice(-12)+'_'+suffix;}
  function shareUrl(token){return token?'https://atsrs.com/?share='+encodeURIComponent(token):'';}
  function formatDate(value){
    if(!value)return 'Not provided';
    var date=new Date(String(value).length===10?String(value)+'T00:00:00':value);
    if(Number.isNaN(date.getTime()))return String(value);
    return new Intl.DateTimeFormat('en',{day:'2-digit',month:'short',year:'numeric'}).format(date);
  }
  function formatDateTime(value){
    if(!value)return 'Not available';
    var date=new Date(value);if(Number.isNaN(date.getTime()))return String(value);
    return new Intl.DateTimeFormat('en',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}).format(date);
  }
  function relativeTime(value){
    var time=new Date(value).getTime();if(!time)return '';
    var minutes=Math.max(0,Math.round((Date.now()-time)/60000));
    if(minutes<1)return 'Just now';if(minutes<60)return minutes+' min ago';
    var hours=Math.round(minutes/60);if(hours<24)return hours+' hr ago';
    var days=Math.round(hours/24);return days+' day'+(days===1?'':'s')+' ago';
  }
  function formatSize(value){var bytes=Number(value||0);if(!bytes)return '—';if(bytes<1048576)return Math.max(1,Math.round(bytes/1024))+' KB';return(bytes/1048576).toFixed(1)+' MB';}
  function documentMeta(file){
    var metadata=file&&file.metadata&&typeof file.metadata==='object'?file.metadata:{};
    var document=metadata.document&&typeof metadata.document==='object'?metadata.document:{};
    return{type:document.type||(file.category==='cv'?'Curriculum Vitae':file.file_name||'Document'),issue:document.issue||'',expiry:document.expiry||''};
  }
  function ownerMessage(text,isError){var element=byId('shareManageMsg');if(!element)return;element.textContent=text||'';element.classList.toggle('error',Boolean(isError));}
  function requestMessage(text,isError){var element=byId('shareRequestMessage');if(!element)return;element.textContent=text||'';element.classList.toggle('error',Boolean(isError));}
  function setStatus(text,state){var element=byId('shareProfileStatus');if(!element)return;element.textContent=text;element.className='share-live-status'+(state?' '+state:'');}
  function setKnownLink(url){
    knownShareUrl=url||'';
    var input=byId('shareProfileLink'),copy=byId('copyShareBtn'),preview=byId('previewShareBtn');
    if(input){input.value=knownShareUrl;input.placeholder=activeShare&&activeShare.active?'Active link. Refresh it below to copy a new link.':'Create a secure link after choosing documents.';}
    if(copy)copy.disabled=!knownShareUrl;if(preview)preview.disabled=!knownShareUrl;
  }
  async function authToken(){var supabase=client();if(!supabase)return '';var result=await supabase.auth.getSession();return result&&result.data&&result.data.session?result.data.session.access_token||'':'';}
  async function ownerCall(body){
    var accessToken=await authToken();if(!accessToken)throw new Error('Please sign in again.');
    var response=await fetch(endpoint(),{method:'POST',headers:{apikey:publishableKey(),Authorization:'Bearer '+accessToken,'Content-Type':'application/json'},body:JSON.stringify(body)});
    var data=await response.json().catch(function(){return{};});if(!response.ok)throw new Error(data.error||'Share request failed.');return data;
  }
  async function publicCall(body){
    body=Object.assign({token:publicToken},body||{});
    var headers={apikey:publishableKey(),'Content-Type':'application/json'};if(viewerToken)headers['x-atsrs-viewer-token']=viewerToken;
    var response=await fetch(endpoint(),{method:'POST',headers:headers,body:JSON.stringify(body)});
    var data=await response.json().catch(function(){return{};});if(!response.ok)throw new Error(data.error||'Request failed.');return data;
  }
  async function listOwnerFiles(){
    var supabase=client();if(!supabase)return[];
    var result=await supabase.from('atsrs_files').select('id,category,file_name,mime_type,size_bytes,metadata,created_at').eq('account_type','personal').order('created_at',{ascending:false});
    if(result.error)throw result.error;return result.data||[];
  }
  function ownerFileName(id){var file=ownerFiles.find(function(item){return item.id===id;});return file?documentMeta(file).type:'Document';}
  function renderOwnerFiles(){
    var list=byId('shareDocumentChoices');if(!list)return;
    var selected=new Set(activeShare&&Array.isArray(activeShare.selected_file_ids)?activeShare.selected_file_ids:[]);
    if(!ownerFiles.length){list.innerHTML='<div class="preview-box">Upload documents or a CV first, then return here to create your recruiter link.</div>';return;}
    list.innerHTML='';ownerFiles.forEach(function(file){
      var meta=documentMeta(file),label=document.createElement('label');label.className='share-document-choice';
      var checkbox=document.createElement('input');checkbox.type='checkbox';checkbox.value=file.id;checkbox.checked=selected.has(file.id);
      var name=document.createElement('b');name.textContent=meta.type;name.title=file.file_name||meta.type;
      var category=document.createElement('span');category.textContent=file.category==='cv'?'CV':'Document';
      label.appendChild(checkbox);label.appendChild(name);label.appendChild(category);list.appendChild(label);
    });
  }
  function selectedOwnerFiles(){return Array.prototype.map.call(document.querySelectorAll('#shareDocumentChoices input[type="checkbox"]:checked'),function(input){return input.value;});}
  function renderOwnerStatus(){
    var revoke=byId('revokeShareBtn'),create=byId('saveShareBtn');
    if(activeShare&&activeShare.active){
      setStatus('Link active until '+formatDateTime(activeShare.expires_at)+' · '+activeShare.selected_file_ids.length+' document(s) · '+activeShare.view_count+' opening(s)','active');
      if(revoke)revoke.classList.remove('hidden');if(create)create.textContent='Refresh Secure Link';
    }else if(activeShare){setStatus('Sharing is disabled or expired. Existing download permissions are closed.','revoked');if(revoke)revoke.classList.add('hidden');if(create)create.textContent='Create Secure Link';}
    else{setStatus('Private. No recruiter link has been created yet.','');if(revoke)revoke.classList.add('hidden');if(create)create.textContent='Create Secure Link';}
    var token=safeSessionGet(OWNER_TOKEN_KEY);setKnownLink(activeShare&&activeShare.active&&token?shareUrl(token):'');
  }
  function requestNames(request){var names=(request.requested_file_ids||[]).map(ownerFileName);return request.request_all?'All shared documents':names.join(', ');}
  function makeButton(text,className,onClick){var button=document.createElement('button');button.type='button';button.textContent=text;if(className)button.className=className;button.addEventListener('click',onClick);return button;}
  function renderRequestCard(request,history){
    var card=document.createElement('article');card.className='access-request-card status-'+request.status;
    var top=document.createElement('div');top.className='access-request-top';
    var identity=document.createElement('div'),name=document.createElement('b'),company=document.createElement('span');
    name.textContent=request.requester_name+' · '+request.requester_company;company.textContent=request.requester_email;
    identity.appendChild(name);identity.appendChild(company);
    var status=document.createElement('span');status.className='access-status';status.textContent=request.status;
    top.appendChild(identity);top.appendChild(status);
    var requested=document.createElement('p');requested.innerHTML='<span>Requested</span> ';requested.appendChild(document.createTextNode(requestNames(request)));
    var time=document.createElement('small');time.textContent=(history?formatDateTime(request.created_at):relativeTime(request.created_at));
    var details=document.createElement('div');details.className='access-request-details hidden';details.textContent='Verified work email · '+request.requester_email+(request.access_expires_at?' · Access until '+formatDateTime(request.access_expires_at):'')+(request.download_count?' · '+request.download_count+' document download(s) completed':'');
    var actions=document.createElement('div');actions.className='access-request-actions';
    if(request.status==='pending'){
      actions.appendChild(makeButton('Approve','',function(){window.decideShareRequest(request.id,'approve');}));
      actions.appendChild(makeButton('Decline','action',function(){window.decideShareRequest(request.id,'decline');}));
    }
    actions.appendChild(makeButton('View details','secondary',function(){details.classList.toggle('hidden');}));
    card.appendChild(top);card.appendChild(requested);card.appendChild(time);card.appendChild(details);card.appendChild(actions);return card;
  }
  function renderOwnerRequests(analytics){
    var pending=ownerRequests.filter(function(item){return item.status==='pending';});
    var count=byId('pendingRequestCount');if(count)count.textContent=pending.length+' pending';
    var approveAll=byId('approveAllRequestsBtn');if(approveAll)approveAll.classList.toggle('hidden',pending.length<2);
    var dashboard=byId('dashboardAccessRequests');if(dashboard){dashboard.innerHTML='';if(!pending.length)dashboard.innerHTML='<div class="access-empty">No pending requests.</div>';else pending.forEach(function(item){dashboard.appendChild(renderRequestCard(item,false));});}
    var history=byId('shareRequestHistory');if(history){history.innerHTML='';if(!ownerRequests.length)history.innerHTML='<div class="access-empty">No access history yet.</div>';else ownerRequests.forEach(function(item){history.appendChild(renderRequestCard(item,true));});}
    var metrics=byId('shareAnalytics');if(metrics){metrics.innerHTML='';[
      ['Link opened',analytics.link_opened||0],['Documents previewed',analytics.document_previewed||0],['Download requests',analytics.download_requested||0],['Documents downloaded',analytics.document_downloaded||0]
    ].forEach(function(item){var box=document.createElement('div');var value=document.createElement('b'),label=document.createElement('span');value.textContent=String(item[1]);label.textContent=item[0];box.appendChild(value);box.appendChild(label);metrics.appendChild(box);});
      var previews=Array.isArray(analytics.previewed_files)?analytics.previewed_files.slice().sort(function(a,b){return b.count-a.count;}):[];
      if(previews.length){var detailBox=document.createElement('p');detailBox.className='share-analytics-detail';detailBox.textContent='Most previewed: '+previews.slice(0,3).map(function(item){return ownerFileName(item.file_id)+' ('+item.count+')';}).join(' · ');metrics.appendChild(detailBox);}
    }
  }
  async function refreshShareRequests(){
    if(new URLSearchParams(location.search).get('share')||!client())return;
    try{var result=await ownerCall({action:'list_requests'});ownerRequests=result.requests||[];renderOwnerRequests(result.analytics||{});}catch(error){console.error('ATSRS access requests failed',error);}
  }
  window.refreshShareRequests=refreshShareRequests;
  async function refreshOwnerPanel(){
    if(new URLSearchParams(location.search).get('share')||!byId('shareProfilePanel')||!client())return;
    try{
      var token=await authToken();if(!token)return;
      var results=await Promise.all([ownerCall({action:'status'}),listOwnerFiles(),ownerCall({action:'list_requests'})]);
      activeShare=results[0].share||null;ownerFiles=results[1]||[];ownerRequests=results[2].requests||[];
      renderOwnerFiles();renderOwnerStatus();renderOwnerRequests(results[2].analytics||{});
    }catch(error){console.error('ATSRS share profile status failed',error);setStatus('Share status could not be loaded. Check the connection.','revoked');}
  }
  window.toggleShareAccess=async function(){var box=byId('shareAccessBox');if(!box)return;box.classList.toggle('hidden');if(!box.classList.contains('hidden')){ownerMessage('Loading your server documents...');await refreshOwnerPanel();ownerMessage(ownerFiles.length?'Choose visible documents and the link expiry.':'');}};
  window.updateShareExpiryChoice=function(){var custom=byId('shareExpiryCustom'),preset=byId('shareExpiryPreset');if(custom&&preset)custom.classList.toggle('hidden',preset.value!=='custom');};
  function selectedExpiry(){
    var preset=byId('shareExpiryPreset'),value=preset?preset.value:'7d',date=new Date();
    if(value==='24h')date=new Date(Date.now()+86400000);else if(value==='3d')date=new Date(Date.now()+3*86400000);else if(value==='7d')date=new Date(Date.now()+7*86400000);else{
      var custom=byId('shareExpiryCustom'),raw=custom?custom.value:'';if(!raw)return'';date=new Date(raw+'T23:59:59');
    }
    return Number.isNaN(date.getTime())?'':date.toISOString();
  }
  window.createShareProfileLink=async function(){
    var button=byId('saveShareBtn'),fileIds=selectedOwnerFiles(),expiresAt=selectedExpiry();
    if(!fileIds.length){ownerMessage('Select at least one server document.',true);return;}if(!expiresAt){ownerMessage('Choose a valid link expiry date.',true);return;}
    if(button)button.disabled=true;ownerMessage('Creating a preview-only secure link...');
    try{var result=await ownerCall({action:'create',file_ids:fileIds,expires_at:expiresAt});activeShare=result.share||null;if(result.token)safeSessionSet(OWNER_TOKEN_KEY,result.token);setKnownLink(result.share_url||shareUrl(result.token||''));renderOwnerStatus();setKnownLink(result.share_url||shareUrl(result.token||''));ownerMessage('Secure preview link is ready. Downloads require your approval.');await refreshShareRequests();}
    catch(error){console.error(error);ownerMessage(error.message||'Secure link could not be created.',true);}finally{if(button)button.disabled=false;}
  };
  window.revokeShareProfileLink=async function(){
    if(!window.confirm('Disable this recruiter link? Preview and every approved download will stop immediately.'))return;
    var button=byId('revokeShareBtn');if(button)button.disabled=true;ownerMessage('Disabling all recruiter access...');
    try{var result=await ownerCall({action:'revoke'});activeShare=result.share||activeShare;safeSessionSet(OWNER_TOKEN_KEY,'');setKnownLink('');renderOwnerStatus();ownerMessage('The old link and all download permissions are disabled.');await refreshShareRequests();}
    catch(error){ownerMessage(error.message||'The link could not be disabled.',true);}finally{if(button)button.disabled=false;}
  };
  window.copyShareLink=async function(){if(!knownShareUrl)return;try{await navigator.clipboard.writeText(knownShareUrl);}catch(error){var input=byId('shareProfileLink');if(input){input.focus();input.select();document.execCommand('copy');}}var message=byId('shareCopyMsg');if(message){message.textContent='Secure link copied.';message.classList.remove('hidden');setTimeout(function(){message.classList.add('hidden');},1800);}};
  window.previewShareProfile=function(){if(knownShareUrl)window.location.assign(knownShareUrl);};
  window.toggleSharePreview=window.previewShareProfile;
  window.decideShareRequest=async function(id,decision){
    if(!window.confirm((decision==='approve'?'Approve':'Decline')+' this verified recruiter request?'))return;
    try{await ownerCall({action:'decide_request',request_id:id,decision:decision});await refreshShareRequests();}catch(error){window.alert(error.message||'The request could not be updated.');}
  };
  window.approveAllShareRequests=async function(){
    if(!window.confirm('Approve every pending recruiter request for 30 minutes?'))return;
    var button=byId('approveAllRequestsBtn');if(button)button.disabled=true;
    try{var result=await ownerCall({action:'approve_all_pending'});window.alert(result.approved+' request(s) approved.');await refreshShareRequests();}catch(error){window.alert(error.message||'Requests could not be approved.');}finally{if(button)button.disabled=false;}
  };

  function publicStatus(expiry){if(!expiry||String(expiry).toUpperCase()==='N/A')return{label:'No expiry date',className:''};var today=new Date();today.setHours(0,0,0,0);var date=new Date(String(expiry).slice(0,10)+'T00:00:00'),days=Math.round((date-today)/86400000);if(days<0)return{label:'Expired',className:'expired'};if(days===0)return{label:'Expires today',className:'warning'};if(days<=30)return{label:days+' days left',className:'warning'};return{label:'Valid',className:''};}
  function detail(label,value){var wrap=document.createElement('div');wrap.className='shared-document-detail';var key=document.createElement('span'),text=document.createElement('b');key.textContent=label;text.textContent=value||'Not provided';wrap.appendChild(key);wrap.appendChild(text);return wrap;}
  function publicDocumentName(id){var file=publicDocuments.find(function(item){return item.id===id;});return file?(file.document_type||file.file_name):'Document';}
  async function downloadPublicDocument(documentData,button){
    if(button)button.disabled=true;
    try{var result=await publicCall({action:'download',file_id:documentData.id,viewer_token:viewerToken});window.location.assign(result.download_url);}catch(error){window.alert(error.message||'Download access is unavailable.');await loadPublicProfile(publicToken);}finally{if(button)button.disabled=false;}
  }
  function renderPublicDocument(documentData){
    var card=document.createElement('article');card.className='shared-document-card';
    var top=document.createElement('div');top.className='shared-document-top';var nameWrap=document.createElement('div');
    var category=document.createElement('span');category.className='shared-document-category';category.textContent=documentData.category==='cv'?'Professional profile':'Owner-provided document';
    var title=document.createElement('h3');title.textContent=documentData.document_type||documentData.file_name||'ATSRS document';
    var file=document.createElement('p');file.className='shared-document-file';file.textContent=documentData.file_name||'';nameWrap.appendChild(category);nameWrap.appendChild(title);nameWrap.appendChild(file);
    var statusData=publicStatus(documentData.expiry_date),status=document.createElement('span');status.className='shared-document-status'+(statusData.className?' '+statusData.className:'');status.textContent=statusData.label;top.appendChild(nameWrap);top.appendChild(status);
    var details=document.createElement('div');details.className='shared-document-details';details.appendChild(detail('Issue date',formatDate(documentData.issue_date)));details.appendChild(detail('Expiry date',formatDate(documentData.expiry_date)));details.appendChild(detail('Provider',documentData.provider||'Not provided'));details.appendChild(detail('File size',formatSize(documentData.size_bytes)));
    var actions=document.createElement('div');actions.className='shared-document-actions';var preview=document.createElement('button');preview.type='button';preview.textContent='Preview';
    preview.addEventListener('click',function(){publicCall({action:'track_preview',file_id:documentData.id}).catch(function(){});if(typeof window.atsrsOpenFilePreview==='function')window.atsrsOpenFilePreview({url:documentData.preview_url,title:documentData.document_type||documentData.file_name||'ATSRS document',mimeType:documentData.mime_type||''});else window.location.assign(documentData.preview_url);});
    var access=document.createElement('button');access.type='button';access.className='secondary';
    if(documentData.download_status==='approved'){access.textContent='Download · 30 min';access.addEventListener('click',function(){downloadPublicDocument(documentData,access);});}
    else if(documentData.download_status==='pending'){access.textContent='Request pending';access.disabled=true;}
    else{access.textContent='Request Download';access.addEventListener('click',function(){window.openDownloadRequest(documentData.id);});}
    actions.appendChild(preview);actions.appendChild(access);card.appendChild(top);card.appendChild(details);card.appendChild(actions);return card;
  }
  function showPublicError(message){var loading=byId('sharedProfileLoading'),content=byId('sharedProfileContent'),error=byId('sharedProfileError');if(loading)loading.classList.add('hidden');if(content)content.classList.add('hidden');if(error){error.classList.remove('hidden');var text=error.querySelector('p');if(text)text.textContent=message||'This shared profile is unavailable.';}}
  function renderPublicProfile(data){
    var profile=data.profile||{},fullName=((profile.name||'')+' '+(profile.surname||'')).trim()||'ATSRS Professional';document.title=fullName+' · ATSRS Shared Profile';
    byId('sharedProfileName').textContent=fullName;byId('sharedProfileRole').textContent=profile.position||'Professional Document Holder';var meta=byId('sharedProfileMeta');meta.innerHTML='';[profile.company,profile.country].filter(Boolean).forEach(function(value){var tag=document.createElement('span');tag.textContent=value;meta.appendChild(tag);});
    publicDocuments=Array.isArray(data.documents)?data.documents:[];byId('sharedProfileDocumentCount').textContent=publicDocuments.length+' shared file'+(publicDocuments.length===1?'':'s');
    var expiry=byId('sharedProfileExpiry');if(expiry)expiry.textContent='Link expires '+formatDateTime(data.access&&data.access.share_expires_at);
    var grid=byId('sharedProfileDocuments');grid.innerHTML='';if(!publicDocuments.length){var empty=document.createElement('div');empty.className='shared-profile-empty';empty.textContent='No documents are currently shared through this link.';grid.appendChild(empty);}else publicDocuments.forEach(function(item){grid.appendChild(renderPublicDocument(item));});
    var all=byId('requestAllDocumentsBtn');if(all){var approved=publicDocuments.length&&publicDocuments.every(function(item){return item.download_status==='approved';}),pending=publicDocuments.length&&publicDocuments.every(function(item){return item.download_status==='pending'||item.download_status==='approved';});all.disabled=approved||pending;all.textContent=approved?'All Downloads Approved':pending?'Request Pending':'Request All Documents';}
    byId('sharedProfileLoading').classList.add('hidden');byId('sharedProfileError').classList.add('hidden');byId('sharedProfileContent').classList.remove('hidden');
  }
  async function loadPublicProfile(token){
    document.body.classList.add('atsrs-public-share-view');document.body.classList.remove('atsrs-session-pending','atsrs-booting');var page=byId('sharedProfilePage');if(page)page.classList.remove('hidden');
    try{var headers={apikey:publishableKey()};if(viewerToken)headers['x-atsrs-viewer-token']=viewerToken;var response=await fetch(endpoint()+'?token='+encodeURIComponent(token),{headers:headers}),data=await response.json().catch(function(){return{};});if(!response.ok)throw new Error(data.error||'This shared profile is unavailable.');renderPublicProfile(data);}
    catch(error){console.error('ATSRS public profile failed',error);showPublicError(error.message||'This shared profile is unavailable.');}
  }
  function setRequestStep(step){['shareIdentityStep','shareOtpStep','shareVerifiedStep'].forEach(function(id){var element=byId(id);if(element)element.classList.toggle('hidden',id!==step);});}
  window.openDownloadRequest=function(target){
    var ids=target==='all'?publicDocuments.map(function(item){return item.id;}):[target],label=target==='all'?'all shared documents':publicDocumentName(target);
    requestContext={request_all:target==='all',file_ids:ids,label:label};pendingVerificationId='';requestMessage('');
    var summary=byId('shareRequestSummary');if(summary)summary.textContent='Requesting '+label+'. The owner will review your verified request. Approval lasts for 30 minutes and never beyond the link expiry.';
    var modal=byId('shareRequestModal');if(modal)modal.classList.remove('hidden');
    if(viewerToken&&viewerIdentity){var identity=byId('shareVerifiedIdentity');if(identity)identity.textContent=viewerIdentity.name+' · '+viewerIdentity.company+' · '+viewerIdentity.email;setRequestStep('shareVerifiedStep');}
    else setRequestStep('shareIdentityStep');
  };
  window.closeDownloadRequest=function(){var modal=byId('shareRequestModal');if(modal)modal.classList.add('hidden');requestMessage('');};
  window.resetShareVerification=function(){viewerToken='';viewerIdentity=null;safeSessionSet(viewerKey('token'),'');safeSessionSet(viewerKey('identity'),'');pendingVerificationId='';setRequestStep('shareIdentityStep');requestMessage('Enter your work details to receive a new verification code.');};
  window.sendShareRequestOtp=async function(){
    if(!requestContext)return;var button=byId('sendShareOtpBtn'),name=(byId('shareRequesterName').value||'').trim(),company=(byId('shareRequesterCompany').value||'').trim(),email=(byId('shareRequesterEmail').value||'').trim();
    if(button)button.disabled=true;requestMessage('Sending a verification code to your work email...');
    try{var result=await publicCall({action:'start_verification',requester_name:name,requester_company:company,requester_email:email,file_ids:requestContext.file_ids,request_all:requestContext.request_all});pendingVerificationId=result.request_id;viewerIdentity={name:name,company:company,email:email.toLowerCase()};setRequestStep('shareOtpStep');requestMessage('Enter the 6-digit code sent to '+viewerIdentity.email+'.');var otp=byId('shareRequesterOtp');if(otp)otp.focus();}
    catch(error){requestMessage(error.message||'Verification code could not be sent.',true);}finally{if(button)button.disabled=false;}
  };
  window.verifyShareRequestOtp=async function(){
    var button=byId('verifyShareOtpBtn'),otp=(byId('shareRequesterOtp').value||'').trim();if(button)button.disabled=true;requestMessage('Verifying your email...');
    try{var result=await publicCall({action:'verify_otp',request_id:pendingVerificationId,otp:otp});viewerToken=result.viewer_token||'';safeSessionSet(viewerKey('token'),viewerToken);safeSessionSet(viewerKey('identity'),JSON.stringify(viewerIdentity||{}));requestMessage('Verified. Your request is waiting for the profile owner.');setTimeout(function(){window.closeDownloadRequest();loadPublicProfile(publicToken);},900);}
    catch(error){requestMessage(error.message||'The code could not be verified.',true);}finally{if(button)button.disabled=false;}
  };
  window.sendVerifiedShareRequest=async function(){
    if(!requestContext)return;var button=byId('sendVerifiedShareRequestBtn');if(button)button.disabled=true;requestMessage('Sending your verified request...');
    try{await publicCall({action:'create_request',viewer_token:viewerToken,file_ids:requestContext.file_ids,request_all:requestContext.request_all});requestMessage('Request sent. The profile owner has been notified.');setTimeout(function(){window.closeDownloadRequest();loadPublicProfile(publicToken);},800);}
    catch(error){requestMessage(error.message||'The request could not be sent.',true);}finally{if(button)button.disabled=false;}
  };
  function install(){
    publicToken=new URLSearchParams(location.search).get('share')||'';
    if(publicToken){viewerToken=safeSessionGet(viewerKey('token'));try{viewerIdentity=JSON.parse(safeSessionGet(viewerKey('identity'))||'null');}catch(error){viewerIdentity=null;}loadPublicProfile(publicToken);return;}
    var input=byId('shareProfileLink');if(input){input.value='';input.placeholder='Create a secure link after choosing documents.';}var copy=byId('copyShareBtn');if(copy)copy.disabled=true;var preview=byId('previewShareBtn');if(preview)preview.disabled=true;
    refreshOwnerPanel();setTimeout(refreshOwnerPanel,1200);atsrsStableInterval(refreshShareRequests,30000);
    var oldShow=window.showAccountTab;if(typeof oldShow==='function'&&!oldShow.__atsrsSharing){window.showAccountTab=function(tab){var result=oldShow.apply(this,arguments);if(tab==='sharing')setTimeout(refreshOwnerPanel,0);return result;};window.showAccountTab.__atsrsSharing=true;}
    if(client()&&client().auth&&typeof client().auth.onAuthStateChange==='function')client().auth.onAuthStateChange(function(event,session){if(session&&session.user)refreshOwnerPanel();});
    window.addEventListener('atsrs:resume',refreshShareRequests);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);else install();
})();
