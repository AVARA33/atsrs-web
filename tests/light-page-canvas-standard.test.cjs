const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const index = read('index.html');
const theme = read('css/theme.css');
const palette = read('css/theme-palette-v508.css');
const workspace = read('css/workspace-surface-standard-v519.css');
const themeRuntime = read('js/theme.js');

assert.match(index, /data-atsrs-build="V5848"/);
assert.match(index, /theme-palette-v508\.css\?v=5848/);
assert.match(index, /workspace-surface-standard-v519\.css\?v=5848/);
assert.match(index, /js\/theme\.js\?v=5848/);
assert.equal((theme.match(/--atsrs-light-page:#f6f8fb/g) || []).length, 1);
assert.match(theme, /--atsrs-bg:var\(--atsrs-light-page,#f6f8fb\)/);
assert.match(theme, /--v76-bg:var\(--atsrs-light-page,#f6f8fb\)/);
assert.match(theme, /html\[data-theme="light"\] body #app\{\s*background:var\(--atsrs-light-page\)!important/);
assert.doesNotMatch(theme, /linear-gradient\(180deg,var\(--atsrs-light-blue-soft\)/);
assert.match(palette, /--atsrs-ref-light-bg:var\(--atsrs-light-page,#f6f8fb\)/);
assert.match(palette, /body:where\(\.personal-mode,\.company-mode\).*?> \.main\{\s*background:var\(--atsrs-light-page,#f6f8fb\)!important/s);
assert.match(workspace, /data-theme="light"[\s\S]*?body:where\(\.personal-mode,\.company-mode\)[\s\S]*?#app\.app:not\(\.hidden\) > \.main/);
assert.match(workspace, /min-height:100dvh/);
assert.match(workspace, /background:var\(--atsrs-light-page,#f6f8fb\)!important/);

for (const page of [
  'dashboardPage', 'jobsPage', 'certificatesPage', 'refsPage', 'profilePage',
  'candidatesPage', 'personnelPage', 'projectsPage', 'compliancePage',
  'reportsPage', 'introPage', 'privacyPage', 'dataRightsPage'
]) assert.match(index, new RegExp(`id="${page}"`));

assert.match(index, /initialTheme==='light'\?'#f6f8fb':'#050606'/);
assert.match(index, /html\[data-theme="light"\]\{background:#f6f8fb\}/);
assert.match(index, /html\[data-theme="light"\] body\{background:#f6f8fb\}/);
assert.match(themeRuntime, /theme==='light'\?'#f6f8fb':'#050606'/);
console.log('V5848 shared light page canvas contracts passed');
