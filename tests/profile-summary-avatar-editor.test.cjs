const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');

test('summary avatar exposes a camera-only upload flow',()=>{
  const html=fs.readFileSync('index.html','utf8');
  const js=fs.readFileSync('js/avatar.js','utf8');
  const css=fs.readFileSync('css/profile-production-parity-v5878.css','utf8');
  assert.match(html,/id="profileSummaryAvatarCameraBtn"/);
  assert.doesNotMatch(html,/profileSummaryAvatar(?:Edit|Confirm|Cancel)Btn/);
  assert.match(html,/ph ph-camera/);
  assert.match(js,/camera\.onclick=function\(\)\{input\.click\(\)\}/);
  assert.doesNotMatch(js,/(?:edit|confirm|cancel)\.onclick/);
  assert.match(css,/\.profile-summary-avatar-camera \{[\s\S]*?right: -8px;[\s\S]*?bottom: 10px;[\s\S]*?width: 44px;[\s\S]*?height: 44px;[\s\S]*?display: grid;/);
  assert.match(css,/\.profile-summary-avatar-camera:hover \{[\s\S]*?transform: none !important;/);
  assert.doesNotMatch(css,/profile-summary-avatar-actions/);
  assert.doesNotMatch(css,/\.profile-summary-avatar-wrap\.is-editing/);
});
