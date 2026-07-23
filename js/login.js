/* ATSRS V178 extracted JavaScript batch: login.js. Loaded in original V178 execution order. No placeholder code. */
/* ===== ATSRS V213 Cleanup =====
   The email/password register flow (V110-V115), the debug/standalone
   register fallback chain (V180-V185), and their duplicate login/register/
   validateUseMode/setUseMode overrides were removed. That whole flow had no
   reachable entry point once the Google-only login screen shipped (V208+):
   #registerBox/#forgotBox are never opened by any button, so window.login,
   window.register, window.validateUseMode and window.setUseMode were being
   reassigned by dead code on every DOMContentLoaded/load/setTimeout tick for
   no visible effect.

   One confirmed side effect of removing this: the V111 register-choice
   IIFE used to call personalModeBtn.onclick = ... / companyModeBtn.onclick =
   ... on its own repeating timer, which overwrote the live
   onclick handlers bound by js/storage.js (atsrsHandleAccountTypeChoice).
   Sign Up account-type step (js/storage.js, V212). Removing it also removes
   that override hazard on the live Google OAuth flow.

   Google OAuth (atsrsGoogleSignIn/atsrsPrepareSignUpChoice/
   atsrsHandleAccountTypeChoice/atsrsBackToLogin) lives entirely
   in js/storage.js and was not touched. */
(function(){
  'use strict';
  var BUILD_LABEL = 'ATSRS V301';
  var UPDATE_LABEL = 'Last Update: 23 Jul 2026';
  function lockBuildBadge(){
    var badge = document.getElementById('buildBadge') || document.querySelector('.build-badge');
    if(!badge) return;
    var rows = badge.querySelectorAll('div');
    if(rows.length >= 2){
      rows[0].textContent = BUILD_LABEL;
      rows[1].textContent = UPDATE_LABEL;
    }else{
      badge.innerHTML = '<div>'+BUILD_LABEL+'</div><div>'+UPDATE_LABEL+'</div>';
    }
  }
  lockBuildBadge();
  document.addEventListener('DOMContentLoaded', lockBuildBadge);
  window.addEventListener('load', lockBuildBadge);
  atsrsStableInterval(lockBuildBadge,250);
})();
