const assert=require('node:assert/strict');
const fs=require('node:fs');

const html=fs.readFileSync('index.html','utf8');
const css=fs.readFileSync('css/profile-production-parity-v5878.css','utf8');

assert.match(html,/profile-production-parity-v5878\.css\?v=5990/);
assert.match(css,/Compact desktop security workspace: one clean frame, no nested scrolling/);
assert.match(css,/@media \(min-width:761px\) \{[\s\S]*?\.profile-settings-viewport\[data-active-tab="security"\] \{[\s\S]*?height:294px;[\s\S]*?min-height:294px;[\s\S]*?max-height:294px;[\s\S]*?overflow:hidden;/);
assert.match(css,/#profileTabSecurityPanel \{[\s\S]*?padding:10px 12px;[\s\S]*?overflow:hidden;[\s\S]*?scrollbar-gutter:auto;/);
assert.match(css,/\.profile-security-primary \{[\s\S]*?padding:0;[\s\S]*?border:0;[\s\S]*?background:transparent;/);
assert.match(css,/@media \(min-width:761px\) \{[\s\S]*?\.profile-security-primary \{[\s\S]*?width:100%;[\s\S]*?height:100%;[\s\S]*?min-height:0;/);
assert.match(css,/@media \(min-width:761px\) \{[\s\S]*?\.profile-security-verification \{[\s\S]*?grid-template-rows:auto minmax\(0,1fr\);[\s\S]*?height:100%;[\s\S]*?min-height:0;/);
assert.match(css,/\.profile-security-verification-flow > \.profile-security-grid \{[\s\S]*?grid-column:1\/-1;[\s\S]*?grid-template-columns:repeat\(3,minmax\(0,1fr\)\);[\s\S]*?border-top:1px solid var\(--line\);/);
assert.match(css,/\.profile-security-channel-grid > button \{[\s\S]*?height:31px;[\s\S]*?min-height:31px;/);
assert.match(html,/profile-security-step-channel[\s\S]*?>Choose channel</);
assert.match(html,/profile-security-step-send[\s\S]*?>Send code</);
assert.match(html,/id="profileSecurityVerificationResult"[\s\S]*?>Verified status</);
assert.match(css,/\.profile-security-verification-flow \{[\s\S]*?grid-template-columns:repeat\(3,minmax\(0,1fr\)\);[\s\S]*?grid-template-rows:minmax\(0,1fr\) 62px;/);
assert.match(css,/html\[data-theme="dark"\][\s\S]*?\.profile-security-channel-grid > button\.is-selected \{[\s\S]*?background:#0c120f !important;/);
assert.match(css,/\.profile-security-channel-grid > button\.is-selected::after \{[\s\S]*?height:2px;[\s\S]*?background:var\(--profile-security-accent\);/);
assert.match(css,/\.profile-security-saved-contact strong \{[\s\S]*?font-size:12px;/);
assert.match(css,/#profileSecurityEditContact \{[\s\S]*?width:20px;[\s\S]*?margin-left:auto;/);

console.log('Compact profile security workspace contracts passed');
