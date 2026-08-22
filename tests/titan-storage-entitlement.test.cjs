const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const migration=fs.readFileSync(path.resolve(__dirname,'../supabase/migrations/20260822193000_define_titan_personal_storage.sql'),'utf8');
assert.match(migration,/where plan_key = 'business'/i,'The existing internal business entitlement must remain the migration target.');
assert.match(migration,/public_name = 'Titan'/i,'The internal entitlement must be presented as TITAN.');
assert.match(migration,/storage_bytes_limit = 21474836480/i,'TITAN must have the approved 20 GiB storage capacity used by the dashboard.');
assert.doesNotMatch(migration,/insert into public\.atsrs_subscriptions|update public\.atsrs_subscriptions/i,'The migration must not assign or change any user subscription.');

console.log('titan-storage-entitlement: PASS');
