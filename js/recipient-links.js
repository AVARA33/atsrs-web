(function(){
  'use strict';

  var state={entitlement:{enabled:false,active_limit:0},shares:[],files:[],requests:[],editing:null,returnFocus:null,publicToken:'',sessionToken:'',publicDocuments:[],downloadRequest:null};
  var rawTokens={};
  var OWNER_ACTIONS=['owner_status','owner_files','owner_create','owner_update','owner_revoke','owner_decide'];
  function byId(id){return document.getElementById(id);}
  function endpoint(){return (typeof SUPABASE_URL!=='undefined'?SUPABASE_URL:'')+'/functions/v1/recipient-share';}
  function key(){return typeof SUPABASE_KEY!=='undefined'?SUPABASE_KEY:'';}
  function uuid(){return crypto.randomUUID();}
  function escapeHtml(value){return String(value==null?'':value).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
  function message(text,error,target){var el=byId(target||'recipientLinksMessage');if(!el)return;el.textContent=text||'';el.classList.toggle('error',Boolean(error));}
  function formatDate(value){var date=new Date(value);return Number.isNaN(date.getTime())?'Not available':new Intl.DateTimeFormat('en-GB',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}).format(date);}
  function publicMode(){return /^#recipient=[A-Za-z0-9_-]{40,128}$/.test(location.hash);}
  async function token(){var client=window.supabaseClient;if(!client)return'';var result=await client.auth.getSession();return result&&result.data&&result.data.session?result.data.session.access_token||'':'';}
  async function call(body,owner){
    var headers={apikey:key(),'Content-Type':'application/json'};
    if(owner){var access=await token();if(!access)throw new Error('Sign in is required.');headers.Authorization='Bearer '+access;}
    var controller=new AbortController(),timer=setTimeout(function(){controller.abort();},15000);
    try{
      var response=await fetch(endpoint(),{method:'POST',headers:headers,body:JSON.stringify(body),signal:controller.signal});
      var data=await response.json().catch(function(){return{};});
      if(!response.ok)throw new Error(data.error||'Recipient-link request failed.');
      return data;
    }finally{clearTimeout(timer);}
  }
  function currentExpiry(){
    var preset=byId('recipientExpiryPreset').value,date=new Date();
    if(preset==='24h')date=new Date(Date.now()+86400000);
    else if(preset==='7d')date=new Date(Date.now()+7*86400000);
    else if(preset==='30d')date=new Date(Date.now()+30*86400000);
    else{var raw=byId('recipientCustomExpiry').value;date=new Date(raw);}
    return Number.isNaN(date.getTime())?'':date.toISOString();
  }
  function selectedDocuments(){
    return Array.prototype.slice.call(document.querySelectorAll('#recipientDocumentChoices input[type="checkbox"]:checked')).map(function(input){return input.value;});
  }
  function renderFiles(selected){
    var box=byId('recipientDocumentChoices');if(!box)return;selected=selected||[];
    if(!state.files.length){box.innerHTML='<div class="access-empty">Upload at least one Personal document before creating a recipient link.</div>';return;}
    box.innerHTML=state.files.map(function(file){
      var checked=selected.indexOf(file.id)>=0?' checked':'';
      return '<label class="share-document-choice recipient-document-choice"><input type="checkbox" value="'+escapeHtml(file.id)+'"'+checked+'><span class="share-document-name"><b>'+escapeHtml(file.file_name||'Document')+'</b><span>'+escapeHtml(file.category||'document')+'</span></span></label>';
    }).join('');
  }
  function effectiveStatus(share){return share.effective_status||share.status||'active';}
  function render(){
    var entitlement=byId('recipientLinksEntitlement'),button=byId('createRecipientLinkBtn'),list=byId('recipientLinksList');
    var enabled=state.entitlement&&state.entitlement.enabled===true;
    if(entitlement)entitlement.textContent=enabled?'Up to '+state.entitlement.active_limit+' active recipient links are available for this account.':'Recipient links are currently available only to approved canary accounts.';
    if(button)button.disabled=!enabled;
    if(!list)return;
    if(!state.shares.length){list.innerHTML='<div class="access-empty">No recipient links yet.</div>';return;}
    list.innerHTML=state.shares.map(function(share){
      var status=effectiveStatus(share),docs=(share.document_ids||[]).length,canManage=status==='active';
      return '<article class="recipient-link-card" data-share-id="'+escapeHtml(share.id)+'"><div><b>'+escapeHtml(share.recipient_label)+'</b><small>'+escapeHtml(share.recipient_type)+' · '+escapeHtml(share.recipient_email_masked)+'</small></div><div><span>'+docs+' document'+(docs===1?'':'s')+'</span><small>Preview '+(share.allow_preview?'on':'off')+' · Download '+(share.allow_download?'on':'off')+'</small></div><div><span class="recipient-link-status '+escapeHtml(status)+'">'+escapeHtml(status)+'</span><small>Expires '+escapeHtml(formatDate(share.expires_at))+'</small></div><div class="recipient-link-actions"><button type="button" class="secondary" data-copy="'+escapeHtml(share.id)+'">Copy</button><button type="button" class="secondary" data-edit="'+escapeHtml(share.id)+'" '+(canManage?'':'disabled')+'>Edit access</button><button type="button" class="action" data-revoke="'+escapeHtml(share.id)+'" '+(canManage?'':'disabled')+'>Revoke</button></div></article>';
    }).join('');
    renderOwnerRequests();
  }
  function renderOwnerRequests(){
    var box=byId('recipientDownloadRequests');if(!box)return;
    var pending=state.requests.filter(function(request){return request.status==='pending';});
    if(!pending.length){box.innerHTML='';return;}
    box.innerHTML='<h5>Pending download requests</h5>'+pending.map(function(request){
      var share=state.shares.find(function(item){return item.id===request.dedicated_share_id;}),label=share?share.recipient_label:'Verified recipient';
      return '<article class="recipient-request-card"><div><b>'+escapeHtml(label)+'</b><small>'+request.requested_document_ids.length+' requested document'+(request.requested_document_ids.length===1?'':'s')+' · '+escapeHtml(formatDate(request.created_at))+'</small></div><div class="recipient-link-actions"><button type="button" class="secondary" data-request-decision="decline" data-request-id="'+escapeHtml(request.id)+'">Decline</button><button type="button" data-request-decision="approve" data-request-id="'+escapeHtml(request.id)+'">Approve</button></div></article>';
    }).join('');
  }
  async function refresh(){
    if(publicMode()||!byId('recipientLinksList'))return;
    try{
      var results=await Promise.all([call({action:'owner_status'},true),call({action:'owner_files'},true)]);
      state.entitlement=results[0].entitlement||{enabled:false,active_limit:0};state.shares=results[0].shares||[];state.requests=results[0].requests||[];state.files=results[1].files||[];render();
    }catch(error){message(error.message||'Recipient links could not be loaded.',true);if(byId('createRecipientLinkBtn'))byId('createRecipientLinkBtn').disabled=true;}
  }
  function fillModal(share){
    state.editing=share||null;byId('recipientShareId').value=share?share.id:'';byId('recipientShareVersion').value=share?share.version:'';
    byId('recipientLinkModalTitle').textContent=share?'Edit recipient access':'Create recipient link';
    byId('recipientSubmitBtn').textContent=share?'Save and rotate if needed':'Create secure link';
    byId('recipientLabel').value=share?share.recipient_label:'';
    byId('recipientEmail').value='';
    Array.prototype.forEach.call(document.querySelectorAll('input[name="recipientType"]'),function(input){input.checked=input.value===(share?share.recipient_type:'person');});
    byId('recipientAllowPreview').checked=share?share.allow_preview:true;byId('recipientAllowDownload').checked=share?share.allow_download:false;
    byId('recipientExpiryPreset').value=share?'custom':'7d';byId('recipientCustomExpiryLabel').classList.toggle('hidden',!share);
    byId('recipientCustomExpiry').value=share?new Date(share.expires_at).toISOString().slice(0,16):'';
    renderFiles(share?share.document_ids:[]);message('',false,'recipientFormMessage');updateReview();
  }
  function openModal(share){
    state.returnFocus=document.activeElement;fillModal(share);var modal=byId('recipientLinkModal');modal.classList.remove('hidden');document.body.classList.add('modal-open');setTimeout(function(){byId('recipientLabel').focus();},0);
  }
  function closeModal(){var modal=byId('recipientLinkModal');if(!modal)return;modal.classList.add('hidden');document.body.classList.remove('modal-open');if(state.returnFocus&&state.returnFocus.focus)state.returnFocus.focus();}
  function trapModalFocus(event){
    var modal=byId('recipientLinkModal');
    if(!modal||modal.classList.contains('hidden')||event.key!=='Tab')return;
    var focusable=Array.prototype.slice.call(modal.querySelectorAll('button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])')).filter(function(element){return element.offsetParent!==null;});
    if(!focusable.length){event.preventDefault();return;}
    var first=focusable[0],last=focusable[focusable.length-1];
    if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
    else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
  }
  function updateReview(){var review=byId('recipientReviewSummary');if(!review)return;var docs=selectedDocuments().length,expiry=currentExpiry();review.textContent=(docs||0)+' selected document'+(docs===1?'':'s')+' · '+(expiry?'Expires '+formatDate(expiry):'Choose a valid expiry')+'. Downloads always require owner approval.';}
  async function submit(event){
    event.preventDefault();var button=byId('recipientSubmitBtn'),ids=selectedDocuments(),email=byId('recipientEmail').value.trim(),label=byId('recipientLabel').value.trim(),expiry=currentExpiry(),type=(document.querySelector('input[name="recipientType"]:checked')||{}).value;
    if(!label||!email||!ids.length||!expiry){message('Complete the recipient, email, document and expiry fields.',true,'recipientFormMessage');return;}
    button.disabled=true;message(state.editing?'Saving recipient access…':'Creating secure link…',false,'recipientFormMessage');
    try{
      var body={action:state.editing?'owner_update':'owner_create',operation_id:uuid(),recipient_type:type,recipient_label:label,recipient_email:email,document_ids:ids,expires_at:expiry,allow_preview:byId('recipientAllowPreview').checked,allow_download:byId('recipientAllowDownload').checked};
      if(state.editing){body.share_id=state.editing.id;body.expected_version=state.editing.version;}
      var result=await call(body,true),share=result.share;if(result.token&&share&&share.id){rawTokens[share.id]=result.token;try{sessionStorage.setItem('atsrs_recipient_token_'+share.id,result.token);}catch(ignore){}}
      closeModal();message(state.editing?'Recipient access updated. Email changes create a new secure link.':'Recipient link created. Copy it now and send it only to the intended recipient.');await refresh();
    }catch(error){message(error.message||'Recipient link could not be saved.',true,'recipientFormMessage');}
    finally{button.disabled=false;}
  }
  async function copyShare(id){
    var tokenValue=rawTokens[id];try{if(!tokenValue)tokenValue=sessionStorage.getItem('atsrs_recipient_token_'+id)||'';}catch(ignore){}
    if(!tokenValue){message('For security, the raw link is shown only when created or rotated. Create a new link if it was not saved.',true);return;}
    var url='https://atsrs.com/#recipient='+tokenValue;try{await navigator.clipboard.writeText(url);message('Secure recipient link copied.');}catch(error){message('The link could not be copied. Try again.',true);}
  }
  async function revoke(id){
    if(!confirm('Revoke this recipient link? This will immediately close its sessions and approved downloads.'))return;
    try{await call({action:'owner_revoke',share_id:id,operation_id:uuid()},true);try{sessionStorage.removeItem('atsrs_recipient_token_'+id);}catch(ignore){}message('Recipient link revoked.');await refresh();}catch(error){message(error.message||'Recipient link could not be revoked.',true);}
  }
  async function publicStart(){
    state.publicToken=location.hash.slice('#recipient='.length);document.body.classList.add('atsrs-public-share-view');byId('sharedProfilePage').classList.remove('hidden');byId('sharedProfileLoading').classList.add('hidden');byId('sharedProfileContent').classList.add('hidden');byId('recipientShareVerification').classList.remove('hidden');
    await call({action:'probe',token:state.publicToken},false).catch(function(){});
  }
  window.sendRecipientOtp=async function(){
    var button=byId('recipientSendOtpBtn'),email=byId('recipientViewerEmail').value.trim();if(!email){message('Enter the recipient email.',true,'recipientVerificationMessage');return;}button.disabled=true;
    try{var result=await call({action:'start_otp',token:state.publicToken,email:email},false);state.challengeId=result.challenge_id;byId('recipientEmailStep').classList.add('hidden');byId('recipientOtpStep').classList.remove('hidden');message('If the email matches this link, a 6-digit code has been sent.',false,'recipientVerificationMessage');byId('recipientViewerOtp').focus();}
    catch(error){message('Verification is temporarily unavailable.',true,'recipientVerificationMessage');}finally{button.disabled=false;}
  };
  window.verifyRecipientOtp=async function(){
    var button=byId('recipientVerifyOtpBtn'),email=byId('recipientViewerEmail').value.trim(),otp=byId('recipientViewerOtp').value.trim();button.disabled=true;
    try{var result=await call({action:'verify_otp',token:state.publicToken,email:email,challenge_id:state.challengeId,otp:otp},false);state.sessionToken=result.session_token;byId('recipientShareVerification').classList.add('hidden');await loadRecipientProfile();}
    catch(error){message('The email or code is invalid, expired or already used.',true,'recipientVerificationMessage');}finally{button.disabled=false;}
  };
  window.resetRecipientVerification=function(){state.challengeId='';state.sessionToken='';byId('recipientViewerOtp').value='';byId('recipientOtpStep').classList.add('hidden');byId('recipientEmailStep').classList.remove('hidden');message('',false,'recipientVerificationMessage');byId('recipientViewerEmail').focus();};
  async function loadRecipientProfile(){
    var result=await call({action:'profile',token:state.publicToken,session_token:state.sessionToken},false);
    byId('sharedProfileName').textContent=result.recipient&&result.recipient.label||'Verified recipient';
    byId('sharedProfileRole').textContent='Private recipient access';
    byId('sharedProfileMeta').innerHTML='<span>'+escapeHtml(result.recipient&&result.recipient.email||'Verified email')+'</span>';
    state.publicDocuments=result.documents||[];state.publicAccess=result.access||{};
    byId('sharedProfileDocumentCount').textContent=state.publicDocuments.length+' shared file'+(state.publicDocuments.length===1?'':'s');byId('sharedProfileExpiry').textContent='Link expires '+formatDate(result.access&&result.access.expires_at);
    renderPublicDocuments();
    var requestButton=byId('requestAllDocumentsBtn');requestButton.classList.toggle('hidden',!result.access.allow_download);requestButton.onclick=requestDedicatedDownloads;
    byId('sharedProfileContent').classList.remove('hidden');
    var saved=requestStorage();if(saved){state.downloadRequest={id:saved};await checkDownloadRequest();}
  }
  function renderPublicDocuments(){
    var approved=state.downloadRequest&&state.downloadRequest.status==='approved',requestId=approved?state.downloadRequest.id:'';
    var grid=byId('sharedProfileDocuments');grid.innerHTML=state.publicDocuments.map(function(file){return '<article class="shared-document-card"><div><span class="shared-document-type">'+escapeHtml(file.category||'Document')+'</span><h3>'+escapeHtml(file.file_name||'Document')+'</h3></div><div class="shared-document-actions">'+(state.publicAccess.allow_preview?'<button type="button" data-recipient-preview="'+escapeHtml(file.id)+'">Preview</button>':'')+(approved?'<button type="button" data-recipient-download="'+escapeHtml(file.id)+'" data-request-id="'+escapeHtml(requestId)+'">Download</button>':'')+'</div></article>';}).join('')||'<div class="shared-profile-empty">No documents are available.</div>';
  }
  function requestStorage(value){
    var keyName='atsrs_recipient_request_'+state.publicToken.slice(-8);
    try{if(arguments.length){if(value)sessionStorage.setItem(keyName,value);else sessionStorage.removeItem(keyName);return value;}return sessionStorage.getItem(keyName)||'';}catch(ignore){return'';}
  }
  async function requestDedicatedDownloads(){
    var button=byId('requestAllDocumentsBtn'),status=byId('recipientDownloadStatus');button.disabled=true;status.classList.remove('hidden');status.textContent='Sending download request…';
    try{var result=await call({action:'request_download',token:state.publicToken,session_token:state.sessionToken,operation_id:uuid(),document_ids:state.publicDocuments.map(function(file){return file.id;})},false);state.downloadRequest=result.request;requestStorage(result.request.id);status.textContent='Request sent. The owner must approve it before downloads become available.';button.textContent='Check request status';button.onclick=checkDownloadRequest;}
    catch(error){status.textContent='The download request could not be sent. Try again.';}finally{button.disabled=false;}
  }
  async function checkDownloadRequest(){
    if(!state.downloadRequest||!state.downloadRequest.id)return;
    var button=byId('requestAllDocumentsBtn'),status=byId('recipientDownloadStatus');button.disabled=true;status.classList.remove('hidden');
    try{var result=await call({action:'request_status',token:state.publicToken,session_token:state.sessionToken,request_id:state.downloadRequest.id},false);state.downloadRequest=result.request;
      if(result.request.status==='approved'){status.textContent='Download request approved. Temporary download buttons are now available.';button.classList.add('hidden');}
      else if(result.request.status==='pending'){status.textContent='Download request is waiting for owner approval.';button.textContent='Check request status';button.onclick=checkDownloadRequest;}
      else{status.textContent='This download request is '+result.request.status+'.';button.classList.add('hidden');}
      renderPublicDocuments();
    }catch(error){status.textContent='Request status is unavailable. Try again.';}finally{button.disabled=false;}
  }
  async function preview(id){try{var result=await call({action:'preview',token:state.publicToken,session_token:state.sessionToken,document_id:id},false);window.open(result.preview_url,'_blank','noopener,noreferrer');}catch(error){alert('This document preview is unavailable.');}}
  async function download(id,requestId){try{var result=await call({action:'download',token:state.publicToken,session_token:state.sessionToken,document_id:id,request_id:requestId},false);window.open(result.download_url,'_blank','noopener,noreferrer');}catch(error){var status=byId('recipientDownloadStatus');status.classList.remove('hidden');status.textContent='This download is unavailable or the approval has expired.';}}
  async function decideRequest(id,decision){try{await call({action:'owner_decide',request_id:id,decision:decision,operation_id:uuid()},true);message(decision==='approve'?'Download request approved.':'Download request declined.');await refresh();}catch(error){message(error.message||'The download request could not be updated.',true);}}
  window.openRecipientLinkModal=function(){openModal(null);};
  function install(){
    if(publicMode()){publicStart();return;}
    var form=byId('recipientLinkForm');if(form)form.addEventListener('submit',submit);
    document.addEventListener('click',function(event){
      var close=event.target.closest('[data-recipient-modal-close]');if(close){closeModal();return;}
      var copy=event.target.closest('[data-copy]');if(copy){copyShare(copy.dataset.copy);return;}
      var edit=event.target.closest('[data-edit]');if(edit){openModal(state.shares.find(function(item){return item.id===edit.dataset.edit;}));return;}
      var rev=event.target.closest('[data-revoke]');if(rev){revoke(rev.dataset.revoke);return;}
      var decision=event.target.closest('[data-request-decision]');if(decision){decideRequest(decision.dataset.requestId,decision.dataset.requestDecision);return;}
      var view=event.target.closest('[data-recipient-preview]');if(view){preview(view.dataset.recipientPreview);return;}
      var file=event.target.closest('[data-recipient-download]');if(file)download(file.dataset.recipientDownload,file.dataset.requestId);
    });
    document.addEventListener('keydown',function(event){if(event.key==='Escape'&&!byId('recipientLinkModal').classList.contains('hidden'))closeModal();else trapModalFocus(event);});
    ['recipientExpiryPreset','recipientCustomExpiry','recipientAllowPreview','recipientAllowDownload'].forEach(function(id){var el=byId(id);if(el)el.addEventListener('change',function(){if(id==='recipientExpiryPreset')byId('recipientCustomExpiryLabel').classList.toggle('hidden',el.value!=='custom');updateReview();});});
    var choices=byId('recipientDocumentChoices');if(choices)choices.addEventListener('change',updateReview);
    var oldShow=window.showAccountTab;if(typeof oldShow==='function'&&!oldShow.__atsrsRecipientLinks){window.showAccountTab=function(tab){var result=oldShow.apply(this,arguments);if(tab==='sharing')setTimeout(refresh,0);return result;};window.showAccountTab.__atsrsRecipientLinks=true;}
    refresh();
  }
  window.ATSRSRecipientLinks={refresh:refresh,ownerActions:OWNER_ACTIONS.slice()};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);else install();
})();
