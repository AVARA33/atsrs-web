/* ATSRS V261 - live Account security controls backed by Supabase Auth. */
(function(){
  'use strict';
  var client=null,user=null,mfaBlocking=false;
  function byId(id){return document.getElementById(id)}
  function safe(value){return String(value==null?'':value).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
  function getClient(){client=window.supabaseClient||client;return client}
  async function getUser(){
    var c=getClient();if(!c||!c.auth)return null;
    try{var result=await c.auth.getUser();user=result&&result.data&&result.data.user||null;return user}catch(e){return null}
  }
  function toast(message,kind){
    var old=byId('atsrsAccountToast');if(old)old.remove();
    var el=document.createElement('div');el.id='atsrsAccountToast';el.className='atsrs-account-toast '+(kind?'is-'+kind:'');el.textContent=message;document.body.appendChild(el);
    clearTimeout(window.__atsrsAccountToastTimer);window.__atsrsAccountToastTimer=setTimeout(function(){el.remove()},4200);
  }
  function ensureModal(){
    var modal=byId('atsrsSecurityModal');if(modal)return modal;
    modal=document.createElement('div');modal.id='atsrsSecurityModal';modal.className='atsrs-security-modal hidden';modal.innerHTML='<div class="atsrs-security-backdrop"></div><div class="atsrs-security-dialog" role="dialog" aria-modal="true"><button type="button" class="atsrs-security-close" aria-label="Close">&times;</button><div id="atsrsSecurityContent"></div></div>';
    document.body.appendChild(modal);
    modal.querySelector('.atsrs-security-close').onclick=closeModal;
    modal.querySelector('.atsrs-security-backdrop').onclick=function(){if(!mfaBlocking)closeModal()};
    return modal;
  }
  function openModal(html,blocking){var modal=ensureModal();mfaBlocking=!!blocking;modal.querySelector('.atsrs-security-close').classList.toggle('hidden',mfaBlocking);byId('atsrsSecurityContent').innerHTML=html;modal.classList.remove('hidden')}
  function closeModal(){if(mfaBlocking)return;var modal=byId('atsrsSecurityModal');if(modal)modal.classList.add('hidden')}
  function message(text,kind){var el=byId('atsrsSecurityMessage');if(!el)return;el.textContent=text||'';el.className='atsrs-security-message'+(kind?' is-'+kind:'')}
  function busy(button,on,label){if(!button)return;if(on){button.dataset.oldText=button.textContent;button.textContent=label||'Working...';button.disabled=true}else{button.textContent=button.dataset.oldText||button.textContent;button.disabled=false}}
  function formatOffset(zone){
    try{
      var part=new Intl.DateTimeFormat('en',{timeZone:zone,timeZoneName:'longOffset'}).formatToParts(new Date()).find(function(p){return p.type==='timeZoneName'});
      var raw=part&&part.value||'GMT';if(raw==='GMT')return 'UTC+0';
      var match=raw.match(/GMT([+-])(\d{2})(?::(\d{2}))?/);if(!match)return raw.replace('GMT','UTC');
      var hours=String(Number(match[2]));var minutes=match[3]&&match[3]!=='00'?':'+match[3]:'';return 'UTC'+match[1]+hours+minutes;
    }catch(e){return 'UTC'}
  }
  function decorateTimezones(){
    var select=byId('profileTimezone');if(!select)return;
    Array.prototype.forEach.call(select.options,function(option){var label=option.value==='Europe/Baku'?'Asia/Baku':option.value;if(option.value==='Europe/Baku')option.value='Asia/Baku';option.textContent=label+' ('+formatOffset(option.value)+')'});
    var notify=byId('atsrsNotificationTimezone');if(notify)Array.prototype.forEach.call(notify.options,function(option){option.textContent=option.value+' ('+formatOffset(option.value)+')'});
  }
  async function persistProfile(){if(typeof window.saveProfile==='function')return await window.saveProfile();return false}
  async function saveRecovery(){
    var input=byId('profileAltEmail'),button=byId('saveRecoveryEmailBtn');var email=(input&&input.value||'').trim();
    if(email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){toast('Enter a valid recovery email.','error');return}
    busy(button,true,'Saving...');
    try{
      var c=getClient(),u=await getUser();if(!c||!u)throw new Error('Sign in again to save this setting.');
      var metadata=Object.assign({},u.user_metadata||{}, {recovery_email:email||null});var result=await c.auth.updateUser({data:metadata});if(result.error)throw result.error;
      var saved=await persistProfile();if(saved===false)throw new Error('The profile server could not save this change.');
      toast('Recovery email saved.','ok');
    }catch(e){toast(e.message||'Recovery email could not be saved.','error')}finally{busy(button,false)}
  }
  async function verifiedTotp(){var result=await getClient().auth.mfa.listFactors();if(result.error)throw result.error;var factors=result.data&&result.data.totp||[];return factors.filter(function(f){return f.status==='verified'})}
  async function openMfa(){
    try{
      var factors=await verifiedTotp();if(factors.length){
        openModal('<h3>Two-factor authentication</h3><p>Authenticator protection is active for this account.</p><div class="atsrs-session-card"><b>Authenticator app</b><span>Verified and required when Supabase requests the second authentication level.</span></div><div class="atsrs-security-actions"><button type="button" class="secondary" id="atsrsCancelSecurity">Close</button><button type="button" class="action" id="atsrsRemoveMfa">Remove authenticator</button></div><p id="atsrsSecurityMessage" class="atsrs-security-message"></p>');
        byId('atsrsCancelSecurity').onclick=closeModal;byId('atsrsRemoveMfa').onclick=function(){removeMfa(factors[0].id)};return;
      }
      var enroll=await getClient().auth.mfa.enroll({factorType:'totp',friendlyName:'ATSRS Authenticator'});if(enroll.error)throw enroll.error;var data=enroll.data;
      openModal('<h3>Set up authenticator</h3><p>Scan this QR code with Google Authenticator, Microsoft Authenticator or another TOTP app. Then enter the six-digit code.</p><img class="atsrs-mfa-qr" alt="Authenticator QR code" src="'+safe(data.totp.qr_code)+'"><div class="atsrs-mfa-secret">'+safe(data.totp.secret)+'</div><div class="atsrs-security-form"><label>Six-digit code<input id="atsrsMfaCode" inputmode="numeric" autocomplete="one-time-code" maxlength="6"></label><div class="atsrs-security-actions"><button type="button" class="secondary" id="atsrsCancelMfa">Cancel</button><button type="button" id="atsrsVerifyMfa">Verify and enable</button></div><p id="atsrsSecurityMessage" class="atsrs-security-message"></p></div>');
      byId('atsrsCancelMfa').onclick=async function(){try{await getClient().auth.mfa.unenroll({factorId:data.id})}catch(e){}mfaBlocking=false;closeModal()};byId('atsrsVerifyMfa').onclick=function(){verifyMfa(data.id)};
    }catch(e){toast(e.message||'Authenticator setup could not start.','error')}
  }
  async function verifyMfa(factorId){
    var code=(byId('atsrsMfaCode').value||'').replace(/\D/g,''),button=byId('atsrsVerifyMfa');if(code.length!==6){message('Enter the six-digit code.','error');return}
    busy(button,true,'Verifying...');try{var challenge=await getClient().auth.mfa.challenge({factorId:factorId});if(challenge.error)throw challenge.error;var verified=await getClient().auth.mfa.verify({factorId:factorId,challengeId:challenge.data.id,code:code});if(verified.error)throw verified.error;message('Two-factor authentication is enabled.','ok');toast('Authenticator enabled.','ok')}catch(e){message(e.message||'The code could not be verified.','error')}finally{busy(button,false)}
  }
  async function removeMfa(factorId){var button=byId('atsrsRemoveMfa');busy(button,true,'Removing...');try{var result=await getClient().auth.mfa.unenroll({factorId:factorId});if(result.error)throw result.error;message('Authenticator removed.','ok');toast('Two-factor authentication removed.','ok')}catch(e){message(e.message||'Authenticator could not be removed. Sign in with your second factor first.','error')}finally{busy(button,false)}}
  async function openSessions(){
    try{var c=getClient(),sessionResult=await c.auth.getSession(),session=sessionResult.data&&sessionResult.data.session,u=await getUser();var expiry=session&&session.expires_at?new Date(session.expires_at*1000).toLocaleString():'Unknown';
      openModal('<h3>Active sessions</h3><p>Supabase does not expose a full device list to the browser. You can review this session and securely close every other session.</p><div class="atsrs-session-card"><b>This browser</b><span>'+safe(u&&u.email||'Signed-in account')+'</span><span>Session expires: '+safe(expiry)+'</span></div><div class="atsrs-security-actions"><button type="button" class="secondary" id="atsrsCancelSecurity">Close</button><button type="button" id="atsrsSignOutOthers">Sign out other devices</button></div><p id="atsrsSecurityMessage" class="atsrs-security-message"></p>');
      byId('atsrsCancelSecurity').onclick=closeModal;byId('atsrsSignOutOthers').onclick=signOutOthers;
    }catch(e){toast(e.message||'Session information could not be loaded.','error')}
  }
  async function signOutOthers(){var button=byId('atsrsSignOutOthers');busy(button,true,'Signing out...');try{var result=await getClient().auth.signOut({scope:'others'});if(result.error)throw result.error;message('All other sessions were signed out. This browser remains active.','ok')}catch(e){message(e.message||'Other sessions could not be closed.','error')}finally{busy(button,false)}}
  function openDeleteAccount(){
    openModal('<h3>Delete account permanently</h3><p>This removes your ATSRS account and server data. This action cannot be undone.</p><div class="atsrs-security-form"><label>Type your account email to confirm<input id="atsrsDeleteEmail" type="email" autocomplete="off"></label><label class="atsrs-security-consent"><input id="atsrsDeleteConsent" type="checkbox"><span>I understand that my account, documents and access links will be permanently deleted.</span></label><div class="atsrs-security-actions"><button type="button" class="secondary" id="atsrsCancelSecurity">Cancel</button><button type="button" class="action" id="atsrsConfirmDelete">Delete permanently</button></div><p id="atsrsSecurityMessage" class="atsrs-security-message"></p></div>');
    byId('atsrsCancelSecurity').onclick=closeModal;byId('atsrsConfirmDelete').onclick=deleteAccount;
  }
  async function deleteAccount(){
    var u=await getUser(),email=(byId('atsrsDeleteEmail').value||'').trim().toLowerCase(),button=byId('atsrsConfirmDelete');if(!u||email!==String(u.email||'').toLowerCase()){message('Enter the exact email address of this account.','error');return}if(!byId('atsrsDeleteConsent').checked){message('Confirm that you understand the permanent deletion.','error');return}
    busy(button,true,'Deleting...');try{var result=await getClient().functions.invoke('delete-account',{body:{email:email,confirmation:'DELETE MY ATSRS ACCOUNT'}});if(result.error)throw result.error;if(!result.data||result.data.deleted!==true)throw new Error(result.data&&result.data.error||'Deletion was not confirmed by the server.');try{localStorage.clear()}catch(e){}location.reload()}catch(e){message(e.message||'Account deletion could not be completed.','error');busy(button,false)}
  }
  async function enforceMfa(){
    var c=getClient();if(!c||!c.auth||!c.auth.mfa)return;
    try{var aal=await c.auth.mfa.getAuthenticatorAssuranceLevel();if(aal.error)return;var data=aal.data||{};if(data.currentLevel!=='aal1'||data.nextLevel!=='aal2')return;var factors=await verifiedTotp();if(!factors.length)return;var factor=factors[0];var challenge=await c.auth.mfa.challenge({factorId:factor.id});if(challenge.error)throw challenge.error;
      openModal('<h3>Authenticator verification</h3><p>Enter the six-digit code from your authenticator app to continue to ATSRS.</p><div class="atsrs-security-form"><label>Six-digit code<input id="atsrsMfaLoginCode" inputmode="numeric" autocomplete="one-time-code" maxlength="6"></label><div class="atsrs-security-actions"><button type="button" id="atsrsVerifyMfaLogin">Verify</button></div><p id="atsrsSecurityMessage" class="atsrs-security-message"></p></div>',true);
      byId('atsrsVerifyMfaLogin').onclick=async function(){var code=(byId('atsrsMfaLoginCode').value||'').replace(/\D/g,''),button=byId('atsrsVerifyMfaLogin');if(code.length!==6){message('Enter the six-digit code.','error');return}busy(button,true,'Verifying...');var result=await c.auth.mfa.verify({factorId:factor.id,challengeId:challenge.data.id,code:code});if(result.error){message(result.error.message,'error');busy(button,false);return}mfaBlocking=false;closeModal();toast('Identity verified.','ok')};
    }catch(e){console.warn('ATSRS MFA check failed',e)}
  }
  function bind(){
    decorateTimezones();
    var recovery=byId('saveRecoveryEmailBtn');if(recovery)recovery.onclick=saveRecovery;
    var mfa=byId('setup2faBtn');if(mfa){mfa.removeAttribute('onclick');mfa.onclick=openMfa}
    var sessions=byId('viewSessionsBtn');if(sessions){sessions.removeAttribute('onclick');sessions.onclick=openSessions}
    var del=byId('deleteAccountBtn');if(del){del.removeAttribute('onclick');del.onclick=openDeleteAccount}
    var timezone=byId('profileTimezone');if(timezone)timezone.addEventListener('change',async function(){decorateTimezones();var saved=await persistProfile();toast(saved===false?'Timezone could not be saved.':'Timezone saved as '+timezone.options[timezone.selectedIndex].textContent,saved===false?'error':'ok')});
    var visibility=byId('profileVisibility');if(visibility)visibility.addEventListener('change',async function(){var saved=await persistProfile();toast(saved===false?'Profile visibility could not be saved.':'Profile visibility saved.',saved===false?'error':'ok')});
  }
  function boot(){bind();setTimeout(decorateTimezones,400);setTimeout(decorateTimezones,1200);setTimeout(enforceMfa,900);window.addEventListener('atsrs:resume',function(){decorateTimezones();enforceMfa()})}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
