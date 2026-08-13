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

const outerRule = css.match(/body\.personal-mode #app\.app:not\(\.hidden\) > \.main::before\{([^}]*)\}/)?.[1];
assert.ok(outerRule, 'Personal Workspace outer pseudo-surface rule must exist');
assert.match(outerRule, /display:none!important/);
assert.doesNotMatch(outerRule, /(?:background|border|box-shadow):/);
assert.match(css, /> \.main > #pageTitle,[\s\S]*?> \.main > section/);
assert.match(css, /width:min\(100%,1440px\)/);
assert.doesNotMatch(css, /html\[data-theme="light"\] body\.personal-mode[^{}]*> \.main::before\s*\{/);
assert.match(css, /body\.personal-mode #refsPage > \.panel > #refsTitle,[\s\S]*?#accountTitle,[\s\S]*?atsrs-personal-legal-route[\s\S]*?display:none!important/);
assert.match(css, /#refsPage > \.panel > #refsSub,[\s\S]*?#userEmail[\s\S]*?margin-top:0/);
assert.match(css, /#certificatesPage > \.panel,[\s\S]*?#refsPage > \.panel,[\s\S]*?#profilePage > \.panel,[\s\S]*?background:transparent!important/);
assert.match(css, /#introPage \.updates-hero,[\s\S]*?#introPage \.roadmap-section[\s\S]*?background:transparent!important/);
assert.match(css, /--atsrs-personal-card-padding:var\(--atsrs-personal-space-4\)/);
assert.match(css, /--atsrs-personal-line-body:1\.5/);
assert.match(css, /#refsPage \.atsrs-v134-career-card\{[\s\S]*?height:auto!important[\s\S]*?min-height:0!important/);
assert.match(css, /#profilePage \.work-availability-grid > label,[\s\S]*?grid-template-rows:auto minmax\(44px,auto\)!important[\s\S]*?height:auto!important/);
assert.match(css, /#profileAvailabilityStatus\{[\s\S]*?padding-right:36px!important/);
assert.match(css, /@media\(max-width:800px\)[\s\S]*?width:calc\(100% - 16px\)/);
assert.match(css, /:where\(button,\[role="button"\],summary\)\{[\s\S]*?min-height:44px!important[\s\S]*?height:auto!important/);
assert.match(css, /:where\(select,textarea,input:not\(\[type="hidden"\]\):not\(\[type="checkbox"\]\):not\(\[type="radio"\]\)\)\{[\s\S]*?min-height:44px!important/);
assert.match(css, /#profilePage #accountGeneralTab #saveProfileBtn\{[\s\S]*?height:auto!important[\s\S]*?min-height:44px!important/);
assert.doesNotMatch(css, /body\.company-mode/);
assert.doesNotMatch(css, /linear-gradient|radial-gradient/);

assert.match(index, /href="css\/personal-workspace-surface\.css\?v=436"/);
assert.match(index, /href="css\/personal-dashboard-qa\.css\?v=450"/);
assert.match(index, /data-atsrs-build="V507"/);
assert.match(css, /body\.personal-mode #atsrsThemeToggle\{[\s\S]*?min-height:44px!important/);
assert.match(css, /body\.personal-mode #refsPage \.atsrs-v156-box-title\{[\s\S]*?line-height:1\.35!important[\s\S]*?overflow:visible!important/);

console.log('Personal Workspace shared surface contract tests passed');
