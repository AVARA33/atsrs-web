const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.join(__dirname, '..');
const migration = fs.readFileSync(
  path.join(root, 'supabase', 'migrations', '20260910132209_revalidate_archived_jobs_from_sources.sql'),
  'utf8'
);
const processingMigration = fs.readFileSync(
  path.join(root, 'supabase', 'migrations', '20260910132832_process_archived_job_rechecks.sql'),
  'utf8'
);
const legacyLinkMigration = fs.readFileSync(
  path.join(root, 'supabase', 'migrations', '20260910133542_link_legacy_archived_jobs_for_recheck.sql'),
  'utf8'
);
const ingestion = fs.readFileSync(path.join(root, 'supabase', 'functions', 'job-ingestion', 'index.ts'), 'utf8');

test('vacancies without a source closing date do not receive a local expiry', () => {
  assert.match(migration, /drop constraint if exists atsrs_jobs_published_expiry_required/);
  assert.match(migration, /p_closing_date \+ 1/);
  assert.match(migration, /else null::timestamptz/);
  assert.match(migration, /status = 'published'[\s\S]*closing_date is null[\s\S]*expires_at is not null/);
  assert.match(ingestion, /status:'published',expires_at:null/);
});

test('archived source-linked jobs are queued for official revalidation', () => {
  assert.match(migration, /state in \('pending', 'published', 'review', 'closed', 'recheck'\)/);
  assert.match(migration, /set state = 'recheck'[\s\S]*j\.status = 'archived'/);
  assert.match(ingestion, /\.eq\('state','recheck'\)[\s\S]*\.limit\(30\)/);
  assert.match(ingestion, /active\.active===false[\s\S]*state:'closed'/);
  assert.match(ingestion, /status:'published',expires_at:null[\s\S]*state:'published'/);
  assert.match(ingestion, /attempts>=3\?'review':'recheck'/);
  assert.match(processingMigration, /recheck_attempts integer not null default 0/);
  assert.match(processingMigration, /'atsrs-hr-archive-recheck'[\s\S]*'\*\/2 \* \* \* \*'/);
  assert.match(processingMigration, /select public\.atsrs_dispatch_job_ingestion\(\)/);
  assert.match(legacyLinkMigration, /q\.job_id is null/);
  assert.match(legacyLinkMigration, /job_match_count = 1/);
  assert.match(legacyLinkMigration, /q\.payload->>'postingUrl' in/);
});

test('only verified source closing dates may drive the private archive helper', () => {
  assert.match(migration, /create or replace function atsrs_private\.archive_expired_jobs/);
  assert.match(migration, /status = 'archived'[\s\S]*closing_date is not null[\s\S]*closing_date </);
  assert.match(migration, /cron\.unschedule/);
  assert.doesNotMatch(migration, /cron\.schedule/);
});
