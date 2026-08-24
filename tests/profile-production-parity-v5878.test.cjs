const assert=require('node:assert/strict');
const fs=require('node:fs');

const index=fs.readFileSync('index.html','utf8');
const css=fs.readFileSync('css/profile-production-parity-v5878.css','utf8');
const dashboard=fs.readFileSync('js/dashboard.js','utf8');
const storage=fs.readFileSync('js/storage.js','utf8');

assert.match(index,/data-atsrs-build="V5878" data-atsrs-update="24 Aug 2026"/);
assert.match(index,/profile-production-parity-v5878\.css\?v=5896/);
assert.match(index,/dashboard\.js\?v=426/);
assert.match(index,/corporate-remediation\.js\?v=481/);
assert.match(index,/id="cancelProfileBtn"[^>]*hidden>Cancel<\/button>/);
assert.equal((index.match(/data-profile-stage-edit=/g)||[]).length,2);

assert.match(css,/#profilePage > \.panel \{[\s\S]*?padding: 0 !important;[\s\S]*?border: 0 !important;[\s\S]*?background: transparent !important;/);
assert.match(css,/#profilePage > \.panel \{[\s\S]*?width: 100% !important;[\s\S]*?max-width: 1440px !important;/);
assert.match(css,/html\[data-theme="dark"\][\s\S]*?#accountTitle \{[\s\S]*?color: #f4f6ef !important;[\s\S]*?-webkit-text-fill-color: #f4f6ef !important;/);
assert.match(css,/\.profile-summary-stage \*,[\s\S]*?box-sizing: content-box;/);
assert.match(css,/\.profile-information-tabs button \{[\s\S]*?width: auto !important;[\s\S]*?min-height: 42px !important;[\s\S]*?margin: 0 !important;/);
assert.match(css,/\.profile-calendar-nav button \{[\s\S]*?width: 32px !important;[\s\S]*?height: 32px !important;/);
assert.match(css,/\.profile-summary-card,[\s\S]*?\.profile-account-status[\s\S]*?box-shadow: none !important;/);
assert.match(css,/\.profile-information-contact button \{[\s\S]*?width: 24px !important;[\s\S]*?height: 24px !important;/);
assert.doesNotMatch(css,/#profilePage\.profile-editing > \.panel > \.profile-summary-stage/);
assert.match(css,/\.profile-settings-viewport/);
assert.match(css,/data-atsrs-account-route="profile"[\s\S]*?#pageTitle/);
assert.match(css,/\.profile-summary-role, \.profile-summary-verified\) \{[\s\S]*?white-space: nowrap;/);
assert.match(css,/@media \(max-width: 1180px\) \{[\s\S]*?\.profile-summary-stage \{[\s\S]*?grid-template-columns: 1fr;/);

assert.match(dashboard,/page\.classList\.toggle\('profile-editing',editing\)/);
assert.match(dashboard,/cancelButton\.addEventListener\('click',function\(\)\{/);
assert.match(dashboard,/updateProfileSummary\(data\);\s*updateProfileStage\(data\);/);
assert.match(dashboard,/classList\.contains\('personal-mode'\)\)accountTitle\.textContent='Profile'/);
assert.doesNotMatch(dashboard,/classList\.contains\('personal-mode'\)\)setText\(/);
assert.match(storage,/txt\("accountTitle",isPersonalMode\(\)\?"Profile":ptr\("account"\)\)/);
assert.match(fs.readFileSync('js/corporate-remediation.js','utf8'),/corporate\?'Corporate Account':'Profile'/);

console.log('Personal Profile production parity contracts passed');
assert.match(css,/body\.personal-mode #app\.app:not\(\.hidden\) \.sidebar \.nav #navCompliance\{display:none!important\}/);
assert.match(storage,/personal&&\(page==="compliance"\|\|page==="security"\)\)\{page="profile";btn=navProfile;\}/);
assert.match(storage,/showAccountTab\("general"\)/);
