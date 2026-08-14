(function(){
  'use strict';
  var SUPABASE_URL='https://hwtjuqyxzivymofamwxl.supabase.co';
  var SUPABASE_KEY='sb_publishable_57xvbnJGp7pTXvfG11EdvA_Du_LvVyD';
  var ENDPOINT=SUPABASE_URL+'/functions/v1/document-qr-upload';
  var MAX_BYTES=15*1024*1024;
  var ALLOWED=['application/pdf','image/jpeg','image/png','image/webp'];
  var rawToken='';
  var statusBox=document.getElementById('phoneUploadStatus');
  var choices=document.getElementById('phoneUploadChoices');
  var progress=document.getElementById('phoneUploadProgress');
  var client=window.supabase&&window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});

  function status(message,type,icon){
    statusBox.classList.toggle('is-success',type==='success');
    statusBox.classList.toggle('is-error',type==='error');
    statusBox.innerHTML='<i class="ph '+(icon||'ph-info')+'" aria-hidden="true"></i><span></span>';
    statusBox.querySelector('span').textContent=message;
  }

  async function request(action,payload){
    var response=await fetch(ENDPOINT,{
      method:'POST',
      headers:{'apikey':SUPABASE_KEY,'Content-Type':'application/json'},
      body:JSON.stringify(Object.assign({action:action,token:rawToken},payload||{}))
    });
    var data=await response.json().catch(function(){return {};});
    if(!response.ok){
      var error=new Error(data.error||'Secure upload is unavailable.');
      error.code=data.code||'';
      throw error;
    }
    return data;
  }

  function wait(ms){return new Promise(function(resolve){window.setTimeout(resolve,ms);});}

  async function finalizeWithRetry(){
    var lastError=null;
    for(var attempt=0;attempt<7;attempt+=1){
      try{return await request('finalize');}
      catch(error){
        lastError=error;
        if(error.code!=='QR_UPLOAD_INCOMPLETE')throw error;
        await wait(350+attempt*200);
      }
    }
    throw lastError||new Error('Upload could not be finalized.');
  }

  function normalizeType(file){
    var type=String(file.type||'').toLowerCase();
    if(type)return type;
    var name=String(file.name||'').toLowerCase();
    if(name.endsWith('.pdf'))return 'application/pdf';
    if(name.endsWith('.png'))return 'image/png';
    if(name.endsWith('.webp'))return 'image/webp';
    if(name.endsWith('.jpg')||name.endsWith('.jpeg'))return 'image/jpeg';
    return '';
  }

  async function upload(file){
    if(!file)return;
    var mime=normalizeType(file);
    if(!ALLOWED.includes(mime)||file.size<=0||file.size>MAX_BYTES){
      status('Choose a PDF, JPG, PNG, or WebP file up to 15 MB.','error','ph-warning-circle');
      return;
    }
    choices.hidden=true;progress.hidden=false;
    status('Uploading securely...','','ph-spinner-gap');
    try{
      var prepared=await request('prepare',{file_name:file.name||'ATSRS-document',mime_type:mime,size_bytes:file.size});
      if(!client)throw new Error('Secure upload client is unavailable.');
      var result=await client.storage.from('atsrs-user-files').uploadToSignedUrl(prepared.path,prepared.signed_token,file,{contentType:mime});
      if(result.error)throw result.error;
      await finalizeWithRetry();
      progress.hidden=true;
      status('Upload complete. Return to your computer to finish the document details.','success','ph-check-circle');
    }catch(error){
      console.error('ATSRS phone upload failed',error);
      progress.hidden=true;choices.hidden=false;
      status(error.message||'Upload could not be completed.','error','ph-warning-circle');
    }
  }

  async function start(){
    var match=/^#token=([A-Za-z0-9_-]{40,128})$/.exec(window.location.hash||'');
    rawToken=match?match[1]:'';
    if(!rawToken){status('This QR upload link is invalid.','error','ph-warning-circle');return;}
    history.replaceState(null,'',window.location.pathname);
    try{
      var result=await request('inspect');
      if(result.session.status==='uploaded'){
        status('This document was already uploaded. You can return to your computer.','success','ph-check-circle');
        return;
      }
      if(result.session.status==='uploading'){
        choices.hidden=true;progress.hidden=false;
        status('Finishing your upload...','','ph-spinner-gap');
        await finalizeWithRetry();
        progress.hidden=true;
        status('Upload complete. Return to your computer to finish the document details.','success','ph-check-circle');
        return;
      }
      choices.hidden=false;
      status('Secure connection ready. Choose how to add the document.','','ph-shield-check');
    }catch(error){
      status(error.message||'This QR upload link has expired.','error','ph-warning-circle');
    }
  }

  document.getElementById('takePhotoBtn').addEventListener('click',function(){document.getElementById('cameraInput').click();});
  document.getElementById('chooseFileBtn').addEventListener('click',function(){document.getElementById('fileInput').click();});
  document.getElementById('cameraInput').addEventListener('change',function(event){upload(event.target.files&&event.target.files[0]);event.target.value='';});
  document.getElementById('fileInput').addEventListener('change',function(event){upload(event.target.files&&event.target.files[0]);event.target.value='';});
  start();
})();
