const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'css', 'personal-workspace-surface.css'), 'utf8');

for (const page of [
  'dashboardPage',
  'certificatesPage',
  'refsPage',
  'profilePage',
  'introPage',
  'privacyPage',
  'dataRightsPage'
]) {
  assert.match(index, new RegExp(`<section id="${page}"`), `${page} must remain a routed section`);
}

assert.match(css, /body\.personal-mode #app\.app:not\(\.hidden\) > \.main::before/);
assert.match(css, /background:var\(--atsrs-panel2,#0b1825\)/);
assert.match(css, /border:1px solid var\(--atsrs-border,#264058\)/);
assert.match(css, /border-radius:20px/);
assert.match(css, /box-shadow:0 18px 48px rgba\(0,0,0,\.22\)/);
assert.match(css, /> \.main > #pageTitle,[\s\S]*?> \.main > section/);
assert.match(css, /width:min\(100%,1440px\)/);
assert.match(css, /html\[data-theme="light"\] body\.personal-mode[\s\S]*?background:#f8fafc/);
assert.match(css, /body\.personal-mode #refsPage > \.panel > #refsTitle,[\s\S]*?#accountTitle,[\s\S]*?atsrs-personal-legal-route[\s\S]*?display:none!important/);
assert.match(css, /#refsPage > \.panel > #refsSub,[\s\S]*?#userEmail[\s\S]*?margin-top:0/);
assert.match(css, /@media\(max-width:800px\)[\s\S]*?width:calc\(100% - 16px\)/);
assert.match(css, /@media\(max-width:720px\)[\s\S]*?:is\([\s\S]*?#profilePage[\s\S]*?\) :where\(button,\[role="button"\],summary\)[\s\S]*?height:auto!important[\s\S]*?min-height:44px!important/);
assert.match(css, /:where\(select,textarea,input:not\(\[type="hidden"\]\):not\(\[type="checkbox"\]\):not\(\[type="radio"\]\)\)\{[\s\S]*?min-height:44px!important/);
assert.match(css, /#profilePage #accountGeneralTab #saveProfileBtn\{[\s\S]*?height:auto!important[\s\S]*?min-height:44px!important/);
assert.doesNotMatch(css, /body\.company-mode/);
assert.doesNotMatch(css, /linear-gradient|radial-gradient/);

assert.match(index, /href="css\/personal-workspace-surface\.css\?v=429"/);
assert.match(index, /data-atsrs-build="V429"/);

console.log('Personal Workspace shared surface contract tests passed');
