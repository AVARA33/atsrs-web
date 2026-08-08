const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const theme = fs.readFileSync(path.join(root, 'css', 'theme.css'), 'utf8');
const personal = fs.readFileSync(path.join(root, 'css', 'personal-workspace-surface.css'), 'utf8');
const sage = fs.readFileSync(path.join(root, 'js', 'sage-ledger.js'), 'utf8');

assert.match(index, /css\/personal-workspace-surface\.css\?v=446/, 'V446 auth isolation fix must bypass the production cache');
assert.match(index, /js\/sage-ledger\.js\?v=450/, 'Current auth header runtime must bypass the production cache');
assert.match(theme, /\.atsrs-theme-toggle\{[\s\S]*?height:28px!important;[\s\S]*?min-height:28px!important/, 'login theme slider must retain its intended 28px track');
assert.match(personal, /#app\.app:not\(\.hidden\) > \.main > #atsrsGlobalControls > #atsrsThemeToggle\{[\s\S]*?height:44px!important/, '44px touch sizing must remain available inside the open Personal app');
assert.match(personal, /#app\.app:not\(\.hidden\) > \.main > #atsrsGlobalControls > #atsrsThemeToggle \.atsrs-theme-thumb\{/, 'Personal thumb adjustment must remain scoped to the open app');
assert.doesNotMatch(personal, /body\.personal-mode #atsrsThemeToggle/, 'login controls must not inherit Personal app dimensions');
assert.doesNotMatch(index, /id="sageNotificationButton"/, 'login markup must not contain a notification button');
assert.match(sage, /var app=byId\('app'\),appVisible=!!\(app&&!app\.classList\.contains\('hidden'\)\)/, 'Sage icon replacement must know whether auth or the app is visible');
assert.match(sage, /if\(controls&&theme&&appVisible\)/, 'Sage icons must not replace the auth slider');
assert.match(sage, /restoreAuthThemeTrack\(theme\)/, 'the original sun, moon and thumb must be restored after logout');

console.log('Mobile login theme-toggle isolation contracts passed');
