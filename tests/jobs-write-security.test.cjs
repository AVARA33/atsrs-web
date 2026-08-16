const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const test=require('node:test');
const root=path.join(__dirname,'..');
const migration=fs.readFileSync(path.join(root,'supabase','migrations','20260816174556_create_owner_managed_jobs.sql'),'utf8');
const nullableLocationMigration=fs.readFileSync(path.join(root,'supabase','migrations','20260816233000_allow_jobs_unknown_location.sql'),'utf8');
const sourceDatesMigration=fs.readFileSync(path.join(root,'supabase','migrations','20260816234500_preserve_jobs_source_dates.sql'),'utf8');
const runtime=fs.readFileSync(path.join(root,'js','jobs-prototype.js'),'utf8');

test('Jobs migration separates grants, RLS and owner authorization',()=>{
  assert.match(migration,/alter table public\.atsrs_jobs enable row level security/);
  assert.match(migration,/to anon[\s\S]*status = 'published'[\s\S]*expires_at > now\(\)/);
  assert.match(migration,/to authenticated[\s\S]*is_jobs_admin/);
  assert.match(migration,/grant select on table public\.atsrs_jobs to anon/);
  assert.match(migration,/grant select, insert, update, delete on table public\.atsrs_jobs to authenticated/);
  assert.doesNotMatch(runtime,/service_role|atsrs_admin_users/);
});

test('Jobs identity accepts multiple roles per post and rejects exact role duplicates',()=>{
  assert.match(migration,/atsrs_jobs_external_role_uidx/);
  assert.match(migration,/source_type, external_id, role_key/);
  assert.match(migration,/atsrs_jobs_source_role_uidx/);
  assert.match(migration,/normalized_source_url, normalized_title, normalized_company, normalized_location/);
  assert.doesNotMatch(migration,/unique\s*\(\s*source_type\s*,\s*source_url\s*\)/i);
  assert.match(migration,/application_url text/);
});

test('Publish time is server owned and source/joining dates stay separate',()=>{
  assert.match(migration,/new\.published_at := clock_timestamp\(\)/);
  assert.match(migration,/new\.published_at := old\.published_at/);
  assert.match(migration,/source_posted_at date/);
  assert.match(migration,/joining_date date/);
  assert.match(runtime,/prefix='Posted '/);
  assert.match(runtime,/source_posted_at\|\|job\.display_posted_date/);
  assert.match(runtime,/job\.status!=='published'/);
});

test('Official display and closing dates stay separate from source and publish time',()=>{
  assert.match(sourceDatesMigration,/add column display_posted_date date/);
  assert.match(sourceDatesMigration,/add column closing_date date/);
  assert.match(runtime,/fact\(dl,'Closing date',job\.closing_date\)/);
});

test('Server text and links use inert DOM APIs',()=>{
  assert.match(runtime,/textContent=String\(text\)/);
  assert.match(runtime,/replaceChildren/);
  assert.match(runtime,/\^https\?:\$/);
  assert.doesNotMatch(runtime,/innerHTML|outerHTML|insertAdjacentHTML|document\.write/);
});

test('Unknown locations remain null without weakening duplicate identity',()=>{
  assert.match(nullableLocationMigration,/alter column location drop not null/);
  assert.match(nullableLocationMigration,/new\.location := nullif\(btrim\(new\.location\), ''\)/);
  assert.match(nullableLocationMigration,/new\.normalized_location := coalesce\(/);
  assert.doesNotMatch(runtime,/Title, company and location are required/);
  assert.match(runtime,/Title and company are required/);
});
