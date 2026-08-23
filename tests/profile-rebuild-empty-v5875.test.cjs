const fs = require('node:fs');
const assert = require('node:assert/strict');

const html = fs.readFileSync('index.html', 'utf8');
const css = fs.readFileSync('css/profile-rebuild-empty-v5875.css', 'utf8');

assert.match(html, /profile-rebuild-empty-v5875\.css\?v=5875/);
assert.match(html, /Manage your personal information and visibility settings\./);
assert.match(css, /body\.personal-mode #profilePage > \.panel > \.account-tabs/);
assert.match(css, /body\.personal-mode #profilePage > \.panel > \.account-tab/);
assert.match(css, /display:\s*none\s*!important/);
assert.doesNotMatch(css, /body\.corporate-mode/);

console.log('Personal Profile empty rebuild canvas contracts passed');
