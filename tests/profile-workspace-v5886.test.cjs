const assert=require('node:assert/strict');
const fs=require('node:fs');
const html=fs.readFileSync('index.html','utf8');
const js=fs.readFileSync('js/profile-workspace-v5886.js','utf8');
const dashboard=fs.readFileSync('js/dashboard.js','utf8');
const css=fs.readFileSync('css/profile-production-parity-v5878.css','utf8');

['Personal','Privacy','Sharing','Security'].forEach(name=>{
  assert.match(html,new RegExp(`id="profileTab${name}Btn"[^>]+aria-controls="profileTab${name}Panel"`));
  assert.match(html,new RegExp(`id="profileTab${name}Panel"[^>]+role="tabpanel"[^>]+aria-labelledby="profileTab${name}Btn"`));
});
assert.doesNotMatch(html,/profileTab(?:Privacy|Sharing|Security)Btn[^>]+aria-disabled/);
assert.match(js,/event\.key==='ArrowRight'\|\|event\.key==='ArrowLeft'/);
assert.match(js,/Discard unsaved profile changes/);
assert.doesNotMatch(dashboard,/closest\('#profileSummaryEditBtn'\)[\s\S]{0,300}edit\.click\(\)/);
assert.match(dashboard,/window\.saveProfile=async function\(options\)/);
assert.match(dashboard,/window\.atsrsIdentityVerification/);
assert.doesNotMatch(dashboard,/identity\\s\*card\|id\\s\*card/);
assert.match(css,/\.profile-settings-viewport \{[\s\S]+height: 294px/);
assert.match(css,/\.profile-settings-panel\[hidden\] \{ display: none !important; \}/);
console.log('Personal Profile workspace V5886 contracts passed');
