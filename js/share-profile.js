(function(){
  'use strict';

  var OWNER_TOKEN_KEY='atsrs_share_profile_token';
  var activeShare=null;
  var activeShares=[];
  var ownerFiles=[];
  var ownerRequests=[];
  var knownShareUrl='';
  var publicToken='';
  var publicResumeRequest='';
  var publicResumeToken='';
  var publicDocuments=[];
  var lastPublicProfileData=null;
  var viewerToken='';
  var viewerIdentity=null;
  var requestContext=null;
  var pendingVerificationId='';
  var shareRequestsPromise=null;
  var ownerPanelPromise=null;
  var publicProfilePromise=null;

  function byId(id){return document.getElementById(id);}
  function client(){return window.supabaseClient||null;}
  function accountMode(){try{return localStorage.getItem('atsrs_use_mode')||window.useMode||'personal';}catch(error){return window.useMode||'personal';}}
  function friendlyError(error,fallback){
    var text=String(error&&error.message||'').toLowerCase();
    if(/not authenticated|unauthorized|jwt|session|sign in/.test(text))return 'Your session has expired. Please sign in again.';
    if(/network|fetch|connection|timeout|offline/.test(text))return 'Connection problem. Check your internet and try again.';
    if(/expired/.test(text))return 'This secure link has expired.';
    return fallback;
  }
  function endpoint(){var base=typeof SUPABASE_URL!=='undefined'?SUPABASE_URL:'';return base?base+'/functions/v1/share-profile':'';}
  function publishableKey(){return typeof SUPABASE_KEY!=='undefined'?SUPABASE_KEY:'';}
  function safeSessionGet(key){try{return sessionStorage.getItem(key)||'';}catch(error){return '';}}
  function safeSessionSet(key,value){try{if(value)sessionStorage.setItem(key,value);else sessionStorage.removeItem(key);}catch(error){}}
  function safeOwnerGet(key){try{return localStorage.getItem(key)||safeSessionGet(key);}catch(error){return safeSessionGet(key);}}
  function safeOwnerSet(key,value){try{if(value)localStorage.setItem(key,value);else localStorage.removeItem(key);}catch(error){}safeSessionSet(key,value);}
  function ownerTokens(){try{return JSON.parse(safeOwnerGet(OWNER_TOKEN_KEY+'_map')||'{}')||{};}catch(error){return{};}}
  function setOwnerToken(id,token){var tokens=ownerTokens();if(token)tokens[id]=token;else delete tokens[id];safeOwnerSet(OWNER_TOKEN_KEY+'_map',JSON.stringify(tokens));}
  function shareById(id){return activeShares.find(function(share){return share.id===id;})||null;}
  function shareLinkById(id){var share=shareById(id),token=ownerTokens()[id]||'';return share&&share.active&&token&&(!share.token_hint||token.slice(-8)===share.token_hint)?shareUrl(token):'';}
  function safeViewerGet(key){try{return localStorage.getItem(key)||safeSessionGet(key);}catch(error){return safeSessionGet(key);}}
  function safeViewerSet(key,value){try{if(value)localStorage.setItem(key,value);else localStorage.removeItem(key);}catch(error){}safeSessionSet(key,value);}
  function viewerKey(suffix){return 'atsrs_share_viewer_'+(publicToken||publicResumeRequest).slice(-12)+'_'+suffix;}
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
  function isReferenceFile(file){
    return ['reference','appraisal','recommendation','coverLetter'].indexOf(String(file&&file.category||''))>=0;
  }
  function fileCategoryLabel(file){
    var labels={cv:'CV',reference:'Reference',appraisal:'Appraisal',recommendation:'Recommendation',coverLetter:'Cover letter'};
    return labels[String(file&&file.category||'')]||(isReferenceFile(file)?'Reference':'Document');
  }
  function fileGroup(file){return isReferenceFile(file)?'references':'documents';}
  function ownerMessage(text,isError){var element=byId('shareManageMsg');if(!element)return;element.textContent=text||'';element.classList.toggle('error',Boolean(isError));}
  function requestMessage(text,isError){var element=byId('shareRequestMessage');if(!element)return;element.textContent=text||'';element.classList.toggle('error',Boolean(isError));}
  function showRequestSentToast(){var toast=byId('shareRequestSentToast');if(!toast){toast=document.createElement('div');toast.id='shareRequestSentToast';toast.className='share-request-sent-toast';toast.setAttribute('role','status');toast.setAttribute('aria-live','polite');document.body.appendChild(toast);}toast.innerHTML='<i class="ph ph-check-circle" aria-hidden="true"></i><span>Request sent</span>';toast.classList.add('is-visible');clearTimeout(showRequestSentToast.timer);showRequestSentToast.timer=setTimeout(function(){toast.classList.remove('is-visible')},2800);}
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
    body=Object.assign({token:publicToken,request_id:publicResumeRequest,resume:publicResumeToken},body||{});
    var headers={apikey:publishableKey(),'Content-Type':'application/json'};if(viewerToken)headers['x-atsrs-viewer-token']=viewerToken;
    if(accountMode()==='company'){
      var accessToken=await authToken();
      if(accessToken)headers.Authorization='Bearer '+accessToken;
      headers['x-atsrs-requester-account']='company';
    }
    var response=await fetch(endpoint(),{method:'POST',headers:headers,body:JSON.stringify(body)});
    var data=await response.json().catch(function(){return{};});if(!response.ok)throw new Error(data.error||'Request failed.');return data;
  }
  async function listOwnerFiles(){
    var supabase=client();if(!supabase)return[];
    var userResult=await supabase.auth.getUser(),owner=userResult&&userResult.data&&userResult.data.user;
    if(userResult&&userResult.error)throw userResult.error;if(!owner)return[];
    var result=await supabase.from('atsrs_files').select('id,category,file_name,mime_type,size_bytes,metadata,created_at').eq('user_id',owner.id).eq('account_type','personal').order('created_at',{ascending:false});
    if(result.error)throw result.error;return(result.data||[]).filter(isOwnerShareEligibleFile);
  }
  async function validateShareToken(token){
    if(!token)return false;
    try{var response=await fetch(endpoint()+'?token='+encodeURIComponent(token),{headers:{apikey:publishableKey()},cache:'no-store'});return response.ok;}catch(error){return false;}
  }
  function verifiedEmail(value){var email=String(value||'').trim().toLowerCase();return/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)?email:'';}
  async function copyText(value){
    try{await navigator.clipboard.writeText(value);return true;}catch(error){}
    var area=document.createElement('textarea');area.value=value;area.setAttribute('readonly','');area.style.position='fixed';area.style.opacity='0';document.body.appendChild(area);area.select();var copied=false;try{copied=document.execCommand('copy');}catch(error){}area.remove();return copied;
  }
  function recruiterGmailComposeUrl(recipient,shareUrl){
    var email=verifiedEmail(recipient&&recipient.email);if(!email||!shareUrl)return'';
    var name=String(recipient&&recipient.name||'Recruiter').trim()||'Recruiter';
    var subject='ATSRS profile shared with '+name;
    var body='Hello '+name+',\n\nI am sharing my ATSRS profile through this secure link. The link expires in 24 hours:\n\n'+shareUrl+'\n\nKind regards,';
    var params=new URLSearchParams({view:'cm',fs:'1',to:email,su:subject,body:body});
    return'https://mail.google.com/mail/?'+params.toString();
  }
  async function createValidatedShare(fileIds,expiresAt,audience){
    var request={action:'create',file_ids:fileIds,expires_at:expiresAt,audience:audience};
    var result=await ownerCall(request);
    if(result.token&&await validateShareToken(result.token))return result;
    if(!result.token||!await validateShareToken(result.token))throw new Error('The secure link could not be verified.');
    return result;
  }
  function isOwnerShareEligibleFile(file){var metadata=file&&file.metadata&&typeof file.metadata==='object'?file.metadata:{};return metadata.document_registered!==false;}
  function ownerFileName(id){var file=ownerFiles.find(function(item){return item.id===id;});return file?documentMeta(file).type:'Document';}
  function syncShareSelectAll(){
    var control=byId('shareSelectAll'),boxes=Array.prototype.slice.call(document.querySelectorAll('#shareDocumentChoices input[type="checkbox"]'));
    var selected=boxes.filter(function(box){return box.checked;}).length;
    if(control){
      control.disabled=!boxes.length;
      control.checked=Boolean(boxes.length)&&selected===boxes.length;
      control.indeterminate=selected>0&&selected<boxes.length;
    }
    var create=byId('saveShareBtn');if(create)create.disabled=selected===0;
  }
  window.toggleShareSelectAll=function(checked){
    Array.prototype.forEach.call(document.querySelectorAll('#shareDocumentChoices input[type="checkbox"]'),function(box){box.checked=checked;});
    syncShareSelectAll();
  };
  function renderOwnerFiles(){
    var list=byId('shareDocumentChoices');if(!list)return;
    var selected=new Set(activeShare&&Array.isArray(activeShare.selected_file_ids)?activeShare.selected_file_ids:[]);
    if(!ownerFiles.length){list.innerHTML='<div class="preview-box">Upload documents, references or a CV first, then return here to create your recruiter link.</div>';syncShareSelectAll();return;}
    list.innerHTML='';[
      {key:'documents',title:'Documents & CV'},
      {key:'references',title:'References'}
    ].forEach(function(group){
      var files=ownerFiles.filter(function(file){return fileGroup(file)===group.key;});
      if(!files.length)return;
      var heading=document.createElement('div');heading.className='share-document-group-heading';
      var headingTitle=document.createElement('b'),headingCount=document.createElement('span');
      headingTitle.textContent=group.title;headingCount.textContent=files.length+' file'+(files.length===1?'':'s');
      heading.appendChild(headingTitle);heading.appendChild(headingCount);list.appendChild(heading);
      files.forEach(function(file){
        var meta=documentMeta(file),row=document.createElement('div');row.className='share-document-choice';
        var checkbox=document.createElement('input');checkbox.type='checkbox';checkbox.id='share-file-'+file.id;checkbox.value=file.id;checkbox.checked=selected.has(file.id);checkbox.addEventListener('change',syncShareSelectAll);
        var nameLabel=document.createElement('label');nameLabel.className='share-document-name';nameLabel.htmlFor=checkbox.id;
        var name=document.createElement('b');name.textContent=meta.type;name.title=file.file_name||meta.type;nameLabel.appendChild(name);
        var category=document.createElement('span');category.textContent=fileCategoryLabel(file);
        var preview=document.createElement('button');preview.type='button';preview.className='secondary share-document-preview';preview.textContent='Preview';
        preview.addEventListener('click',function(){if(typeof window.atsrsCloudPreview==='function')window.atsrsCloudPreview(file.id);else window.alert('Document preview is not available yet.');});
        row.appendChild(checkbox);row.appendChild(nameLabel);row.appendChild(category);row.appendChild(preview);list.appendChild(row);
      });
    });
    syncShareSelectAll();
  }
  function selectedOwnerFiles(){return Array.prototype.map.call(document.querySelectorAll('#shareDocumentChoices input[type="checkbox"]:checked'),function(input){return input.value;});}
  function renderOwnerStatus(){
    var revoke=byId('revokeShareBtn'),create=byId('saveShareBtn');
    if(activeShare&&activeShare.active){
      setStatus('Link active until '+formatDateTime(activeShare.expires_at)+' · '+activeShare.selected_file_ids.length+' shared file(s) · '+activeShare.view_count+' opening(s)','active');
      if(revoke)revoke.classList.remove('hidden');if(create)create.textContent='Refresh Secure Link';
    }else if(activeShare){setStatus('Sharing is disabled or expired. Existing download permissions are closed.','revoked');if(revoke)revoke.classList.add('hidden');if(create)create.textContent='Create Secure Link';}
    else{setStatus('Private. No recruiter link has been created yet.','');if(revoke)revoke.classList.add('hidden');if(create)create.textContent='Create Secure Link';}
    var token=safeSessionGet(OWNER_TOKEN_KEY);
    if(token&&activeShare&&activeShare.token_hint&&token.slice(-8)!==activeShare.token_hint){safeSessionSet(OWNER_TOKEN_KEY,'');token='';}
    setKnownLink(activeShare&&activeShare.active&&token?shareUrl(token):'');
  }
  window.atsrsGetActiveShareStatus=function(){return activeShare?Object.assign({},activeShare):null;};
  window.atsrsGetShares=function(){return activeShares.filter(Boolean).slice().sort(function(left,right){var rightTime=new Date(right.updated_at||right.created_at||0).getTime()||0,leftTime=new Date(left.updated_at||left.created_at||0).getTime()||0;return rightTime-leftTime;}).map(function(share){return Object.assign({},share,{share_url:share.active?shareLinkById(share.id):''});});};
  window.atsrsGetActiveShares=function(){return window.atsrsGetShares().filter(function(share){return share.active;});};
  window.atsrsGetActiveRecruiterShares=function(){return window.atsrsGetActiveShares().filter(function(share){return share.audience==='recipient'&&share.recipient_recruiter_id;});};
  window.atsrsGetOwnerShareRequests=function(){return ownerRequests.map(function(request){return Object.assign({},request);});};
  function requestNames(request){var names=(request.requested_file_ids||[]).map(ownerFileName);return request.request_all?'All shared files':names.join(', ');}
  function requestHasActiveAccess(request){return request.status==='approved'&&request.access_expires_at&&new Date(request.access_expires_at).getTime()>Date.now();}
  function activeRequestFileIds(request){var revoked=new Set(request.revoked_file_ids||[]);return(request.requested_file_ids||[]).filter(function(id){return !revoked.has(id);});}
  function makeButton(text,className,onClick){var button=document.createElement('button');button.type='button';button.textContent=text;if(className)button.className=className;button.addEventListener('click',onClick);return button;}
  function renderRequestCard(request,history){
    var card=document.createElement('article');card.className='access-request-card status-'+request.status;
    card.dataset.requestId=request.id||'';card.dataset.shareId=request.share_id||'';
    var top=document.createElement('div');top.className='access-request-top';
    var identity=document.createElement('div'),name=document.createElement('b'),company=document.createElement('span');
    name.textContent=request.requester_name+' · '+request.requester_company;company.textContent=request.requester_email;
    identity.appendChild(name);identity.appendChild(company);
    var status=document.createElement('span');status.className='access-status';status.textContent=requestHasActiveAccess(request)?'Access active':request.status;
    top.appendChild(identity);top.appendChild(status);
    var requested=document.createElement('p');requested.innerHTML='<span>Requested</span> ';requested.appendChild(document.createTextNode(requestNames(request)));
    var time=document.createElement('small');time.textContent=(history?formatDateTime(request.created_at):relativeTime(request.created_at));
    var details=document.createElement('div');details.className='access-request-details hidden';
    var detailSummary=document.createElement('div');detailSummary.className='access-request-summary';detailSummary.textContent='Verified work email · '+request.requester_email+(request.access_expires_at?' · Access until '+formatDateTime(request.access_expires_at):'')+(request.download_count?' · '+request.download_count+' document download(s) completed':'');details.appendChild(detailSummary);
    var revokedIds=new Set(request.revoked_file_ids||[]),downloadedIds=new Set(request.downloaded_file_ids||[]),documentList=document.createElement('div');documentList.className='access-document-list';
    (request.requested_file_ids||[]).forEach(function(fileId){var row=document.createElement('div');row.className='access-document-row';var label=document.createElement('span');label.textContent=ownerFileName(fileId);var state=document.createElement('small'),downloaded=downloadedIds.has(fileId),revoked=revokedIds.has(fileId)||request.status!=='approved';state.textContent=revoked?'Access closed':(downloaded?'Active · downloaded':'Active');state.className=revoked?'closed':'';row.appendChild(label);row.appendChild(state);if(requestHasActiveAccess(request)&&!revoked){row.appendChild(makeButton('Revoke','access-revoke-document',function(){window.revokeShareDocumentAccess(request.id,fileId);}));}documentList.appendChild(row);});details.appendChild(documentList);
    var actions=document.createElement('div');actions.className='access-request-actions';
    if(request.status==='pending'){
      actions.appendChild(makeButton('Approve','',function(){window.decideShareRequest(request.id,'approve');}));
      actions.appendChild(makeButton('Decline','action',function(){window.decideShareRequest(request.id,'decline');}));
    }
    if(requestHasActiveAccess(request)&&activeRequestFileIds(request).length){actions.appendChild(makeButton('Revoke all access','access-revoke-all',function(){window.revokeShareRequestAccess(request.id);}));}
    actions.appendChild(makeButton('View details','secondary',function(){details.classList.toggle('hidden');}));
    card.appendChild(top);card.appendChild(requested);card.appendChild(time);card.appendChild(details);card.appendChild(actions);return card;
  }
  function renderOwnerRequests(analytics){
    var pending=ownerRequests.filter(function(item){return item.status==='pending';});
    var count=byId('pendingRequestCount');if(count)count.textContent=pending.length+' pending';
    var approveAll=byId('approveAllRequestsBtn');if(approveAll)approveAll.classList.toggle('hidden',pending.length<2);
    var dashboard=byId('dashboardAccessRequests');if(dashboard){dashboard.innerHTML='';if(!pending.length)dashboard.innerHTML='<div class="access-empty">No pending requests.</div>';else pending.forEach(function(item){dashboard.appendChild(renderRequestCard(item,false));});}
    var history=byId('shareRequestHistory');if(history){history.innerHTML='';if(!ownerRequests.length)history.innerHTML='<div class="access-empty">No access history yet.</div>';else ownerRequests.forEach(function(item){history.appendChild(renderRequestCard(item,true));});}
    window.dispatchEvent(new CustomEvent('atsrs:share-requests-updated'));
    var metrics=byId('shareAnalytics');if(metrics){metrics.innerHTML='';[
      ['Link opened',analytics.link_opened||0],['Documents previewed',analytics.document_previewed||0],['Download requests',analytics.download_requested||0],['Documents downloaded',analytics.document_downloaded||0]
    ].forEach(function(item){var box=document.createElement('div');var value=document.createElement('b'),label=document.createElement('span');value.textContent=String(item[1]);label.textContent=item[0];box.appendChild(value);box.appendChild(label);metrics.appendChild(box);});
      var previews=Array.isArray(analytics.previewed_files)?analytics.previewed_files.slice().sort(function(a,b){return b.count-a.count;}):[];
      if(previews.length){var detailBox=document.createElement('p');detailBox.className='share-analytics-detail';detailBox.textContent='Most previewed: '+previews.slice(0,3).map(function(item){return ownerFileName(item.file_id)+' ('+item.count+')';}).join(' · ');metrics.appendChild(detailBox);}
    }
  }
  function sentRequestStatus(request){
    var status=String(request&&request.status||'pending').toLowerCase();
    if(status==='approved'){
      if(request.access_expires_at&&new Date(request.access_expires_at).getTime()>Date.now())return{label:'Approved · access active',className:'approved'};
      return{label:'Approval expired',className:'expired'};
    }
    if(status==='otp_pending')return{label:'Email verification incomplete',className:'pending'};
    if(status==='pending')return{label:'Waiting for approval',className:'pending'};
    if(status==='declined')return{label:'Declined',className:'declined'};
    if(status==='revoked')return{label:'Access revoked',className:'revoked'};
    if(status==='expired')return{label:'Expired',className:'expired'};
    return{label:status.replace(/_/g,' '),className:status};
  }
  function sentRequestNames(request){
    var files=Array.isArray(request&&request.requested_files)?request.requested_files:[];
    if(request&&request.request_all)return files.length?'All shared files · '+files.map(function(file){return file.document_type||file.file_name||'Document';}).join(', '):'All shared files';
    return files.length?files.map(function(file){return file.document_type||file.file_name||'Document';}).join(', '):'Shared document';
  }
  function renderSentRequests(requests){
    requests=Array.isArray(requests)?requests:[];
    var count=byId('sentRequestCount');if(count)count.textContent=requests.length+' request'+(requests.length===1?'':'s');
    var list=byId('dashboardSentRequests');if(!list)return;
    list.innerHTML='';
    if(!requests.length){list.innerHTML='<div class="access-empty">No download requests sent yet.</div>';return;}
    requests.forEach(function(request){
      var statusInfo=sentRequestStatus(request),card=document.createElement('article');card.className='access-request-card corporate-sent-request status-'+statusInfo.className;
      var target=document.createElement('div');target.className='sent-request-target';
      var owner=document.createElement('div'),ownerName=document.createElement('b'),ownerPosition=document.createElement('span');
      ownerName.textContent=request.owner_name||'ATSRS profile owner';ownerPosition.textContent=request.owner_position||'Shared ATSRS profile';owner.appendChild(ownerName);owner.appendChild(ownerPosition);
      var badge=document.createElement('span');badge.className='access-status';badge.textContent=statusInfo.label;target.appendChild(owner);target.appendChild(badge);
      var details=document.createElement('div');details.className='sent-request-grid';
      var documents=document.createElement('div');documents.innerHTML='<small>REQUESTED DOCUMENTS</small><p></p>';documents.querySelector('p').textContent=sentRequestNames(request);
      var sent=document.createElement('div');sent.innerHTML='<small>SENT</small><p></p>';sent.querySelector('p').textContent=formatDateTime(request.created_at)+' · '+relativeTime(request.created_at);
      details.appendChild(documents);details.appendChild(sent);
      if(request.access_expires_at){var access=document.createElement('div');access.innerHTML='<small>DOWNLOAD ACCESS</small><p></p>';access.querySelector('p').textContent=requestHasActiveAccess(request)?'Available until '+formatDateTime(request.access_expires_at):'Closed';details.appendChild(access);}
      card.appendChild(target);card.appendChild(details);list.appendChild(card);
    });
  }
  function shareRefreshRelevant(){
    if(document.hidden)return false;
    var dashboard=byId('dashboardPage');
    if(dashboard&&!dashboard.classList.contains('hidden'))return true;
    var sharing=byId('accountSharingTab');
    if(sharing&&sharing.classList.contains('active'))return true;
    var access=byId('shareAccessBox');
    return Boolean(access&&!access.classList.contains('hidden'));
  }
  function refreshShareRequests(options){
    options=options||{};
    if(new URLSearchParams(location.search).get('share')||!client())return Promise.resolve(false);
    if(!options.force&&!shareRefreshRelevant())return Promise.resolve(false);
    if(shareRequestsPromise)return shareRequestsPromise;
    shareRequestsPromise=(async function(){
      if(!await authToken())return false;
      try{
        if(accountMode()==='company'){var sentResult=await ownerCall({action:'list_sent_requests'});renderSentRequests(sentResult.requests||[]);return true;}
        var result=await ownerCall({action:'list_requests'});ownerRequests=result.requests||[];renderOwnerRequests(result.analytics||{});return true;
      }catch(error){console.error('ATSRS access requests failed',error);return false;}
    })().finally(function(){shareRequestsPromise=null;});
    return shareRequestsPromise;
  }
  window.refreshShareRequests=function(){return refreshShareRequests({force:true});};
  function refreshOwnerPanel(options){
    options=options||{};
    if(new URLSearchParams(location.search).get('share')||!byId('shareProfilePanel')||!client())return Promise.resolve(false);
    if(!options.force&&!shareRefreshRelevant())return Promise.resolve(false);
    if(ownerPanelPromise)return ownerPanelPromise;
    ownerPanelPromise=(async function(){
      try{
        var token=await authToken();if(!token)return false;
        if(accountMode()==='company'){await refreshShareRequests({force:true});return true;}
        var results=await Promise.all([ownerCall({action:'status'}),listOwnerFiles(),ownerCall({action:'list_requests'})]);
        activeShares=Array.isArray(results[0].shares)?results[0].shares:(results[0].share?[results[0].share]:[]);activeShare=results[0].share||activeShares[0]||null;ownerFiles=results[1]||[];ownerRequests=results[2].requests||[];
        renderOwnerFiles();renderOwnerStatus();renderOwnerRequests(results[2].analytics||{});window.dispatchEvent(new CustomEvent('atsrs:share-link-updated'));return true;
      }catch(error){console.error('ATSRS share profile status failed',error);setStatus('Share status could not be loaded. Check the connection.','revoked');return false;}
    })().finally(function(){ownerPanelPromise=null;});
    return ownerPanelPromise;
  }
  window.toggleShareAccess=async function(){var box=byId('shareAccessBox');if(!box)return;box.classList.toggle('hidden');if(!box.classList.contains('hidden')){ownerMessage('Loading your server documents...');await refreshOwnerPanel({force:true});ownerMessage(ownerFiles.length?'Choose visible documents and the link expiry.':'');}};
  window.updateShareExpiryChoice=function(){var custom=byId('shareExpiryCustom'),preset=document.querySelector('input[name="shareExpiryPreset"]:checked');if(custom)custom.classList.toggle('hidden',!preset||preset.value!=='custom');};
  function selectedExpiry(){
    var preset=document.querySelector('input[name="shareExpiryPreset"]:checked'),value=preset?preset.value:'7d',date=new Date();
    if(value==='24h')date=new Date(Date.now()+86400000);else if(value==='3d')date=new Date(Date.now()+3*86400000);else if(value==='7d')date=new Date(Date.now()+7*86400000);else{
      var custom=byId('shareExpiryCustom'),raw=custom?custom.value:'';if(!raw)return'';date=new Date(raw+'T23:59:59');
    }
    return Number.isNaN(date.getTime())?'':date.toISOString();
  }
  window.createShareProfileLink=async function(){
    var button=byId('saveShareBtn'),fileIds=selectedOwnerFiles(),expiresAt=selectedExpiry(),audienceInput=document.querySelector('input[name="profileSharingAudience"]:checked'),audience=audienceInput?audienceInput.value:'anyone';
    if(audience==='recipient'){ownerMessage('Choose a verified recruiter from Recruiter Directory to create a recipient link.',true);return false;}
    if(!fileIds.length){ownerMessage('Select at least one server document.',true);return false;}if(!expiresAt){ownerMessage('Choose a valid link expiry date.',true);return false;}
    if(button)button.disabled=true;ownerMessage('Creating a preview-only secure link...');
    try{var result=await createValidatedShare(fileIds,expiresAt,audience);activeShare=result.share||null;if(activeShare){activeShares=activeShares.filter(function(share){return share.id!==activeShare.id;});activeShares.unshift(activeShare);if(result.token)setOwnerToken(activeShare.id,result.token);}setKnownLink(result.share_url||shareUrl(result.token||''));renderOwnerStatus();ownerMessage('Secure preview link is ready. Downloads require your approval.');await refreshOwnerPanel({force:true});window.dispatchEvent(new CustomEvent('atsrs:share-link-updated'));return true;}
    catch(error){console.error(error);ownerMessage(friendlyError(error,'Secure link could not be created. Please try again.'),true);return false;}finally{syncShareSelectAll();}
  };
  window.atsrsCreateRecruiterEmailShare=async function(recruiter){
    recruiter=recruiter&&typeof recruiter==='object'?recruiter:{};
    var recruiterId=String(recruiter.id||'').trim();
    if(!/^[0-9a-f-]{36}$/i.test(recruiterId))throw new Error('This recruiter is not ready for verified email sharing.');
    var result=await ownerCall({action:'create_recruiter_email_share',recruiter_id:recruiterId});
    var token=String(result&&result.token||''),url=String(result&&result.share_url||shareUrl(token)||'');
    if(!token||!url||!await validateShareToken(token))throw new Error('The 24-hour profile link could not be verified.');
    var recipient=result.recipient||{},email=verifiedEmail(recipient.email),composeUrl=recruiterGmailComposeUrl(recipient,url);
    if(!email||!composeUrl)throw new Error('This recruiter no longer has a verified professional email.');
    activeShare=result.share||null;
    if(activeShare){activeShares=activeShares.filter(function(share){return share.id!==activeShare.id;});activeShares.unshift(activeShare);setOwnerToken(activeShare.id,token);}
    setKnownLink(url);renderOwnerStatus();
    var copied=await copyText(url);
    ownerMessage(copied?'24-hour recruiter link copied. Email draft is opening.':'24-hour recruiter link created. Email draft is opening.');
    window.dispatchEvent(new CustomEvent('atsrs:share-link-updated'));
    var composeWindow=window.open(composeUrl,'_blank');
    if(composeWindow){try{composeWindow.opener=null;}catch(error){}}else window.location.href=composeUrl;
    return{share_url:url,recipient:recipient,copied:copied,email_sent:false};
  };
  window.atsrsPrepareProfileShare=async function(){await refreshOwnerPanel({force:true});return selectedOwnerFiles().length;};
  window.atsrsRefreshOwnerShares=function(){return refreshOwnerPanel({force:true});};
  window.atsrsUpdateCurrentShareExpiry=async function(){
    if(!activeShare||!activeShare.active)return true;
    var expiresAt=selectedExpiry();if(!expiresAt){ownerMessage('Choose a valid link expiry date.',true);return false;}
    try{var result=await ownerCall({action:'update_expiry',share_id:activeShare.id,expires_at:expiresAt});var updated=result.share||null;if(!updated)return false;activeShares=activeShares.map(function(share){return share.id===updated.id?updated:share;});activeShare=updated;renderOwnerStatus();await refreshOwnerPanel({force:true});window.dispatchEvent(new CustomEvent('atsrs:share-link-updated'));return true;}
    catch(error){ownerMessage(friendlyError(error,'The link expiry could not be updated. Please try again.'),true);return false;}
  };
  window.revokeShareProfileLink=async function(shareId){
    if(!window.confirm('Revoke this recruiter link? Preview and every approved download will stop immediately. No email will be sent.'))return;
    var button=byId('revokeShareBtn');if(button)button.disabled=true;ownerMessage('Disabling all recruiter access...');
    try{var result=await ownerCall({action:'revoke',share_id:shareId||activeShare&&activeShare.id}),deletedId=String(result.share_id||shareId||activeShare&&activeShare.id||'');activeShares=activeShares.filter(function(share){return share.id!==deletedId;});setOwnerToken(deletedId,'');activeShare=activeShares.find(function(share){return share.active;})||null;setKnownLink(activeShare?shareLinkById(activeShare.id):'');renderOwnerStatus();ownerMessage('Link deleted. Recruiter access stopped immediately and no email was sent.');await refreshOwnerPanel({force:true});window.dispatchEvent(new CustomEvent('atsrs:share-link-updated'));}
    catch(error){ownerMessage(friendlyError(error,'The link could not be disabled. Please try again.'),true);}finally{if(button)button.disabled=false;}
  };
  window.copyShareLink=async function(shareId){var url=shareId?shareLinkById(shareId):knownShareUrl;if(!url){var missingCopy='This older link cannot be copied because its secure key is no longer stored in this browser. Recreate this link once.';ownerMessage(missingCopy,true);window.alert(missingCopy);return false;}var token='';try{token=new URL(url).searchParams.get('share')||'';}catch(error){}if(!await validateShareToken(token)){if(shareId)setOwnerToken(shareId,'');else setKnownLink('');ownerMessage('This link is no longer active. Create a new secure link.',true);window.dispatchEvent(new CustomEvent('atsrs:share-link-updated'));return false;}try{await navigator.clipboard.writeText(url);}catch(error){var input=byId('shareProfileLink');if(input){input.value=url;input.focus();input.select();document.execCommand('copy');}}ownerMessage('Secure link copied.');var message=byId('shareCopyMsg');if(message){message.textContent='Secure link copied.';message.classList.remove('hidden');setTimeout(function(){message.classList.add('hidden');},1800);}return true;};
  window.previewShareProfile=function(shareId){var url=shareId?shareLinkById(shareId):knownShareUrl;if(!url){var missingOpen='This older link cannot be opened because its secure key is no longer stored in this browser. Recreate this link once.';ownerMessage(missingOpen,true);window.alert(missingOpen);return false;}var opened=window.open(url,'_blank');if(!opened){ownerMessage('Your browser blocked the new tab. Allow pop-ups for ATSRS and try again.',true);return false;}try{opened.opener=null;}catch(error){}return true;};
  window.toggleSharePreview=window.previewShareProfile;
  window.decideShareRequest=async function(id,decision){
    if(!window.confirm((decision==='approve'?'Approve':'Decline')+' this verified recruiter request?'))return;
    try{await ownerCall({action:'decide_request',request_id:id,decision:decision});await refreshShareRequests({force:true});}catch(error){window.alert(friendlyError(error,'The request could not be updated. Please try again.'));}
  };
  window.revokeShareRequestAccess=async function(id){
    if(!window.confirm('Close all active download access for this recruiter? The shared preview link will remain active.'))return;
    try{await ownerCall({action:'revoke_request_access',request_id:id});await refreshShareRequests({force:true});}catch(error){window.alert(friendlyError(error,'Access could not be closed. Please try again.'));}
  };
  window.revokeShareDocumentAccess=async function(id,fileId){
    if(!window.confirm('Close download access to this document? Other approved documents will remain available.'))return;
    try{await ownerCall({action:'revoke_document_access',request_id:id,file_id:fileId});await refreshShareRequests({force:true});}catch(error){window.alert(friendlyError(error,'Document access could not be closed. Please try again.'));}
  };
  window.approveAllShareRequests=async function(){
    if(!window.confirm('Approve every pending recruiter request until its share link expires?'))return;
    var button=byId('approveAllRequestsBtn');if(button)button.disabled=true;
    try{var result=await ownerCall({action:'approve_all_pending'});window.alert(result.approved+' request(s) approved.');await refreshShareRequests({force:true});}catch(error){window.alert(friendlyError(error,'Requests could not be approved. Please try again.'));}finally{if(button)button.disabled=false;}
  };

  function publicStatus(expiry){if(!expiry||String(expiry).toUpperCase()==='N/A')return{label:'NO EXPIRY',className:''};var today=new Date();today.setHours(0,0,0,0);var date=new Date(String(expiry).slice(0,10)+'T00:00:00'),days=Math.round((date-today)/86400000);if(days<0)return{label:'Expired',className:'expired'};if(days===0)return{label:'Expires today',className:'warning'};if(days<=30)return{label:days+' days left',className:'warning'};return{label:'VALID',className:''};}
  function recentPublicUpload(value){var time=new Date(value||'').getTime(),age=Date.now()-time;return Number.isFinite(time)&&age>=0&&age<12*60*60*1000;}
  function publicUploadLabel(value){var date=new Date(value||'');return Number.isFinite(date.getTime())?date.toLocaleDateString(undefined,{day:'2-digit',month:'short',year:'numeric'}):'Not provided';}
  function detail(label,value,className){var wrap=document.createElement('div');wrap.className='shared-document-detail'+(className?' '+className:'');var key=document.createElement('span'),text=document.createElement('b');key.textContent=label;text.textContent=value||'Not provided';wrap.appendChild(key);wrap.appendChild(text);return wrap;}
  function publicDocumentName(id){var file=publicDocuments.find(function(item){return item.id===id;});return file?(file.document_type||file.file_name):'Document';}
  function publicDocumentDomId(id){return 'shared-document-'+String(id||'file').replace(/[^a-zA-Z0-9_-]/g,'-');}
  function renderPublicSummary(){
    var summary=byId('sharedProfileSummary'),list=byId('sharedProfileSummaryList'),count=byId('sharedProfileSummaryCount');if(!summary||!list)return;
    var filter=byId('sharedProfileSummaryFilter'),selected=filter&&filter.value||'all';
    var visible=publicDocuments.filter(function(item){var itemStatus=publicStatus(item.expiry_date);if(selected==='recent')return recentPublicUpload(item.uploaded_at);if(selected==='expired')return itemStatus.className==='expired';if(selected==='expiry_risk')return itemStatus.className==='warning';if(selected==='current')return !itemStatus.className;return true;});
    list.innerHTML='';summary.classList.toggle('hidden',!publicDocuments.length);if(count)count.textContent=visible.length+' of '+publicDocuments.length+' file'+(publicDocuments.length===1?'':'s');
    visible.forEach(function(item,index){
      var row=document.createElement('li'),link=document.createElement('a'),number=document.createElement('span'),copy=document.createElement('span'),name=document.createElement('b'),provider=document.createElement('small');
      var statusData=publicStatus(item.expiry_date),status=document.createElement('span');link.href='#'+publicDocumentDomId(item.id);link.className='shared-document-summary-link';number.className='shared-document-summary-number';number.textContent=String(index+1).padStart(2,'0');
      name.textContent=item.document_type||item.file_name||'ATSRS document';provider.textContent=fileCategoryLabel(item)+(item.provider?' · '+item.provider:'');copy.appendChild(name);copy.appendChild(provider);status.className='shared-document-summary-status'+(statusData.className?' '+statusData.className:'');status.textContent=statusData.label;
      var recent=recentPublicUpload(item.uploaded_at);provider.textContent+=' · Uploaded '+publicUploadLabel(item.uploaded_at);provider.className=recent?'is-recent':'';if(recent){status.classList.add('is-new');status.textContent='NEW UPDATE';}
      link.appendChild(number);link.appendChild(copy);link.appendChild(status);link.addEventListener('click',function(){setTimeout(function(){var card=byId(publicDocumentDomId(item.id));if(card){card.classList.remove('summary-focus');void card.offsetWidth;card.classList.add('summary-focus');}},0);});row.appendChild(link);list.appendChild(row);
    });
    if(filter&&!filter.dataset.bound){filter.dataset.bound='true';filter.addEventListener('change',renderPublicSummary);}
  }
  function startBrowserDownload(url,fileName){var link=document.createElement('a');link.href=url;link.download=fileName||'';link.rel='noopener';link.style.display='none';document.body.appendChild(link);link.click();setTimeout(function(){link.remove();},1000);}
  async function downloadPublicDocument(documentData,button,quiet){
    if(button)button.disabled=true;
    try{var result=await publicCall({action:'download',file_id:documentData.id,viewer_token:viewerToken});startBrowserDownload(result.download_url,documentData.file_name);if(button){button.textContent='Downloaded';setTimeout(function(){button.textContent='Download';button.disabled=false;},1200);}if(!quiet)setTimeout(function(){loadPublicProfile(publicToken,{quiet:true});},250);return true;}
    catch(error){if(!quiet)window.alert(friendlyError(error,'Download access is unavailable. Please try again.'));return false;}
    finally{if(button&&button.textContent!=='Downloaded')button.disabled=false;}
  }
  async function downloadAllApproved(button){
    var available=publicDocuments.filter(function(item){return item.download_status==='approved';});if(!available.length)return;
    if(button){button.disabled=true;button.textContent='Preparing downloads...';}
    var completed=0,failed=0;
    for(var index=0;index<available.length;index+=1){if(button)button.textContent='Downloading '+(index+1)+' of '+available.length;var ok=await downloadPublicDocument(available[index],null,true);if(ok)completed+=1;else failed+=1;await new Promise(function(resolve){setTimeout(resolve,180);});}
    if(lastPublicProfileData)renderPublicProfile(lastPublicProfileData);
    await loadPublicProfile(publicToken);
    if(failed)window.alert(completed+' file(s) downloaded. '+failed+' could not be downloaded. Refreshing the page will show the current status.');
  }
  function renderPublicDocument(documentData){
    var recent=recentPublicUpload(documentData.uploaded_at),card=document.createElement('article');card.className='shared-document-card'+(recent?' is-recent-upload':'');card.id=publicDocumentDomId(documentData.id);
    var top=document.createElement('div');top.className='shared-document-top';var nameWrap=document.createElement('div');
    var category=document.createElement('span');category.className='shared-document-category';category.textContent=fileCategoryLabel(documentData);
    var title=document.createElement('h3');title.textContent=documentData.document_type||documentData.file_name||'ATSRS document';
    var file=document.createElement('p');file.className='shared-document-file';file.textContent=documentData.file_name||'';nameWrap.appendChild(category);nameWrap.appendChild(title);nameWrap.appendChild(file);
    var statusData=publicStatus(documentData.expiry_date),status=document.createElement('span');status.className='shared-document-status'+(statusData.className?' '+statusData.className:'');status.textContent=statusData.label;top.appendChild(nameWrap);top.appendChild(status);
    var details=document.createElement('div');details.className='shared-document-details';details.appendChild(detail('Uploaded',publicUploadLabel(documentData.uploaded_at),recent?'shared-upload-date is-recent':''));details.appendChild(detail('Issue date',formatDate(documentData.issue_date)));details.appendChild(detail('Expiry date',formatDate(documentData.expiry_date)));details.appendChild(detail('Provider',documentData.provider||'Not provided'));details.appendChild(detail('File size',formatSize(documentData.size_bytes)));
    var actions=document.createElement('div');actions.className='shared-document-actions';var preview=document.createElement('button');preview.type='button';preview.textContent='Preview';
    preview.addEventListener('click',function(){publicCall({action:'track_preview',file_id:documentData.id}).catch(function(){});if(typeof window.atsrsOpenFilePreview==='function')window.atsrsOpenFilePreview({url:documentData.preview_url,title:documentData.document_type||documentData.file_name||'ATSRS document',mimeType:documentData.mime_type||''});else window.location.assign(documentData.preview_url);});
    var access=document.createElement('button');access.type='button';access.className='secondary';
    if(documentData.download_status==='approved'){access.textContent='Download';access.addEventListener('click',function(){downloadPublicDocument(documentData,access);});}
    else if(documentData.download_status==='pending'){access.textContent='Request pending';access.disabled=true;}
    else if(documentData.download_status==='downloaded'){access.textContent='Downloaded';access.disabled=true;}
    else if(documentData.download_status==='declined'){access.textContent='Request declined';access.disabled=true;}
    else if(documentData.download_status==='approval_expired'){access.textContent='Approval expired';access.disabled=true;}
    else{access.textContent='Request Download';access.addEventListener('click',function(){window.openDownloadRequest(documentData.id);});}
    actions.appendChild(preview);actions.appendChild(access);card.appendChild(top);card.appendChild(details);card.appendChild(actions);return card;
  }
  function showPublicError(message){var loading=byId('sharedProfileLoading'),content=byId('sharedProfileContent'),error=byId('sharedProfileError');if(loading)loading.classList.add('hidden');if(content)content.classList.add('hidden');if(error){error.classList.remove('hidden');var text=error.querySelector('p');if(text)text.textContent=message||'This shared profile is unavailable.';}}
  function renderPublicProfile(data){
    lastPublicProfileData=data;
    var profile=data.profile||{},fullName=((profile.name||'')+' '+(profile.surname||'')).trim()||'ATSRS Profile';document.title=fullName+' · ATSRS Shared Profile';
    byId('sharedProfileName').textContent=fullName;byId('sharedProfileRole').textContent=profile.position||'Document Holder';
    var avatar=byId('sharedProfileAvatar'),avatarUrl='';
    try{var parsedAvatar=new URL(String(profile.avatar_url||''),location.origin);if(parsedAvatar.protocol==='https:')avatarUrl=parsedAvatar.href}catch(ignore){}
    if(avatar)avatar.innerHTML=avatarUrl?'<img src="'+avatarUrl.replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})+'" alt="" referrerpolicy="no-referrer">':'<span>'+((profile.name||'A').charAt(0)+(profile.surname||'').charAt(0)).toUpperCase()+'</span>';
    var meta=byId('sharedProfileMeta');meta.innerHTML='';[profile.company,profile.country].filter(Boolean).forEach(function(value){var tag=document.createElement('span');tag.textContent=value;meta.appendChild(tag);});
    publicDocuments=Array.isArray(data.documents)?data.documents:[];byId('sharedProfileDocumentCount').textContent=publicDocuments.length+' shared file'+(publicDocuments.length===1?'':'s');
    var expiry=byId('sharedProfileExpiry');if(expiry)expiry.textContent='Link expires '+formatDateTime(data.access&&data.access.share_expires_at);
    renderPublicSummary();var grid=byId('sharedProfileDocuments');grid.innerHTML='';if(!publicDocuments.length){var empty=document.createElement('div');empty.className='shared-profile-empty';empty.textContent='No files are currently shared through this link.';grid.appendChild(empty);}else[
      {key:'documents',title:'Documents & CV'},
      {key:'references',title:'References'}
    ].forEach(function(group){
      var files=publicDocuments.filter(function(item){return fileGroup(item)===group.key;});if(!files.length)return;
      var section=document.createElement('section');section.className='shared-file-group shared-file-group-'+group.key;
      var heading=document.createElement('div');heading.className='shared-file-group-heading';
      var title=document.createElement('h3'),count=document.createElement('span');title.textContent=group.title;count.textContent=files.length+' file'+(files.length===1?'':'s');heading.appendChild(title);heading.appendChild(count);
      var sectionGrid=document.createElement('div');sectionGrid.className='shared-document-grid';files.forEach(function(item){sectionGrid.appendChild(renderPublicDocument(item));});
      section.appendChild(heading);section.appendChild(sectionGrid);grid.appendChild(section);
    });
    var all=byId('requestAllDocumentsBtn');if(all){
      var approvedFiles=publicDocuments.filter(function(item){return item.download_status==='approved';}),availableFiles=publicDocuments.filter(function(item){return item.download_status==='available_on_request';}),pendingFiles=publicDocuments.filter(function(item){return item.download_status==='pending';});
      all.onclick=null;all.disabled=false;
      if(approvedFiles.length){all.textContent=approvedFiles.length===publicDocuments.length?'Download All':'Download remaining ('+approvedFiles.length+')';all.onclick=function(){downloadAllApproved(all);};}
      else if(availableFiles.length){all.textContent=availableFiles.length===publicDocuments.length?'Request All Files':'Request remaining ('+availableFiles.length+')';all.onclick=function(){window.openDownloadRequest(availableFiles.length===publicDocuments.length?'all':availableFiles.map(function(item){return item.id;}));};}
      else if(pendingFiles.length){all.textContent='Request Pending';all.disabled=true;}
      else{all.textContent='Download request closed';all.disabled=true;}
    }
    byId('sharedProfileLoading').classList.add('hidden');byId('sharedProfileError').classList.add('hidden');byId('sharedProfileContent').classList.remove('hidden');
  }
  async function loadPublicProfile(token,options){
    options=options||{};if(publicProfilePromise)return publicProfilePromise;
    document.body.classList.add('atsrs-public-share-view');document.body.classList.remove('atsrs-session-pending','atsrs-booting');var page=byId('sharedProfilePage');if(page)page.classList.remove('hidden');
    publicProfilePromise=(async function(){try{var headers={apikey:publishableKey()};if(viewerToken)headers['x-atsrs-viewer-token']=viewerToken;var params=new URLSearchParams();if(token)params.set('token',token);if(publicResumeRequest)params.set('request_id',publicResumeRequest);if(publicResumeToken)params.set('resume',publicResumeToken);if(options.quiet)params.set('refresh','1');var url=endpoint()+'?'+params.toString();var response=await fetch(url,{headers:headers,cache:'no-store'});if(!response.ok&&!options.quiet){await new Promise(function(resolve){setTimeout(resolve,450)});response=await fetch(url,{headers:headers,cache:'no-store'})}var data=await response.json().catch(function(){return{};});if(!response.ok)throw new Error(data.error||'This shared profile is unavailable.');renderPublicProfile(data);return data;}
    catch(error){console.error('ATSRS public profile failed',error);if(!options.quiet)showPublicError(friendlyError(error,'This shared profile is unavailable.'));return null;}finally{publicProfilePromise=null;}})();return publicProfilePromise;
  }
  function setRequestStep(step){['shareIdentityStep','shareOtpStep','shareVerifiedStep'].forEach(function(id){var element=byId(id);if(element)element.classList.toggle('hidden',id!==step);});}
  window.openDownloadRequest=function(target){
    var isAll=target==='all',ids=isAll?publicDocuments.map(function(item){return item.id;}):(Array.isArray(target)?target:[target]),label=isAll?'all shared files':(Array.isArray(target)?'the remaining '+ids.length+' files':publicDocumentName(target));
    requestContext={request_all:isAll,file_ids:ids,label:label};pendingVerificationId='';requestMessage('');
    var summary=byId('shareRequestSummary');if(summary)summary.textContent='Requesting '+label+'. The owner will review your verified request. Once approved, downloads remain available until the share link expires.';
    var modal=byId('shareRequestModal');if(modal)modal.classList.remove('hidden');
    if(viewerToken&&viewerIdentity){var identity=byId('shareVerifiedIdentity');if(identity)identity.textContent=viewerIdentity.name+' · '+viewerIdentity.company+' · '+viewerIdentity.email;setRequestStep('shareVerifiedStep');}
    else setRequestStep('shareIdentityStep');
  };
  window.closeDownloadRequest=function(){var modal=byId('shareRequestModal');if(modal)modal.classList.add('hidden');requestMessage('');};
  window.resetShareVerification=function(){viewerToken='';viewerIdentity=null;safeViewerSet(viewerKey('token'),'');safeViewerSet(viewerKey('identity'),'');pendingVerificationId='';setRequestStep('shareIdentityStep');requestMessage('Enter your work details to receive a new verification code.');};
  window.sendShareRequestOtp=async function(){
    if(!requestContext)return;var button=byId('sendShareOtpBtn'),name=(byId('shareRequesterName').value||'').trim(),company=(byId('shareRequesterCompany').value||'').trim(),email=(byId('shareRequesterEmail').value||'').trim();
    if(button)button.disabled=true;requestMessage('Sending a verification code to your work email...');
    try{var result=await publicCall({action:'start_verification',requester_name:name,requester_company:company,requester_email:email,file_ids:requestContext.file_ids,request_all:requestContext.request_all});pendingVerificationId=result.request_id;viewerIdentity={name:name,company:company,email:email.toLowerCase()};setRequestStep('shareOtpStep');requestMessage('Enter the 6-digit code sent to '+viewerIdentity.email+'.');var otp=byId('shareRequesterOtp');if(otp)otp.focus();}
    catch(error){requestMessage(friendlyError(error,'Verification code could not be sent. Please try again.'),true);}finally{if(button)button.disabled=false;}
  };
  window.verifyShareRequestOtp=async function(){
    var button=byId('verifyShareOtpBtn'),otp=(byId('shareRequesterOtp').value||'').trim();if(button)button.disabled=true;requestMessage('Verifying your email...');
    try{var result=await publicCall({action:'verify_otp',request_id:pendingVerificationId,otp:otp});viewerToken=result.viewer_token||'';safeViewerSet(viewerKey('token'),viewerToken);safeViewerSet(viewerKey('identity'),JSON.stringify(viewerIdentity||{}));requestMessage('Verified. Your request is waiting for the profile owner.');showRequestSentToast();setTimeout(function(){window.closeDownloadRequest();loadPublicProfile(publicToken);},900);}
    catch(error){requestMessage(friendlyError(error,'The code could not be verified. Check it and try again.'),true);}finally{if(button)button.disabled=false;}
  };
  window.sendVerifiedShareRequest=async function(){
    if(!requestContext)return;var button=byId('sendVerifiedShareRequestBtn');if(button)button.disabled=true;requestMessage('Sending your verified request...');
    try{await publicCall({action:'create_request',viewer_token:viewerToken,file_ids:requestContext.file_ids,request_all:requestContext.request_all});requestMessage('Request sent. The profile owner has been notified.');showRequestSentToast();setTimeout(function(){window.closeDownloadRequest();loadPublicProfile(publicToken);},800);}
    catch(error){requestMessage(friendlyError(error,'The request could not be sent. Please try again.'),true);}finally{if(button)button.disabled=false;}
  };
  function install(){
    var publicParams=new URLSearchParams(location.search);publicToken=publicParams.get('share')||'';publicResumeRequest=publicParams.get('share_request')||'';publicResumeToken=publicParams.get('resume')||'';
    if(publicToken||(publicResumeRequest&&publicResumeToken)){viewerToken=safeViewerGet(viewerKey('token'));try{viewerIdentity=JSON.parse(safeViewerGet(viewerKey('identity'))||'null');}catch(error){viewerIdentity=null;}loadPublicProfile(publicToken);atsrsStableInterval(function(){if(document.hidden||!publicDocuments.some(function(item){return item.download_status==='pending';}))return;return loadPublicProfile(publicToken,{quiet:true});},5000);document.addEventListener('visibilitychange',function(){if(!document.hidden)loadPublicProfile(publicToken,{quiet:true});});window.addEventListener('focus',function(){loadPublicProfile(publicToken,{quiet:true});});window.addEventListener('atsrs:resume',function(){loadPublicProfile(publicToken,{quiet:true});});return;}
    var input=byId('shareProfileLink');if(input){input.value='';input.placeholder='Create a secure link after choosing documents.';}var copy=byId('copyShareBtn');if(copy)copy.disabled=true;var preview=byId('previewShareBtn');if(preview)preview.disabled=true;
    refreshOwnerPanel({force:true});setTimeout(function(){refreshOwnerPanel({force:true});},1200);atsrsStableInterval(function(){return refreshShareRequests();},30000);
    var oldShow=window.showAccountTab;if(typeof oldShow==='function'&&!oldShow.__atsrsSharing){window.showAccountTab=function(tab){var result=oldShow.apply(this,arguments);if(tab==='sharing')setTimeout(function(){refreshOwnerPanel({force:true});},0);return result;};window.showAccountTab.__atsrsSharing=true;}
    var oldPage=window.showPage;if(typeof oldPage==='function'&&!oldPage.__atsrsSharing){window.showPage=function(page){var result=oldPage.apply(this,arguments);if(page==='dashboard')setTimeout(function(){refreshShareRequests({force:true});},0);return result;};window.showPage.__atsrsSharing=true;}
    if(client()&&client().auth&&typeof client().auth.onAuthStateChange==='function')client().auth.onAuthStateChange(function(event,session){if(session&&session.user)refreshOwnerPanel();});
    window.addEventListener('atsrs:resume',refreshShareRequests);
    document.addEventListener('visibilitychange',function(){if(!document.hidden)refreshShareRequests();});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);else install();
})();
