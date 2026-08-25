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
  assert.match(js,/cancel\.onclick=function\(\)\{setSummaryEditing\(false\)\}/);
  assert.match(css,/\.profile-summary-avatar-wrap\.is-editing \.profile-summary-avatar-camera \{ display:grid; \}/);
});
