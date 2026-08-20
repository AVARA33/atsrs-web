const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.join(__dirname, '..');
const migration = fs.readFileSync(
  path.join(root, 'supabase', 'migrations', '20260820120409_auto_expire_archive_jobs.sql'),
  'utf8'
);

test('published jobs always receive a bounded server expiry', () => {
  assert.match(migration, /status <> 'published' or expires_at is not null/);
  assert.match(migration, /p_closing_date \+ 1/);
  assert.match(migration, /p_published_at \+ interval '30 days'/);
  assert.match(migration, /new\.expires_at := coalesce/);
});

test('existing published jobs are backfilled before validation', () => {
  const update = migration.indexOf('update public.atsrs_jobs');
  const validate = migration.indexOf('validate constraint atsrs_jobs_published_expiry_required');
  assert.ok(update >= 0 && validate > update);
  assert.match(migration, /where status = 'published'[\s\S]*expires_at is null/);
});

test('expired jobs are archived on a recurring server schedule', () => {
  assert.match(migration, /create or replace function atsrs_private\.archive_expired_jobs/);
  assert.match(migration, /status = 'archived'[\s\S]*expires_at <= now\(\)/);
  assert.match(migration, /'atsrs-archive-expired-jobs'[\s\S]*'\*\/15 \* \* \* \*'/);
  assert.match(migration, /create index if not exists atsrs_jobs_live_expiry_idx/);
});
