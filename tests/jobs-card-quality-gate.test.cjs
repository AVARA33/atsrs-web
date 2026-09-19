const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const runtime = fs.readFileSync(path.join(root, 'js', 'jobs-prototype.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'css', 'jobs-prototype.css'), 'utf8');
const migration = fs.readFileSync(
  path.join(root, 'supabase', 'migrations', '20260918130609_enforce_job_publication_quality.sql'),
  'utf8'
);
const audit = fs.readFileSync(path.join(root, 'qa', 'jobs-publication-quality-audit.sql'), 'utf8');

assert.match(runtime, /function jobQualityIssues\(job\)/);
assert.match(runtime, /description\.length<80/);
assert.match(runtime, /status==='published'/);
assert.match(runtime, /Cannot publish:/);
assert.match(runtime, /Needs data review/);
assert.match(runtime, /el\('footer','job-contact-info'\)/);
assert.match(runtime, /body\.append\(project\);a\.append\(head,controls,body,c\)/);
assert.doesNotMatch(runtime, /scrollHeight>body\.clientHeight/);

assert.match(css, /\.jobs-grid\.jobs-cards\{align-items:start\}/);
assert.match(css, /\.jobs-cards \.job-card\{height:560px;min-height:560px;max-height:560px/);
assert.match(css, /\.jobs-cards \.job-card\.has-description-open\{height:auto;max-height:none/);
assert.match(css, /\.jobs-cards \.job-card-body\{[^}]*overflow:hidden/);
assert.doesNotMatch(css, /\.jobs-cards \.job-card-body\{[^}]*overflow-y:auto/);
assert.match(css, /\.jobs-cards \.job-contact-info\{[^}]*align-self:end[^}]*border-top/);
assert.match(css, /\.jobs-cards \.job-card-summary\{[^}]*-webkit-line-clamp:3/);
assert.match(css, /\.job-card-description-content\.hidden\{display:none!important\}/);

assert.match(migration, /atsrs_jobs_published_content_quality/);
assert.match(migration, /char_length\(btrim\(description\)\) >= 80/);
assert.match(migration, /nullif\(btrim\(source_url\), ''\) is not null/);
assert.match(migration, /nullif\(btrim\(application_url\), ''\) is not null/);
assert.match(migration, /not valid/);

assert.match(audit, /source_backed_repair/);
assert.match(audit, /manual_review/);
assert.doesNotMatch(audit, /\b(?:update|delete|insert|alter|drop)\b/i);

console.log('Job card layout and publication quality gate regression checks passed.');
