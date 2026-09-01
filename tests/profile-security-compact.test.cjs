const assert=require('node:assert/strict');
const fs=require('node:fs');

const html=fs.readFileSync('index.html','utf8');
const css=fs.readFileSync('css/profile-production-parity-v5878.css','utf8');

assert.match(html,/profile-production-parity-v5878\.css\?v=5987/);
assert.match(css,/Compact desktop security workspace: one clean frame, no nested scrolling/);
assert.match(css,/@media \(min-width:761px\) \{[\s\S]*?\.profile-settings-viewport\[data-active-tab="security"\] \{[\s\S]*?height:234px;[\s\S]*?overflow:hidden;/);
assert.match(css,/#profileTabSecurityPanel \{[\s\S]*?padding:10px 12px;[\s\S]*?overflow:hidden;[\s\S]*?scrollbar-gutter:auto;/);
assert.match(css,/\.profile-security-primary \{[\s\S]*?padding:0;[\s\S]*?border:0;[\s\S]*?background:transparent;/);
assert.match(css,/\.profile-security-verification-flow > \.profile-security-grid \{[\s\S]*?gap:8px;[\s\S]*?padding:10px 12px;/);
assert.match(css,/\.profile-security-channel-grid > button \{[\s\S]*?height:34px;[\s\S]*?min-height:34px;/);

console.log('Compact profile security workspace contracts passed');
