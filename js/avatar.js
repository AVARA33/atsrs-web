/* ATSRS V375 - one owner-uploaded identity photo across personal and corporate workspaces. */
(function(){
  'use strict';
  var BUCKET='atsrs-profile-photos';
  var MAX_BYTES=5*1024*1024;
  var cropState=null;
  var identityUrl='';
  var identityPath='';
  var identityUserId='';
  var identityPromise=null;

  function byId(id){return document.getElementById(id)}
  function client(){return window.supabaseClient||null}
  function profileKey(){
    try{return typeof window.localKey==='function'?window.localKey('profile'):'atsrs_'+((window.currentUser&&window.currentUser.id)||'local_test_user')+'_profile'}
    catch(error){return 'atsrs_local_test_user_profile'}
  }
  function readProfile(){
    try{
      var key=profileKey(),raw=window.atsrsCloudData&&window.atsrsCloudData.isManagedKey(key)?window.atsrsCloudData.read(key):localStorage.getItem(key);
      return raw?JSON.parse(raw):{};
    }catch(error){return {}}
  }
  function writeProfile(profile){
    try{
      var key=profileKey(),value=JSON.stringify(profile);
      if(window.atsrsCloudData&&window.atsrsCloudData.isManagedKey(key))return window.atsrsCloudData.write(key,value);
      localStorage.setItem(key,value);return true;
    }catch(error){return false}
  }
  function initials(profile){
    var values=[profile&&profile.name,profile&&profile.surname].filter(Boolean);
    if(!values.length){
      var meta=window.currentUser&&window.currentUser.user_metadata||{};
      values=String(meta.full_name||meta.name||'A').split(/\s+/).filter(Boolean);
    }
    return values.slice(0,2).map(function(value){return String(value).charAt(0).toUpperCase()}).join('')||'A';
  }
  function allowedUrl(value){
    var text=String(value||'').trim();
    if(!text)return '';
    try{var url=new URL(text,location.origin);return url.protocol==='https:'?url.href:''}catch(error){return ''}
  }
  function metadataPhoto(user){
    var metadata=user&&user.user_metadata||{};
    var url=allowedUrl(metadata.atsrs_profile_photo_url);
    return url?{url:url,path:String(metadata.atsrs_profile_photo_path||'')}:{url:'',path:''};
  }
  function applyIdentityMetadata(user){
    var photo=metadataPhoto(user);
    if(!photo.url)return false;
    identityUrl=photo.url;identityPath=photo.path;identityUserId=user.id;
    return true;
  }
  async function saveIdentityMetadata(url,path){
    var c=client();if(!c||!c.auth)return false;
    var result=await c.auth.updateUser({data:{
      atsrs_profile_photo_url:url||null,
      atsrs_profile_photo_path:path||null
    }});
    if(result.error)throw result.error;
    if(result.data&&result.data.user){
      window.currentUser=result.data.user;
      try{currentUser=result.data.user}catch(ignore){}
    }
    return true;
  }
  function resolvedUrl(profile){
    var workspaceUrl=profile&&profile.avatarSource==='upload'&&profile.avatarPath?allowedUrl(profile.avatarUrl):'';
    var userPhoto=metadataPhoto(window.currentUser);
    return workspaceUrl||userPhoto.url||identityUrl;
  }
  function profileFromPayload(payload){
    try{
      var raw=payload&&payload.value;
      var profile=typeof raw==='string'?JSON.parse(raw):{};
      return profile&&typeof profile==='object'?profile:{};
    }catch(error){return {}}
  }
  async function hydrateIdentityPhoto(force){
    var c=client(),user=window.currentUser&&window.currentUser.id?window.currentUser:null;
    if(!c||!user)return '';
    applyIdentityMetadata(user);
    var localProfile=readProfile(),localUrl=localProfile&&localProfile.avatarSource==='upload'&&localProfile.avatarPath?allowedUrl(localProfile.avatarUrl):'';
    if(localUrl){
      identityUrl=localUrl;identityPath=localProfile.avatarPath||'';identityUserId=user.id;
      var localMetadata=metadataPhoto(user);
      if(localMetadata.url!==localUrl||localMetadata.path!==identityPath){
        saveIdentityMetadata(localUrl,identityPath).catch(function(error){console.warn('ATSRS identity photo metadata could not be updated',error)});
      }
      return identityUrl;
    }
    if(!force&&identityUserId===user.id&&identityUrl)return identityUrl;
    if(identityPromise&&identityPromise.userId===user.id)return identityPromise;
    var promise=(async function(){
      var url='',path='';
      var key='atsrs_'+user.id+'_personal_profile';
      var personal=await c.from('atsrs_workspace_data')
        .select('payload')
        .eq('user_id',user.id)
        .eq('account_type','personal')
        .eq('data_key',key)
        .maybeSingle();
      if(!personal.error&&personal.data){
        var profile=profileFromPayload(personal.data.payload);
        if(profile.avatarSource==='upload'&&profile.avatarPath){
          url=allowedUrl(profile.avatarUrl);path=profile.avatarPath||'';
        }
      }
      if(!url){
        var directory=await c.from('atsrs_talent_profiles').select('avatar_url').eq('user_id',user.id).maybeSingle();
        if(!directory.error&&directory.data)url=allowedUrl(directory.data.avatar_url);
      }
      identityUrl=url;identityPath=path;identityUserId=user.id;
      if(url){
        var currentMetadata=metadataPhoto(user);
        if(currentMetadata.url!==url||currentMetadata.path!==path){
          try{await saveIdentityMetadata(url,path)}catch(error){console.warn('ATSRS identity photo metadata migration failed',error)}
        }
      }
      render(readProfile(),true);
      window.dispatchEvent(new CustomEvent('atsrs:identity-photo-hydrated',{detail:{url:url,path:path}}));
      return url;
    })();
    promise.userId=user.id;identityPromise=promise;
    try{return await promise}
    catch(error){console.warn('ATSRS identity photo could not be loaded',error);return ''}
    finally{if(identityPromise===promise)identityPromise=null}
  }
  function status(message,error){
    var el=byId('profilePhotoStatus');if(!el)return;
    el.textContent=message||'';el.classList.toggle('error',!!error);
  }
  function render(profile,skipHydrate){
    profile=profile||readProfile();
    var image=byId('profilePhotoImage'),letters=byId('profilePhotoInitials'),remove=byId('profilePhotoRemoveBtn'),url=resolvedUrl(profile);
    if(letters)letters.textContent=initials(profile);
    if(image){
      image.onload=function(){image.classList.remove('hidden');if(letters)letters.classList.add('hidden')};
      image.onerror=function(){image.classList.add('hidden');if(letters)letters.classList.remove('hidden')};
      if(url)image.src=url;else{image.removeAttribute('src');image.classList.add('hidden');if(letters)letters.classList.remove('hidden')}
    }
    if(remove)remove.classList.toggle('hidden',!(profile.avatarPath||identityPath));
    if(typeof window.atsrsWorkspaceSwitcherUpdate==='function')window.atsrsWorkspaceSwitcherUpdate();
    if(!skipHydrate)hydrateIdentityPhoto();
  }
  function ensureCropModal(){
    var modal=byId('profilePhotoCropModal');if(modal)return modal;
    modal=document.createElement('div');modal.id='profilePhotoCropModal';modal.className='profile-photo-crop-modal hidden';
    modal.innerHTML='<button type="button" class="profile-photo-crop-backdrop" aria-label="Cancel"></button>'+
      '<section class="profile-photo-crop-dialog" role="dialog" aria-modal="true" aria-labelledby="profilePhotoCropTitle">'+
      '<div class="profile-photo-crop-head"><div><span>PROFILE PHOTO</span><h3 id="profilePhotoCropTitle">Position and crop</h3></div><button type="button" class="secondary" data-crop-cancel aria-label="Close">&times;</button></div>'+
      '<p>Drag the photo to position your face. Use the slider to zoom.</p>'+
      '<div class="profile-photo-crop-stage"><canvas id="profilePhotoCropCanvas" width="512" height="512"></canvas></div>'+
      '<label class="profile-photo-zoom"><span>Zoom</span><input id="profilePhotoZoom" type="range" min="1" max="3" step=".01" value="1"></label>'+
      '<div class="profile-photo-crop-actions"><button type="button" class="secondary" data-crop-cancel>Cancel</button><button type="button" class="secondary" id="profilePhotoUseBtn">Use photo</button></div></section>';
    document.body.appendChild(modal);
    modal.querySelectorAll('[data-crop-cancel],.profile-photo-crop-backdrop').forEach(function(button){button.onclick=closeCrop});
    byId('profilePhotoZoom').addEventListener('input',function(){if(cropState){cropState.zoom=Number(this.value)||1;drawCrop()}});
    byId('profilePhotoUseBtn').onclick=uploadCropped;
    var canvas=byId('profilePhotoCropCanvas'),dragging=false,lastX=0,lastY=0;
    canvas.addEventListener('pointerdown',function(event){dragging=true;lastX=event.clientX;lastY=event.clientY;canvas.setPointerCapture(event.pointerId)});
    canvas.addEventListener('pointermove',function(event){
      if(!dragging||!cropState)return;
      var rect=canvas.getBoundingClientRect(),ratioX=canvas.width/Math.max(rect.width,1),ratioY=canvas.height/Math.max(rect.height,1);
      cropState.x+=(event.clientX-lastX)*ratioX;cropState.y+=(event.clientY-lastY)*ratioY;
      lastX=event.clientX;lastY=event.clientY;drawCrop();
    });
    canvas.addEventListener('pointerup',function(){dragging=false});
    return modal;
  }
  function drawCrop(){
    var canvas=byId('profilePhotoCropCanvas');if(!canvas||!cropState)return;
    var ctx=canvas.getContext('2d'),image=cropState.image,base=Math.max(512/image.width,512/image.height),scale=base*cropState.zoom;
    var width=image.width*scale,height=image.height*scale,maxX=Math.max(0,(width-512)/2),maxY=Math.max(0,(height-512)/2);
    cropState.x=Math.max(-maxX,Math.min(maxX,cropState.x));
    cropState.y=Math.max(-maxY,Math.min(maxY,cropState.y));
    var x=(512-width)/2+cropState.x,y=(512-height)/2+cropState.y;
    ctx.clearRect(0,0,512,512);ctx.fillStyle='#07131f';ctx.fillRect(0,0,512,512);ctx.drawImage(image,x,y,width,height);
  }
  function openCrop(file){
    if(!file)return;
    if(!/^image\/(jpeg|png|webp)$/i.test(file.type)){status('Choose a JPG, PNG or WebP image.',true);return}
    if(file.size>MAX_BYTES){status('The image must be smaller than 5 MB.',true);return}
    var image=new Image(),url=URL.createObjectURL(file);
    image.onload=function(){
      cropState={image:image,sourceUrl:url,x:0,y:0,zoom:1};
      ensureCropModal().classList.remove('hidden');document.body.classList.add('profile-photo-cropping');
      byId('profilePhotoZoom').value='1';drawCrop();
    };
    image.onerror=function(){URL.revokeObjectURL(url);status('This image could not be opened.',true)};
    image.src=url;
  }
  function closeCrop(){
    var modal=byId('profilePhotoCropModal');if(modal)modal.classList.add('hidden');
    document.body.classList.remove('profile-photo-cropping');
    if(cropState&&cropState.sourceUrl)URL.revokeObjectURL(cropState.sourceUrl);
    cropState=null;
    var input=byId('profilePhotoInput');if(input)input.value='';
  }
  function canvasBlob(){
    return new Promise(function(resolve){byId('profilePhotoCropCanvas').toBlob(resolve,'image/webp',.88)});
  }
  async function currentUser(){
    var c=client();if(!c)return null;
    var result=await c.auth.getUser();return result&&result.data&&result.data.user||null;
  }
  async function uploadCropped(){
    var button=byId('profilePhotoUseBtn');if(!cropState||!button)return;
    button.disabled=true;button.textContent='Saving...';status('');
    try{
      var c=client(),user=await currentUser(),blob=await canvasBlob();
      if(!c||!user||!blob)throw new Error('Your session is unavailable. Sign in again.');
      var path=user.id+'/avatar-'+Date.now()+'.webp';
      var uploaded=await c.storage.from(BUCKET).upload(path,blob,{contentType:'image/webp',cacheControl:'3600',upsert:false});
      if(uploaded.error)throw uploaded.error;
      var publicData=c.storage.from(BUCKET).getPublicUrl(path),url=publicData&&publicData.data&&publicData.data.publicUrl;
      if(!url)throw new Error('The profile photo URL could not be created.');
      var profile=readProfile(),oldPath=profile.avatarPath||'';
      profile.avatarUrl=url;profile.avatarPath=path;profile.avatarSource='upload';profile.updatedAt=new Date().toISOString();
      if(!writeProfile(profile))throw new Error('The profile photo could not be saved.');
      if(window.atsrsCloudData&&typeof window.atsrsCloudData.flush==='function'){
        var saved=await window.atsrsCloudData.flush();if(saved===false)throw new Error('The profile photo could not be saved to ATSRS.');
      }
      await saveIdentityMetadata(url,path);
      if(oldPath&&oldPath!==path)await c.storage.from(BUCKET).remove([oldPath]);
      identityUrl=url;identityPath=path;identityUserId=user.id;
      render(profile,true);closeCrop();setSummaryEditing(false);status('Profile photo saved.');
      window.dispatchEvent(new CustomEvent('atsrs:profile-photo-changed',{detail:{url:url,path:path}}));
    }catch(error){console.error('ATSRS profile photo save failed',error);status('The profile photo could not be saved. Check your connection and try again.',true)}
    finally{button.disabled=false;button.textContent='Use photo'}
  }
  async function removePhoto(){
    var button=byId('profilePhotoRemoveBtn'),profile=readProfile(),path=profile.avatarPath||identityPath||'';
    if(!path)return;
    button.disabled=true;status('Removing...');
    try{
      var c=client();if(c){var result=await c.storage.from(BUCKET).remove([path]);if(result.error)throw result.error}
      profile.avatarUrl='';profile.avatarPath='';profile.avatarSource='';profile.updatedAt=new Date().toISOString();
      if(!writeProfile(profile))throw new Error('The profile photo could not be removed.');
      if(window.atsrsCloudData&&typeof window.atsrsCloudData.flush==='function')await window.atsrsCloudData.flush();
      await saveIdentityMetadata('','');
      identityUrl='';identityPath='';identityUserId=(window.currentUser&&window.currentUser.id)||'';
      render(profile,true);status('Profile photo removed.');
      window.dispatchEvent(new CustomEvent('atsrs:profile-photo-changed',{detail:{url:'',path:''}}));
    }catch(error){console.error('ATSRS profile photo removal failed',error);status('The profile photo could not be removed. Check your connection and try again.',true)}
    finally{button.disabled=false}
  }
  function setSummaryEditing(editing){
    var wrap=byId('profileSummaryAvatarWrap');
    if(wrap)wrap.classList.toggle('is-editing',!!editing);
  }
  function bind(){
    var upload=byId('profilePhotoUploadBtn'),input=byId('profilePhotoInput'),remove=byId('profilePhotoRemoveBtn');
    var edit=byId('profileSummaryAvatarEditBtn'),camera=byId('profileSummaryAvatarCameraBtn'),confirm=byId('profileSummaryAvatarConfirmBtn'),cancel=byId('profileSummaryAvatarCancelBtn');
    if(!upload||upload.dataset.bound==='1')return;
    upload.dataset.bound='1';upload.onclick=function(){input.click()};
    if(edit)edit.onclick=function(){setSummaryEditing(true)};
    if(camera)camera.onclick=function(){input.click()};
    if(confirm)confirm.onclick=function(){input.click()};
    if(cancel)cancel.onclick=function(){setSummaryEditing(false)};
    input.onchange=function(){openCrop(input.files&&input.files[0])};remove.onclick=removePhoto;
    render();
  }
  window.atsrsProfilePhoto={render:render,hydrate:hydrateIdentityPhoto,currentUrl:function(){return resolvedUrl(readProfile())},initials:function(){return initials(readProfile())}};
  window.addEventListener('atsrs:data-hydrated',function(){render();hydrateIdentityPhoto(true)});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind);else bind();
  window.addEventListener('load',function(){bind();render()});
})();
