const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const dashboard = fs.readFileSync(path.join(root, 'js', 'dashboard.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'css', 'profile-personal-information-v5874.css'), 'utf8');

assert.match(index, /profile-personal-information-v5874\.css\?v=5874/);
assert.match(index, /class="profile-personal-information-card personal-only"/);
assert.match(index, /id="personalInformationTitle">Personal Information<\/h4>/);
assert.match(index, /Manage your personal information and visibility settings\./);
assert.match(index, /id="editProfileBtn"[^>]*class="profile-compact-edit"/);
assert.match(index, /id="profileIdentityName"/);
assert.match(index, /id="profileIdentityRole"/);
assert.match(index, /id="profileIdentityEmail"/);
assert.match(css, /body\.personal-mode #profilePage \.profile-personal-information-card/);
assert.match(css, /max-width:1240px!important/);
assert.match(css, /#accountTabSecurityBtn\{display:none!important\}/);
assert.match(css, /\.work-availability-card,[\s\S]*?#adminOverviewPanel\{display:none!important\}/);
assert.match(css, /html\[data-theme="light"\] body\.personal-mode/);
assert.match(dashboard, /profileIdentityName/);
assert.match(dashboard, /profileIdentityWorkplace/);

console.log('Personal Profile stage 1 component contracts passed');
