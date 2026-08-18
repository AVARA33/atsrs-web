/* ATSRS unified authentication UI. Google remains provider-controlled. */
(function(){
  'use strict';
  var mode='signin',pendingEmail='',busy=false;
  function byId(id){return document.getElementById(id)}
  function hide(id){var el=byId(id);if(el)el.classList.add('hidden')}
  function show(id){var el=byId(id);if(el)el.classList.remove('hidden')}
  function message(value){var el=byId('loginMsg');if(el)el.textContent=value||''}
  function safeError(error,fallback){return typeof window.atsrsFriendlyAuthError==='function'?window.atsrsFriendlyAuthError(error,fallback):fallback}
  function redirectUrl(intent){var url=new URL('/',window.location.origin||'https://atsrs.com');url.searchParams.set('atsrs_intent',intent);url.searchParams.set('atsrs_method','email');return url.toString()}
  function setBusy(value,label){busy=!!value;var button=byId('authEmailSubmitBtn');if(button){button.disabled=busy;button.textContent=busy?(label||'Please wait…'):(mode==='signup'?'Create account':'Sign in')}}
  function panels(active){['authEntryPanel','authEmailPanel','authVerificationPanel','authNoWorkspacePanel','googleChoiceArea'].forEach(hide);if(active)show(active);message('')}
  function applyMode(next,keepEntry){
    mode=next==='signup'?'signup':'signin';
    var signIn=byId('googleSigninBtn'),signUp=byId('googleSignupBtn');
    if(signIn){signIn.classList.toggle('active',mode==='signin');signIn.setAttribute('aria-selected',mode==='signin'?'true':'false')}
    if(signUp){signUp.classList.toggle('active',mode==='signup');signUp.setAttribute('aria-selected',mode==='signup'?'true':'false')}
    var title=byId('authEntryTitle'),text=byId('authEntryText');
    if(title)title.textContent=mode==='signup'?'Create your ATSRS account':'Welcome back';
    if(text)text.textContent=mode==='signup'?'Verify your identity first. Your workspace is chosen afterwards.':'Sign in securely to continue to ATSRS.';
    var password=byId('authPassword');if(password)password.autocomplete=mode==='signup'?'new-password':'current-password';
    var hint=byId('authPasswordHint');if(hint)hint.classList.toggle('hidden',mode!=='signup');
    var forgot=byId('authForgotBtn');if(forgot)forgot.classList.toggle('hidden',mode==='signup');
    var swap=byId('authModeSwapBtn');if(swap)swap.textContent=mode==='signup'?'Already have an account? Sign in':"Don't have an account? Sign up";
    if(!keepEntry)panels('authEntryPanel');setBusy(false);
  }
  window.atsrsAuthTabClick=function(next,event){if(event)event.preventDefault();applyMode(next,false)};
  async function submitEmail(event){
    if(event)event.preventDefault();if(busy)return false;
    var email=(byId('authEmail')&&byId('authEmail').value||'').trim().toLowerCase(),password=byId('authPassword')&&byId('authPassword').value||'';message('');
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){message('Enter a valid email address.');return false}
    if(!password){message('Enter your password.');return false}
    if(mode==='signup'&&password.length<8){message('Use at least 8 characters for your password.');return false}
    if(!window.supabaseClient||!window.supabaseClient.auth){message('Authentication service is not ready. Please refresh and try again.');return false}
    try{
      setBusy(true,mode==='signup'?'Creating account…':'Signing in…');
      if(mode==='signup'){
        localStorage.setItem('atsrs_auth_intent','signup');
        var signup=await window.supabaseClient.auth.signUp({email:email,password:password,options:{emailRedirectTo:redirectUrl('signup'),data:{source:'atsrs-web',app:'ATSRS'}}});
        if(signup.error)throw signup.error;
        pendingEmail=email;localStorage.setItem('atsrs_pending_email',email);localStorage.setItem('atsrs_pending_verification','1');
        if(signup.data&&signup.data.session&&signup.data.user&&typeof window.atsrsBeginWorkspaceOnboarding==='function')return window.atsrsBeginWorkspaceOnboarding(signup.data.user);
        var copy=byId('authVerificationText');if(copy)copy.textContent='We sent a verification link to '+email+'. Open it to continue, then choose your workspace.';
        panels('authVerificationPanel');return true;
      }
      var login=await window.supabaseClient.auth.signInWithPassword({email:email,password:password});if(login.error)throw login.error;
      localStorage.setItem('atsrs_auth_intent','signin');
      if(login.data&&login.data.session&&typeof window.atsrsResumeSession==='function')await window.atsrsResumeSession(login.data.session,'signin');return true;
    }catch(error){
      var errorText=String(error&&error.message||'').toLowerCase();
      if(mode==='signin'&&/email.*not.*confirm/.test(errorText)){
        pendingEmail=email;localStorage.setItem('atsrs_pending_email',email);localStorage.setItem('atsrs_pending_verification','1');
        var verifyCopy=byId('authVerificationText');if(verifyCopy)verifyCopy.textContent='Verify '+email+' to continue. You can resend the verification email below.';
        panels('authVerificationPanel');return false;
      }
      message(safeError(error,mode==='signup'?'Account could not be created. Please try again.':'Email or password is incorrect.'));return false;
    }
    finally{setBusy(false)}
  }
  async function resend(){
    var email=pendingEmail||localStorage.getItem('atsrs_pending_email')||'';
    if(!email){message('Enter your email again to resend the verification link.');applyMode('signup',true);panels('authEmailPanel');return}
    try{var result=await window.supabaseClient.auth.resend({type:'signup',email:email,options:{emailRedirectTo:redirectUrl('signup')}});if(result.error)throw result.error;message('Verification email sent again. Check inbox and spam.')}
    catch(error){message(safeError(error,'Verification email could not be resent. Please wait and try again.'))}
  }
  async function forgot(){
    var email=(byId('authEmail')&&byId('authEmail').value||'').trim().toLowerCase();if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){message('Enter your email address first.');return}
    try{var result=await window.supabaseClient.auth.resetPasswordForEmail(email,{redirectTo:redirectUrl('recovery')});if(result.error)throw result.error;message('If an ATSRS account exists for this email, a password reset link has been sent.')}
    catch(error){message(safeError(error,'Password reset email could not be sent. Please try again.'))}
  }
  window.updatePassword=async function(){
    var first=byId('newPassword'),second=byId('newPassword2'),status=byId('newPassMsg');
    var password=first&&first.value||'',confirmation=second&&second.value||'';
    if(status)status.textContent='';
    if(password.length<8){if(status)status.textContent='Use at least 8 characters for your new password.';return false}
    if(password!==confirmation){if(status)status.textContent='Passwords do not match.';return false}
    try{
      var result=await window.supabaseClient.auth.updateUser({password:password});
      if(result.error)throw result.error;
      if(status)status.textContent='Password updated successfully.';
      return true;
    }catch(error){if(status)status.textContent=safeError(error,'Password could not be updated. Request a new recovery link and try again.');return false}
  };
  window.atsrsShowNoWorkspaceConfirmation=function(){panels('authNoWorkspacePanel')};
  window.atsrsShowUnifiedWorkspaceChoice=function(){panels('googleChoiceArea')};
  function bind(){
    var form=byId('authEmailPanel');if(form&&!form.dataset.bound){form.dataset.bound='1';form.addEventListener('submit',submitEmail)}
    var reveal=byId('authEmailRevealBtn');if(reveal&&!reveal.dataset.bound){reveal.dataset.bound='1';reveal.addEventListener('click',function(){panels('authEmailPanel');var email=byId('authEmail');if(email)email.focus()})}
    var google=byId('authGoogleBtn');if(google&&!google.dataset.bound){google.dataset.bound='1';google.addEventListener('click',function(event){if(mode==='signup'&&typeof window.atsrsStartGoogleSignUp==='function')window.atsrsStartGoogleSignUp(event);else if(typeof window.atsrsGoogleSignIn==='function')window.atsrsGoogleSignIn(event)})}
    var useGoogle=byId('authUseGoogleBtn');if(useGoogle&&!useGoogle.dataset.bound){useGoogle.dataset.bound='1';useGoogle.addEventListener('click',function(){panels('authEntryPanel')})}
    var toggle=byId('authPasswordToggle');if(toggle&&!toggle.dataset.bound){toggle.dataset.bound='1';toggle.addEventListener('click',function(){var input=byId('authPassword');if(!input)return;var visible=input.type==='password';input.type=visible?'text':'password';toggle.textContent=visible?'Hide':'Show';toggle.setAttribute('aria-label',visible?'Hide password':'Show password')})}
    var forgotButton=byId('authForgotBtn');if(forgotButton&&!forgotButton.dataset.bound){forgotButton.dataset.bound='1';forgotButton.addEventListener('click',forgot)}
    var resendButton=byId('authResendBtn');if(resendButton&&!resendButton.dataset.bound){resendButton.dataset.bound='1';resendButton.addEventListener('click',resend)}
    var verifyBack=byId('authVerificationBackBtn');if(verifyBack&&!verifyBack.dataset.bound){verifyBack.dataset.bound='1';verifyBack.addEventListener('click',function(){applyMode('signin',false)})}
    var changeEmail=byId('authChangeEmailBtn');if(changeEmail&&!changeEmail.dataset.bound){changeEmail.dataset.bound='1';changeEmail.addEventListener('click',function(){localStorage.removeItem('atsrs_pending_email');localStorage.removeItem('atsrs_pending_verification');pendingEmail='';applyMode('signup',true);panels('authEmailPanel');var email=byId('authEmail');if(email)email.focus()})}
    var swap=byId('authModeSwapBtn');if(swap&&!swap.dataset.bound){swap.dataset.bound='1';swap.addEventListener('click',function(){applyMode(mode==='signup'?'signin':'signup',true);panels('authEmailPanel')})}
    var create=byId('authCreateWorkspaceBtn');if(create&&!create.dataset.bound){create.dataset.bound='1';create.addEventListener('click',function(){if(typeof window.atsrsBeginWorkspaceOnboarding==='function')window.atsrsBeginWorkspaceOnboarding(window.currentUser)})}
    var another=byId('authUseAnotherBtn');if(another&&!another.dataset.bound){another.dataset.bound='1';another.addEventListener('click',async function(){try{await window.supabaseClient.auth.signOut({scope:'local'})}catch(e){}applyMode('signin',false)})}
    var params=new URLSearchParams(window.location.search),choiceContext=window.__atsrsAccountTypeChoiceContext||'';
    var localPreview=/^(127\.0\.0\.1|localhost)$/.test(window.location.hostname||'')?params.get('auth_preview'):'';
    if(localPreview==='workspace')panels('googleChoiceArea');
    else if(localPreview==='verification')panels('authVerificationPanel');
    else if(params.get('atsrs_method')==='email'&&params.get('atsrs_intent')==='signup'&&(params.has('error')||params.has('error_code'))){
      pendingEmail=localStorage.getItem('atsrs_pending_email')||'';
      var expiredCopy=byId('authVerificationText');if(expiredCopy)expiredCopy.textContent='This verification link is expired or invalid. Request a new verification email to continue.';
      panels('authVerificationPanel');message('Verification link expired.');
    }else if(choiceContext==='signup-recovery'||choiceContext==='signin-workspace')panels('googleChoiceArea');
    else if(localStorage.getItem('atsrs_pending_verification')==='1'){
      pendingEmail=localStorage.getItem('atsrs_pending_email')||'';
      var pendingCopy=byId('authVerificationText');if(pendingCopy)pendingCopy.textContent='Open the verification link sent to '+(pendingEmail||'your email address')+' to continue.';
      panels('authVerificationPanel');
    }
    else applyMode(params.get('view')==='signup'?'signup':'signin',false);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind);else bind();
})();
