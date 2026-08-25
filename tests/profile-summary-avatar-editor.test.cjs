const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');

test('summary avatar exposes a camera-only upload flow',()=>{
  const html=fs.readFileSync('index.html','utf8');
  const js=fs.readFileSync('js/avatar.js','utf8');
  const css=fs.readFileSync('css/profile-production-parity-v5878.css','utf8');
  const theme=fs.readFileSync('css/theme.css','utf8');
  assert.match(html,/id="profileSummaryAvatarCameraBtn"/);
  assert.doesNotMatch(html,/profileSummaryAvatar(?:Edit|Confirm|Cancel)Btn/);
  assert.match(html,/ph ph-camera/);
  assert.match(js,/camera\.onclick=function\(\)\{input\.value='';input\.click\(\)\}/);
  assert.match(js,/summaryImage=byId\('profileSummaryAvatar'\)/);
  assert.match(js,/if\(url\)summaryImage\.src=url/);
  assert.doesNotMatch(js,/(?:edit|confirm|cancel)\.onclick/);
  assert.match(css,/\.profile-summary-avatar-camera \{[\s\S]*?right: -8px;[\s\S]*?bottom: 10px;[\s\S]*?width: 44px;[\s\S]*?height: 44px;[\s\S]*?display: grid;/);
  assert.match(css,/\.profile-summary-avatar-camera:hover \{[\s\S]*?transform: none !important;/);
  assert.match(css,/#profileSummaryAvatarCameraBtn \{[\s\S]*?background: transparent !important;[\s\S]*?color: #fff !important;[\s\S]*?box-shadow: none !important;/);
  assert.match(css,/html\[data-theme="light"\][\s\S]*?#profileSummaryAvatarCameraBtn i::before \{[\s\S]*?color: #fff !important;[\s\S]*?-webkit-text-fill-color: #fff !important;/);
  assert.match(css,/\.profile-summary-avatar-camera i \{[\s\S]*?-webkit-text-stroke: 1px rgba\(0,0,0,\.88\);[\s\S]*?paint-order: stroke fill;/);
  assert.doesNotMatch(css,/profile-summary-avatar-actions/);
  assert.doesNotMatch(css,/\.profile-summary-avatar-wrap\.is-editing/);
  assert.match(theme,/html\[data-theme="light"\] \.profile-photo-crop-modal\{[\s\S]*?background:transparent!important;/);
  assert.match(theme,/html\[data-theme="light"\] \.profile-photo-crop-backdrop\{[\s\S]*?background:rgba\(38,54,68,\.28\)!important;[\s\S]*?backdrop-filter:blur\(2px\)!important;/);
});
