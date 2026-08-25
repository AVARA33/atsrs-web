const assert=require('node:assert/strict');
const fs=require('node:fs');

const html=fs.readFileSync('index.html','utf8');
const workspace=fs.readFileSync('js/profile-workspace-v5886.js','utf8');

const panel=html.match(/<article id="profileTabPrivacyPanel"[\s\S]*?<\/article>/);
assert.ok(panel,'Privacy panel must remain available for the replacement design');
assert.match(panel[0],/id="profilePrivacyControls"/);
assert.doesNotMatch(panel[0],/<h4>Privacy<\/h4>/);
assert.doesNotMatch(workspace,/moveRow\('profileVisibility','profilePrivacyControls'\)/);
assert.doesNotMatch(workspace,/moveRow\('exportDataBtn','profilePrivacyControls'\)/);
assert.match(html,/js\/profile-workspace-v5886\.js\?v=5954/);

console.log('Profile Privacy replacement placeholder contracts passed');
