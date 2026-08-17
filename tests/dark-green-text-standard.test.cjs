const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const root=path.resolve(__dirname,'..');
const index=fs.readFileSync(path.join(root,'index.html'),'utf8');
const css=fs.readFileSync(path.join(root,'css','dark-green-text-standard-v58140.css'),'utf8');
const theme=fs.readFileSync(path.join(root,'css','theme.css'),'utf8');
const shellFixture=fs.readFileSync(path.join(root,'tests','fixtures','shell-polish-harness.html'),'utf8');
const jobsFixture=fs.readFileSync(path.join(root,'tests','fixtures','jobs-prototype-harness.html'),'utf8');

test('dark green text standard reuses the existing logo-aligned brand token',()=>{
  assert.match(theme,/:root\{[\s\S]*?--sidebar-accent:#22c55e/);
  assert.match(index,/dark-green-text-standard-v58140\.css\?v=58140/);
  assert.match(css,/html\[data-theme="dark"\]/);
  assert.match(css,/color:var\(--sidebar-accent\)!important/);
  assert.match(css,/-webkit-text-fill-color:var\(--sidebar-accent\)!important/);
  assert.doesNotMatch(css,/html\[data-theme="light"\]/);
  assert.doesNotMatch(css,/(?:color|-webkit-text-fill-color)\s*:\s*#[0-9a-f]{3,8}/i);
  assert.match(shellFixture,/dark-green-text-standard-v58140\.css\?v=58140-qa/);
  assert.match(jobsFixture,/dark-green-text-standard-v58140\.css\?v=58140-qa/);
});

test('standardisation remains text-only and excludes protected visual roles',()=>{
  assert.doesNotMatch(css,/\b(?:background|border|box-shadow|outline|fill|stroke|filter|transform|animation|font-size|font-weight|padding|margin|width|height)\s*:/);
  assert.doesNotMatch(css,/jobs-page-button|job-detail-toggle|atsrs-maintenance-mark|svc-icon|workspace-option-check/);
  assert.match(css,/\.sidebar \.nav button\.active/);
  assert.match(css,/#jobsPage \.jobs-hero h3/);
  assert.match(css,/\.job-card-company/);
  assert.match(css,/\.atsrs-security-message\.is-ok/);
  assert.match(css,/\.talent-verification-badge\.is-verified/);
});
