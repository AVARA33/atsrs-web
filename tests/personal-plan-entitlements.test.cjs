const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const migration = fs.readFileSync(path.join(root, 'supabase', 'migrations', '20260818054500_personal_plan_entitlements.sql'), 'utf8');

assert.match(migration, /create table if not exists private\.atsrs_personal_plan_entitlements/i);
assert.match(migration, /\('free', 'Free', 10, 104857600, 1, null, 50, 5, 'limited'\)/i);
assert.match(migration, /\('pro', 'Bronze', 200, 1073741824, 3, null, 150, 15, 'full'\)/i);
assert.match(migration, /create or replace function public\.atsrs_my_personal_entitlements\(\)/i);
assert.match(migration, /grant execute on function public\.atsrs_my_personal_entitlements\(\) to authenticated/i);
assert.match(migration, /new\.account_type <> 'personal'/i);
assert.match(migration, /v_storage \+ coalesce\(new\.size_bytes, 0\) > v_storage_limit/i);
assert.match(migration, /new\.category = 'cv'/i);
assert.match(migration, /select entitlement\.ai_scan_monthly_limit/i);
assert.match(migration, /grant execute on function public\.atsrs_reserve_ai_scan\(uuid\) to service_role/i);
assert.match(migration, /new\.channel <> 'whatsapp' or new\.account_type <> 'personal'/i);
assert.match(migration, /return null;/i);
assert.match(migration, /create or replace function public\.atsrs_jobs_feed/i);
assert.match(migration, /now\(\) - interval '6 hours'/i);
assert.match(migration, /limit case when v_full then null else 30 end/i);
assert.match(migration, /- 'recruiter_email'[\s\S]*- 'source_url'[\s\S]*- 'application_url'/i);
assert.match(migration, /create or replace function public\.atsrs_jobs_facets/i);
assert.match(migration, /revoke select on table public\.atsrs_jobs from anon/i);
assert.doesNotMatch(migration, /grant .*private\.atsrs_personal_plan_entitlements.*authenticated/i);

console.log('Personal plan entitlement source-of-truth contracts passed');

