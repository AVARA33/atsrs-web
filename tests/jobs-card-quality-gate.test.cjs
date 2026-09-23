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
const emailSourceMigration = fs.readFileSync(
  path.join(root, 'supabase', 'migrations', '20260919162500_allow_email_application_sources.sql'),
  'utf8'
);
const permalinkMigration = fs.readFileSync(
  path.join(root, 'supabase', 'migrations', '20260919170500_job_source_permalinks.sql'),
  'utf8'
);
const sourceCorrectionMigration = fs.readFileSync(
  path.join(root, 'supabase', 'migrations', '20260919174000_remove_internal_job_source_links.sql'),
  'utf8'
);
const audit = fs.readFileSync(path.join(root, 'qa', 'jobs-publication-quality-audit.sql'), 'utf8');

assert.match(runtime, /function jobQualityIssues\(job\)/);
assert.match(runtime, /description\.length<80/);
assert.match(runtime, /status==='published'/);
assert.match(runtime, /Cannot publish:/);
assert.match(runtime, /Needs data review/);
assert.doesNotMatch(runtime, /Data quality review required/);
assert.doesNotMatch(runtime, /Missing — manual review required/);
assert.match(runtime, /el\('footer','job-contact-info'\)/);
assert.match(runtime, /body\.append\(project\);a\.append\(head,controls,body,expandHint,c\)/);
assert.doesNotMatch(runtime, /scrollHeight>body\.clientHeight/);

assert.match(css, /\.jobs-grid\.jobs-cards\{align-items:stretch\}/);
assert.match(css, /\.jobs-grid\.jobs-cards\{align-items:stretch;grid-auto-rows:auto\}/);
assert.match(css, /\.jobs-cards \.job-card-slot\{height:100%\}/);
assert.match(css, /\.jobs-cards \.job-card-slot>\.job-card\{height:100%;grid-template-rows:auto minmax\(0,1fr\) auto;align-content:stretch\}/);
assert.doesNotMatch(runtime, /function syncCardHeights\(\)/);
assert.match(css, /\.jobs-cards \.job-recruiter-info>\.job-contact-org,[\s\S]*?\.jobs-cards \.job-recruiter-info>\.job-contact-name\{grid-column:auto\}/);
assert.match(css, /\.jobs-cards \.job-card-body\{[^}]*overflow:visible/);
assert.doesNotMatch(css, /\.jobs-cards \.job-card-body\{[^}]*overflow-y:auto/);
assert.match(css, /\.jobs-cards \.job-contact-info\{[^}]*align-self:end[^}]*border-top/);
assert.doesNotMatch(css, /\.jobs-cards \.job-card\{[^}]*min-height:(?:560|580|640)px/);
assert.match(css, /\.jobs-cards \.job-card-summary\{[^}]*-webkit-line-clamp:3/);
assert.match(css, /\.job-card-disclosure-content\[hidden\]\{display:none!important\}/);
assert.doesNotMatch(runtime, /project\.append\(cardDisclosure/);
assert.match(runtime, /\[\['Description',job\.description\|\|job\.summary\],\['Requirements',job\.requirements\]\]/);

assert.match(migration, /atsrs_jobs_published_content_quality/);
assert.match(migration, /char_length\(btrim\(description\)\) >= 80/);
assert.match(migration, /nullif\(btrim\(source_url\), ''\) is not null/);
assert.match(migration, /nullif\(btrim\(application_url\), ''\) is not null/);
assert.match(migration, /not valid/);
assert.match(emailSourceMigration, /source_type = 'manual'/);
assert.match(emailSourceMigration, /recruiter_email ~\*/);
assert.match(emailSourceMigration, /nullif\(btrim\(application_url\), ''\) is not null/);
assert.match(emailSourceMigration, /not valid/);
assert.match(permalinkMigration, /atsrs_jobs_manual_source_url/);
assert.match(permalinkMigration, /https:\/\/atsrs\.com\/\?route=jobs&job=/);
assert.match(permalinkMigration, /atsrs_job_public_v1/);
assert.match(permalinkMigration, /case when v_full then job\.source_url else null end/);
assert.match(sourceCorrectionMigration, /drop trigger if exists atsrs_jobs_manual_source_url/);
assert.match(sourceCorrectionMigration, /set source_url = null/);
assert.match(sourceCorrectionMigration, /drop function if exists public\.atsrs_job_public_v1/);

assert.match(audit, /source_backed_repair/);
assert.match(audit, /manual_review/);
assert.doesNotMatch(audit, /\b(?:update|delete|insert|alter|drop)\b/i);

console.log('Job card layout and publication quality gate regression checks passed.');
