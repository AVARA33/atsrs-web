(function(){
  'use strict';

  var TOKEN_KEY='atsrs_share_profile_token';
  var activeShare=null;
  var ownerFiles=[];
  var knownShareUrl='';

  function byId(id){return document.getElementById(id);}
  function client(){return window.supabaseClient||null;}
  function endpoint(){
    var base=typeof SUPABASE_URL!=='undefined'?SUPABASE_URL:'';
    return base?base+'/functions/v1/share-profile':'';
  }
  function publishableKey(){
    return typeof SUPABASE_KEY!=='undefined'?SUPABASE_KEY:'';
  }
  function safeSessionGet(){
    try{return sessionStorage.getItem(TOKEN_KEY)||'';}catch(error){return '';}
  }
  function safeSessionSet(token){
    try{
      if(token)sessionStorage.setItem(TOKEN_KEY,token);
      else sessionStorage.removeItem(TOKEN_KEY);
    }catch(error){}
  }
  function shareUrl(token){
    return token?'https://atsrs.com/?share='+encodeURIComponent(token):'';
  }
  function formatDate(value){
    if(!value)return 'Not provided';
    var date=new Date(String(value).slice(0,10)+'T00:00:00');
    if(Number.isNaN(date.getTime()))return String(value);
    return new Intl.DateTimeFormat('en',{day:'2-digit',month:'short',year:'numeric'}).format(date);
  }
  function formatSize(value){
    var bytes=Number(value||0);
    if(!bytes)return '—';
    if(bytes<1024*1024)return Math.max(1,Math.round(bytes/1024))+' KB';
    return (bytes/(1024*1024)).toFixed(1)+' MB';
  }
  function documentMeta(file){
    var metadata=file&&file.metadata&&typeof file.metadata==='object'?file.metadata:{};
    var document=metadata.document&&typeof metadata.document==='object'?metadata.document:{};
    return {
      type:document.type||(file.category==='cv'?'Curriculum Vitae':file.file_name||'Document'),
      issue:document.issue||'',
      expiry:document.expiry||''
    };
  }
  function ownerMessage(text,isError){
    var element=byId('shareManageMsg');
    if(!element)return;
    element.textContent=text||'';
    element.classList.toggle('error',Boolean(isError));
  }
  function setStatus(text,state){
    var element=byId('shareProfileStatus');
    if(!element)return;
    element.textContent=text;
    element.className='share-live-status'+(state?' '+state:'');
  }
  function setKnownLink(url){
    knownShareUrl=url||'';
    var input=byId('shareProfileLink');
    var copy=byId('copyShareBtn');
    var preview=byId('previewShareBtn');
    if(input){
      input.value=knownShareUrl;
      input.placeholder=activeShare&&activeShare.active
        ?'Active link. Refresh it below to copy a new link.'
        :'Create a secure link after choosing documents.';
    }
    if(copy)copy.disabled=!knownShareUrl;
    if(preview)preview.disabled=!knownShareUrl;
  }
  async function authToken(){
    var supabase=client();
    if(!supabase)return '';
    var result=await supabase.auth.getSession();
    return result&&result.data&&result.data.session?result.data.session.access_token||'':'';
  }
  async function ownerCall(body){
    var accessToken=await authToken();
    if(!accessToken)throw new Error('Please sign in again.');
    var response=await fetch(endpoint(),{
      method:'POST',
      headers:{
        'apikey':publishableKey(),
        'Authorization':'Bearer '+accessToken,
        'Content-Type':'application/json'
      },
      body:JSON.stringify(body)
    });
    var data=await response.json().catch(function(){return{};});
    if(!response.ok)throw new Error(data.error||'Share profile request failed.');
    return data;
  }
  async function listOwnerFiles(){
    var supabase=client();
    if(!supabase)return [];
    var result=await supabase.from('atsrs_files')
      .select('id,category,file_name,mime_type,size_bytes,metadata,created_at')
      .eq('account_type','personal')
      .order('created_at',{ascending:false});
    if(result.error)throw result.error;
    return result.data||[];
  }
  function renderOwnerFiles(){
    var list=byId('shareDocumentChoices');
    if(!list)return;
    var selected=new Set(activeShare&&Array.isArray(activeShare.selected_file_ids)?activeShare.selected_file_ids:[]);
    if(!ownerFiles.length){
      list.innerHTML='<div class="preview-box">Upload documents or a CV first, then return here to create your recruiter link.</div>';
      return;
    }
    list.innerHTML='';
    ownerFiles.forEach(function(file){
      var meta=documentMeta(file);
      var label=document.createElement('label');
      label.className='share-document-choice';
      var checkbox=document.createElement('input');
      checkbox.type='checkbox';
      checkbox.value=file.id;
      checkbox.checked=selected.has(file.id);
      var name=document.createElement('b');
      name.textContent=meta.type;
      name.title=file.file_name||meta.type;
      var category=document.createElement('span');
      category.textContent=file.category==='cv'?'CV':'Document';
      label.appendChild(checkbox);
      label.appendChild(name);
      label.appendChild(category);
      list.appendChild(label);
    });
  }
  function selectedOwnerFiles(){
    return Array.prototype.map.call(
      document.querySelectorAll('#shareDocumentChoices input[type="checkbox"]:checked'),
      function(input){return input.value;}
    );
  }
  function renderOwnerStatus(){
    var revoke=byId('revokeShareBtn');
    var create=byId('saveShareBtn');
    if(activeShare&&activeShare.active){
      setStatus('Secure link active · '+activeShare.selected_file_ids.length+' file(s) shared · '+activeShare.view_count+' view(s)','active');
      if(revoke)revoke.classList.remove('hidden');
      if(create)create.textContent='Refresh Secure Link';
    }else if(activeShare){
      setStatus('Sharing is disabled. Recruiters can no longer open the old link.','revoked');
      if(revoke)revoke.classList.add('hidden');
      if(create)create.textContent='Create Secure Link';
    }else{
      setStatus('Private. No recruiter link has been created yet.','');
      if(revoke)revoke.classList.add('hidden');
      if(create)create.textContent='Create Secure Link';
    }
    var token=safeSessionGet();
    setKnownLink(activeShare&&activeShare.active&&token?shareUrl(token):'');
  }
  async function refreshOwnerPanel(){
    if(new URLSearchParams(location.search).get('share'))return;
    if(!byId('shareProfilePanel')||!client())return;
    try{
      var token=await authToken();
      if(!token)return;
      var results=await Promise.all([ownerCall({action:'status'}),listOwnerFiles()]);
      activeShare=results[0].share||null;
      ownerFiles=results[1]||[];
      renderOwnerFiles();
      renderOwnerStatus();
    }catch(error){
      console.error('ATSRS share profile status failed',error);
      setStatus('Share status could not be loaded. Check the connection.','revoked');
    }
  }
  window.toggleShareAccess=async function(){
    var box=byId('shareAccessBox');
    if(!box)return;
    box.classList.toggle('hidden');
    if(!box.classList.contains('hidden')){
      ownerMessage('Loading your server documents...');
      await refreshOwnerPanel();
      ownerMessage(ownerFiles.length?'Choose only the files recruiters may open.':'');
    }
  };
  window.createShareProfileLink=async function(){
    var button=byId('saveShareBtn');
    var fileIds=selectedOwnerFiles();
    if(!fileIds.length){ownerMessage('Select at least one server document.',true);return;}
    if(button)button.disabled=true;
    ownerMessage('Creating a new secure link...');
    try{
      var result=await ownerCall({action:'create',file_ids:fileIds});
      activeShare=result.share||null;
      if(result.token)safeSessionSet(result.token);
      setKnownLink(result.share_url||shareUrl(result.token||''));
      renderOwnerStatus();
      setKnownLink(result.share_url||shareUrl(result.token||''));
      ownerMessage('Secure link is ready. Copy it and send it to a recruiter.');
    }catch(error){
      console.error(error);
      ownerMessage(error.message||'Secure link could not be created.',true);
    }finally{
      if(button)button.disabled=false;
    }
  };
  window.revokeShareProfileLink=async function(){
    if(!window.confirm('Disable this recruiter link? Anyone using the old link will lose access.'))return;
    var button=byId('revokeShareBtn');
    if(button)button.disabled=true;
    ownerMessage('Disabling recruiter access...');
    try{
      var result=await ownerCall({action:'revoke'});
      activeShare=result.share||activeShare;
      safeSessionSet('');
      setKnownLink('');
      renderOwnerStatus();
      ownerMessage('The old recruiter link is disabled.');
    }catch(error){
      console.error(error);
      ownerMessage(error.message||'The link could not be disabled.',true);
    }finally{
      if(button)button.disabled=false;
    }
  };
  window.copyShareLink=async function(){
    if(!knownShareUrl)return;
    try{
      await navigator.clipboard.writeText(knownShareUrl);
    }catch(error){
      var input=byId('shareProfileLink');
      if(input){input.focus();input.select();document.execCommand('copy');}
    }
    var message=byId('shareCopyMsg');
    if(message){
      message.textContent='Secure link copied.';
      message.classList.remove('hidden');
      setTimeout(function(){message.classList.add('hidden');},1800);
    }
  };
  window.previewShareProfile=function(){
    if(knownShareUrl)window.location.assign(knownShareUrl);
  };
  window.toggleSharePreview=window.previewShareProfile;

  function publicStatus(expiry){
    if(!expiry||String(expiry).toUpperCase()==='N/A')return{label:'No expiry date',className:''};
    var today=new Date();today.setHours(0,0,0,0);
    var date=new Date(String(expiry).slice(0,10)+'T00:00:00');
    var days=Math.round((date-today)/86400000);
    if(days<0)return{label:'Expired',className:'expired'};
    if(days===0)return{label:'Expires today',className:'warning'};
    if(days<=30)return{label:days+' days left',className:'warning'};
    return{label:'Valid',className:''};
  }
  function detail(label,value){
    var wrap=document.createElement('div');
    wrap.className='shared-document-detail';
    var key=document.createElement('span');
    key.textContent=label;
    var text=document.createElement('b');
    text.textContent=value||'Not provided';
    wrap.appendChild(key);wrap.appendChild(text);
    return wrap;
  }
  function renderPublicDocument(documentData){
    var card=document.createElement('article');
    card.className='shared-document-card';
    var top=document.createElement('div');
    top.className='shared-document-top';
    var nameWrap=document.createElement('div');
    var category=document.createElement('span');
    category.className='shared-document-category';
    category.textContent=documentData.category==='cv'?'Professional profile':'Owner-provided document';
    var title=document.createElement('h3');
    title.textContent=documentData.document_type||documentData.file_name||'ATSRS document';
    var file=document.createElement('p');
    file.className='shared-document-file';
    file.textContent=documentData.file_name||'';
    nameWrap.appendChild(category);nameWrap.appendChild(title);nameWrap.appendChild(file);
    var statusData=publicStatus(documentData.expiry_date);
    var status=document.createElement('span');
    status.className='shared-document-status'+(statusData.className?' '+statusData.className:'');
    status.textContent=statusData.label;
    top.appendChild(nameWrap);top.appendChild(status);

    var details=document.createElement('div');
    details.className='shared-document-details';
    details.appendChild(detail('Issue date',formatDate(documentData.issue_date)));
    details.appendChild(detail('Expiry date',formatDate(documentData.expiry_date)));
    details.appendChild(detail('Provider',documentData.provider||'Not provided'));
    details.appendChild(detail('File size',formatSize(documentData.size_bytes)));

    var actions=document.createElement('div');
    actions.className='shared-document-actions';
    var preview=document.createElement('button');
    preview.type='button';
    preview.textContent='Preview';
    preview.addEventListener('click',function(){
      if(typeof window.atsrsOpenFilePreview==='function'){
        window.atsrsOpenFilePreview({
          url:documentData.preview_url,
          title:documentData.document_type||documentData.file_name||'ATSRS document',
          onDownload:function(){window.location.assign(documentData.download_url);}
        });
      }else{
        window.location.assign(documentData.preview_url);
      }
    });
    var download=document.createElement('a');
    download.href=documentData.download_url;
    download.textContent='Download';
    download.setAttribute('rel','nofollow');
    actions.appendChild(preview);actions.appendChild(download);
    card.appendChild(top);card.appendChild(details);card.appendChild(actions);
    return card;
  }
  function showPublicError(message){
    var loading=byId('sharedProfileLoading');
    var content=byId('sharedProfileContent');
    var error=byId('sharedProfileError');
    if(loading)loading.classList.add('hidden');
    if(content)content.classList.add('hidden');
    if(error){
      error.classList.remove('hidden');
      var text=error.querySelector('p');
      if(text)text.textContent=message||'This shared profile is unavailable.';
    }
  }
  function renderPublicProfile(data){
    var profile=data.profile||{};
    var fullName=((profile.name||'')+' '+(profile.surname||'')).trim()||'ATSRS Professional';
    document.title=fullName+' · ATSRS Shared Profile';
    byId('sharedProfileName').textContent=fullName;
    byId('sharedProfileRole').textContent=profile.position||'Professional Document Holder';
    var meta=byId('sharedProfileMeta');
    meta.innerHTML='';
    [profile.company,profile.country].filter(Boolean).forEach(function(value){
      var tag=document.createElement('span');tag.textContent=value;meta.appendChild(tag);
    });
    var documents=Array.isArray(data.documents)?data.documents:[];
    byId('sharedProfileDocumentCount').textContent=documents.length+' shared file'+(documents.length===1?'':'s');
    var grid=byId('sharedProfileDocuments');
    grid.innerHTML='';
    if(!documents.length){
      var empty=document.createElement('div');
      empty.className='shared-profile-empty';
      empty.textContent='No documents are currently shared through this link.';
      grid.appendChild(empty);
    }else{
      documents.forEach(function(item){grid.appendChild(renderPublicDocument(item));});
    }
    byId('sharedProfileLoading').classList.add('hidden');
    byId('sharedProfileError').classList.add('hidden');
    byId('sharedProfileContent').classList.remove('hidden');
  }
  async function loadPublicProfile(token){
    document.body.classList.add('atsrs-public-share-view');
    document.body.classList.remove('atsrs-session-pending','atsrs-booting');
    var page=byId('sharedProfilePage');
    if(page)page.classList.remove('hidden');
    try{
      var response=await fetch(endpoint()+'?token='+encodeURIComponent(token),{
        headers:{'apikey':publishableKey()}
      });
      var data=await response.json().catch(function(){return{};});
      if(!response.ok)throw new Error(data.error||'This shared profile is unavailable.');
      renderPublicProfile(data);
    }catch(error){
      console.error('ATSRS public profile failed',error);
      showPublicError(error.message||'This shared profile is unavailable.');
    }
  }
  function install(){
    var token=new URLSearchParams(location.search).get('share')||'';
    if(token){
      loadPublicProfile(token);
      return;
    }
    var input=byId('shareProfileLink');
    if(input){input.value='';input.placeholder='Create a secure link after choosing documents.';}
    var copy=byId('copyShareBtn');if(copy)copy.disabled=true;
    var preview=byId('previewShareBtn');if(preview)preview.disabled=true;
    refreshOwnerPanel();
    setTimeout(refreshOwnerPanel,1200);
    if(client()&&client().auth&&typeof client().auth.onAuthStateChange==='function'){
      client().auth.onAuthStateChange(function(event,session){
        if(session&&session.user)refreshOwnerPanel();
      });
    }
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);
  else install();
})();
