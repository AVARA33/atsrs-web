const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');

test('summary avatar exposes an accessible edit and upload flow',()=>{
  const html=fs.readFileSync('index.html','utf8');
  const js=fs.readFileSync('js/avatar.js','utf8');
  const css=fs.readFileSync('css/profile-production-parity-v5878.css','utf8');
  for(const id of ['profileSummaryAvatarEditBtn','profileSummaryAvatarCameraBtn','profileSummaryAvatarConfirmBtn','profileSummaryAvatarCancelBtn']){
    assert.match(html,new RegExp(`id="${id}"`));
  }
  assert.match(html,/ph ph-pencil-simple/);
  assert.match(html,/ph ph-camera/);
  assert.match(js,/setSummaryEditing\(true\)/);
  assert.match(js,/camera\.onclick=function\(\)\{input\.click\(\)\}/);
  assert.match(js,/confirm\.onclick=function\(\)\{setSummaryEditing\(false\)\}/);
  assert.doesNotMatch(js,/confirm\.onclick=function\(\)\{input\.click\(\)\}/);
  assert.match(js,/cancel\.onclick=function\(\)\{setSummaryEditing\(false\)\}/);
  assert.ok(html.indexOf('profileSummaryAvatarCancelBtn')<html.indexOf('profileSummaryAvatarConfirmBtn'));
  assert.match(css,/\.profile-summary-avatar-actions \{[\s\S]*?inset: 0;[\s\S]*?pointer-events: none;/);
  assert.match(css,/\.profile-summary-avatar-edit \{[\s\S]*?left: -26px;[\s\S]*?right: auto;/);
  assert.match(css,/\.profile-summary-avatar-camera \{[\s\S]*?left: 50%;[\s\S]*?top: 50%;[\s\S]*?width: 44px;[\s\S]*?height: 44px;/);
  assert.match(css,/\.profile-summary-avatar-camera:hover \{[\s\S]*?translate\(-50%,-50%\) !important;/);
  assert.match(css,/#profileSummaryAvatarCancelBtn \{[\s\S]*?left: -32px;[\s\S]*?top: 78%;/);
  assert.match(css,/#profileSummaryAvatarConfirmBtn \{[\s\S]*?left: -26px;[\s\S]*?top: 94%;/);
  assert.match(css,/\.profile-summary-avatar-actions button \{[\s\S]*?width: 24px !important;[\s\S]*?border: 0 !important;/);
  assert.match(css,/#app#app\.app:not\(\.hidden\) #profilePage#profilePage #profileSummaryAvatarEditBtn,[\s\S]*?width: 24px !important;/);
  assert.doesNotMatch(css,/\.profile-summary-avatar-wrap\.is-editing \.profile-summary-avatar-edit \{ display:none; \}/);
  assert.match(css,/\.profile-summary-avatar-wrap\.is-editing \.profile-summary-avatar-camera \{ display:grid; \}/);
});
