const assert=require('node:assert/strict');
const fs=require('node:fs');

const html=fs.readFileSync('index.html','utf8');
const css=fs.readFileSync('css/profile-production-parity-v5878.css','utf8');

assert.match(html,/profile-production-parity-v5878\.css\?v=5988/);
assert.match(css,/Compact desktop security workspace: one clean frame, no nested scrolling/);
assert.match(css,/@media \(min-width:761px\) \{[\s\S]*?\.profile-settings-viewport\[data-active-tab="security"\] \{[\s\S]*?height:294px;[\s\S]*?min-height:294px;[\s\S]*?max-height:294px;[\s\S]*?overflow:hidden;/);
assert.match(css,/#profileTabSecurityPanel \{[\s\S]*?padding:10px 12px;[\s\S]*?overflow:hidden;[\s\S]*?scrollbar-gutter:auto;/);
assert.match(css,/\.profile-security-primary \{[\s\S]*?padding:0;[\s\S]*?border:0;[\s\S]*?background:transparent;/);
assert.match(css,/@media \(min-width:761px\) \{[\s\S]*?\.profile-security-primary \{[\s\S]*?width:100%;[\s\S]*?height:100%;[\s\S]*?min-height:0;/);
assert.match(css,/@media \(min-width:761px\) \{[\s\S]*?\.profile-security-verification \{[\s\S]*?grid-template-rows:auto minmax\(0,1fr\);[\s\S]*?height:100%;[\s\S]*?min-height:0;/);
assert.match(css,/\.profile-security-verification-flow > \.profile-security-grid \{[\s\S]*?gap:8px;[\s\S]*?padding:10px 12px;/);
assert.match(css,/\.profile-security-channel-grid > button \{[\s\S]*?height:34px;[\s\S]*?min-height:34px;/);

console.log('Compact profile security workspace contracts passed');
