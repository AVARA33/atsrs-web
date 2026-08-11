const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'css', 'personal-dashboard-qa.css'), 'utf8');
const storage = fs.readFileSync(path.join(root, 'js', 'storage.js'), 'utf8');
const shell = fs.readFileSync(path.join(root, 'js', 'shell-polish.js'), 'utf8');

assert.match(index, /solo-personnel-card expiry-summary-card corporate-personnel-summary-card/);
assert.match(index, /ph ph-users-three/);
assert.match(css, /body\.company-mode #dashboardPage \.stats-grid\{[\s\S]*?repeat\(7,minmax\(0,1fr\)\)/);
assert.match(css, /body\.company-mode #dashboardPage \.stats-grid > \.expiry-summary-expired\{[\s\S]*?grid-column:span 2/);
assert.match(css, /#sentRequestsPanel \.sent-request-grid\{[\s\S]*?grid-template-columns:1fr/);
assert.match(css, /#sentRequestsPanel \.access-panel-head > button\{[\s\S]*?margin-left:auto/);
assert.match(storage, /page==="profile"&&btn&&btn\.id==="navProfile"\)showAccountTab\("general"\)/);
assert.match(shell, /showPage\('profile',compliance\)[\s\S]*?showAccountTab\('security'\)/);

console.log('Corporate dashboard and Personal profile routing regression tests passed');
