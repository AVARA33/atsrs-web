const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'css', 'workspace-surface-standard-v519.css'), 'utf8');
const talent = fs.readFileSync(path.join(root, 'js', 'talent-directory.js'), 'utf8');
const reporting = fs.readFileSync(path.join(root, 'js', 'corporate-reporting.js'), 'utf8');

assert.match(index, /data-atsrs-build="V533"/);
assert.match(index, /workspace-surface-standard-v519\.css\?v=519/);
assert.match(index, /talent-directory\.js\?v=519/);
assert.match(index, /corporate-reporting\.js\?v=519/);

assert.match(css, /--atsrs-workspace-surface:var\(--atsrs-ref-dark-surface,#0b0d0d\)/);
assert.match(css, /--atsrs-personal-functional-surface:var\(--atsrs-workspace-surface\)/);
assert.match(css, /#app\.app:not\(\.hidden\) > \.main\{[\s\S]*?min-height:100dvh/);
assert.match(css, /\.project-workspace-card/);
assert.match(css, /\.corporate-summary-card/);
assert.match(css, /\.corporate-compliance-card/);
assert.match(css, /\.cv-main-panel/);
assert.match(css, /\.phone-field/);
assert.match(css, /\.linked-personnel-table\{[\s\S]*?min-width:0!important/);
assert.match(css, /\.corporate-report-table\{[\s\S]*?table-layout:fixed/);
assert.match(css, /@media\(max-width:1100px\)[\s\S]*?\.linked-personnel-row:not\(\.is-head\)/);
assert.match(css, /@media\(max-width:760px\)[\s\S]*?\.corporate-report-table td::before/);
assert.match(css, /@media\(max-width:560px\)[\s\S]*?body\.company-mode[\s\S]*?repeat\(2,minmax\(0,1fr\)\)/);
assert.match(css, /\.linked-personnel-actions button\{[\s\S]*?min-height:44px!important/);

for (const label of ['Candidate','Profession','Work status','Project','Access','Document status','Notification status','Actions']) {
  assert.match(talent, new RegExp(`data-label="${label}"`));
}
for (const label of ['Profile','Position','Status','Documents','Expiring in 1–30 days','Expires today','Expiring in 31–90 days','Expired']) {
  assert.match(reporting, new RegExp(`\\['${label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}'`));
}

console.log('V519 Personal and Corporate surface standard contracts passed');
