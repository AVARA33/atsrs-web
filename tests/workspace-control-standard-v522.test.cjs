const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'css', 'workspace-control-standard-v522.css'), 'utf8');

assert.match(index, /data-atsrs-build="V5848"/);
assert.match(index, /workspace-control-standard-v522\.css\?v=58159/);
assert.match(css, /--atsrs-control-surface:var\(--atsrs-ref-dark-surface,#0b0d0d\)/);
assert.match(css, /#profilePage \.account-tabs button\[aria-selected="true"\]/);
assert.match(css, /background:var\(--atsrs-control-accent\)!important/);
assert.match(css, /#profilePage#profilePage \.account-tabs button\.active,[\s\S]*?background:var\(--atsrs-control-surface\)!important;[\s\S]*?color:var\(--atsrs-control-accent\)!important;[\s\S]*?box-shadow:0 0 0 3px rgba\(34,197,94,\.15\)!important/);
assert.match(css, /html:has\(body:where\(\.personal-mode,\.company-mode\) #app\.app:not\(\.hidden\) #profilePage:not\(\.hidden\)\)\{[\s\S]*?scrollbar-gutter:stable/);
assert.match(css, /body:where\(\.personal-mode,\.company-mode\) #app#app\.app:not\(\.hidden\) #profilePage#profilePage \.account-tabs button\{[\s\S]*?font-weight:800!important/);
assert.match(index, /id="editProfileBtn" type="button">Edit profile<\/button>/);
assert.match(index, /id="saveProfileBtn"[^>]*hidden>Save profile<\/button>/);
assert.match(css, /#accountGeneralTab\[data-profile-editing="false"\][\s\S]*?:disabled\{[\s\S]*?opacity:1!important/);
assert.match(css, /:not\(\.active\)[\s\S]*:hover/);
assert.match(css, /#accountGeneralTab \.profile-contact-row \.phone-field/);
assert.match(css, /#profilePage \.access-request-card/);
assert.match(css, /\.workspace-switcher-button/);
const lightThemeRules = css.match(/html\[data-theme="light"\][^{]+\{/g) || [];
assert.deepEqual(lightThemeRules, [
  'html[data-theme="light"] body.personal-mode #app#app.app:not(.hidden) #profilePage#profilePage #editProfileBtn{'
]);

console.log('V522 Dark selectable control and account field contracts passed');
