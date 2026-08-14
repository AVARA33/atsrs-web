(function(){
  'use strict';

  var dialog=document.getElementById('qrUploadDialog');
  var code=document.getElementById('qrUploadCode');
  var statusBox=document.getElementById('qrUploadStatus');
  var countdown=document.getElementById('qrUploadCountdown');
  var session=null;
  var pollTimer=0;
  var countdownTimer=0;
  var countdownDeadline=0;
  var returnFocus=null;

  function endpoint(){
    return (typeof SUPABASE_URL!=='undefined'?SUPABASE_URL:'')+'/functions/v1/document-qr-upload';
  }

  function setStatus(message,type){
    if(!statusBox)return;
    statusBox.textContent=message;
    statusBox.classList.toggle('is-success',type==='success');
    statusBox.classList.toggle('is-error',type==='error');
  }

  async function accessToken(){
    if(!window.supabaseClient)throw new Error('ATSRS cloud connection is not ready.');
    var result=await window.supabaseClient.auth.getSession();
    var token=result&&result.data&&result.data.session&&result.data.session.access_token;
    if(!token)throw new Error('Sign in is required.');
    return token;
  }

  async function request(action,payload){
    var token=await accessToken();
    var response=await fetch(endpoint(),{
      method:'POST',
      headers:{
        'Authorization':'Bearer '+token,
        'apikey':typeof SUPABASE_KEY!=='undefined'?SUPABASE_KEY:'',
        'Content-Type':'application/json'
      },
      body:JSON.stringify(Object.assign({action:action},payload||{}))
    });
    var data=await response.json().catch(function(){return {};});
    if(!response.ok)throw new Error(data.error||'Secure QR upload is unavailable.');
    return data;
  }

  function clearTimers(){
    if(pollTimer)window.clearTimeout(pollTimer);
    if(countdownTimer)window.clearInterval(countdownTimer);
    pollTimer=0;countdownTimer=0;countdownDeadline=0;
  }

  function renderCountdown(){
    if(!countdown||!session)return;
    var serverDeadline=new Date(session.expires_at).getTime();
    var deadline=countdownDeadline?Math.min(serverDeadline,countdownDeadline):serverDeadline;
    var remaining=Math.max(0,deadline-Date.now());
    var seconds=Math.ceil(remaining/1000);
    var minutes=Math.floor(seconds/60);
    countdown.textContent=remaining?'Valid for '+minutes+':'+String(seconds%60).padStart(2,'0'):'Expired';
    if(!remaining){
      clearTimers();
      setStatus('This QR code has expired. Create a new code to continue.','error');
    }
  }

  function renderQr(url){
    if(!code||typeof window.qrcode!=='function')throw new Error('QR renderer is unavailable.');
    var value=window.qrcode(0,'M');
    value.addData(url);
    value.make();
    code.innerHTML=value.createSvgTag({cellSize:6,margin:2,scalable:true});
    var svg=code.querySelector('svg');
    if(svg){svg.setAttribute('role','img');svg.setAttribute('aria-label','Secure ATSRS phone upload QR code');}
  }

  async function poll(){
    if(!session||!dialog||dialog.classList.contains('hidden'))return;
    try{
      var result=await request('status',{session_id:session.id});
      var current=result.session||{};
      if(current.status==='uploaded'&&result.file){
        clearTimers();
        setStatus('File received. Complete the document details below.','success');
        window.setTimeout(function(){
          close(false);
          if(typeof window.atsrsReceiveQrDocument==='function')window.atsrsReceiveQrDocument(result.file);
        },700);
        return;
      }
      if(current.status==='uploading')setStatus('Your phone is uploading the file...');
      if(current.status==='expired'||current.status==='cancelled'){
        clearTimers();
        setStatus(current.status==='expired'?'This QR code has expired.':'This QR upload was cancelled.','error');
        return;
      }
    }catch(error){
      console.warn('ATSRS QR status check failed',error);
    }
    pollTimer=window.setTimeout(poll,1800);
  }

  async function create(){
    clearTimers();
    session=null;
    if(code)code.innerHTML='<i class="ph ph-spinner-gap" aria-hidden="true"></i>';
    setStatus('Preparing secure QR code...');
    try{
      var theme=document.documentElement.dataset.theme==='light'?'light':'dark';
      var result=await request('create',{theme:theme});
      session=result.session;
      countdownDeadline=Date.now()+Math.min(600,Number(result.ttl_seconds)||600)*1000;
      renderQr(result.upload_url);
      setStatus('Ready. Scan the code with your phone.');
      renderCountdown();
      countdownTimer=window.setInterval(renderCountdown,1000);
      pollTimer=window.setTimeout(poll,900);
    }catch(error){
      console.error('ATSRS QR session creation failed',error);
      if(code)code.innerHTML='<i class="ph ph-warning-circle" aria-hidden="true"></i>';
      setStatus(error.message||'Secure QR upload is unavailable.','error');
    }
  }

  async function cancelSession(){
    var current=session;
    session=null;
    clearTimers();
    if(current&&current.id){
      try{await request('cancel',{session_id:current.id});}catch(error){console.warn('ATSRS QR cancellation was not confirmed',error);}
    }
  }

  function close(cancel){
    if(!dialog)return;
    dialog.classList.add('hidden');
    document.body.classList.remove('atsrs-qr-open');
    clearTimers();
    if(cancel)cancelSession();
    if(returnFocus&&typeof returnFocus.focus==='function')returnFocus.focus();
  }

  window.openDocumentQrUpload=function(){
    if(document.body.classList.contains('company-mode'))return;
    if(!dialog)return;
    returnFocus=document.activeElement;
    dialog.classList.remove('hidden');
    document.body.classList.add('atsrs-qr-open');
    var closeButton=document.getElementById('qrUploadCloseBtn');
    if(closeButton)closeButton.focus();
    create();
  };

  document.getElementById('qrUploadRefreshBtn')?.addEventListener('click',async function(){
    await cancelSession();
    create();
  });
  document.getElementById('qrUploadCancelBtn')?.addEventListener('click',function(){close(true);});
  document.getElementById('qrUploadCloseBtn')?.addEventListener('click',function(){close(true);});
  dialog?.querySelector('[data-qr-close]')?.addEventListener('click',function(){close(true);});
  document.addEventListener('keydown',function(event){
    if(event.key==='Escape'&&dialog&&!dialog.classList.contains('hidden'))close(true);
  });
})();
