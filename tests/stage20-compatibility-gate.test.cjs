const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const migration = fs.readFileSync(
  path.join(
    root,
    'supabase',
    'migrations',
    '20260731034949_stable_id_workspace_compatibility_gate.sql',
  ),
  'utf8',
);
const rollback = fs.readFileSync(
  path.join(
    root,
    'supabase',
    'activation',
    'stable-id-compatibility-rollback.sql',
  ),
  'utf8',
);
const telemetryFix = fs.readFileSync(
  path.join(
    root,
    'supabase',
    'migrations',
    '20260731035646_fix_stable_id_compatibility_telemetry_bucket.sql',
  ),
  'utf8',
);
const disable = fs.readFileSync(
  path.join(
    root,
    'supabase',
    'activation',
    'stable-id-compatibility-disable.sql',
  ),
  'utf8',
);
const runtime = fs.readFileSync(
  path.join(root, 'js', 'server-data.js'),
  'utf8',
);
const compatibilityRuntime = fs.readFileSync(
  path.join(root, 'js', 'stable-id-compatibility-runtime.js'),
  'utf8',
);
const storage = fs.readFileSync(
  path.join(root, 'js', 'storage.js'),
  'utf8',
);
const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const config = require(path.join(
  root,
  'js',
  'stable-id-compatibility-config.js',
));
const canary = fs.readFileSync(
  path.join(
    root,
    'supabase',
    'audit',
    'staging-stage20-compatibility-canary.sql',
  ),
  'utf8',
);

assert.equal(config.enabled, false);
assert.equal(config.clientBuild, 'V407');
assert.equal(config.cacheMs, 60000);
assert.equal(config.canaryQueryKey, 'atsrsStableCompatibility');
assert.equal(config.scopeHashes.length, 4);
assert.equal(new Set(config.scopeHashes).size, 4);
for (const scopeHash of config.scopeHashes) {
  assert.match(scopeHash, /^[0-9a-f]{64}$/);
}

assert.match(migration, /strict_enabled boolean not null default false/);
assert.match(migration, /minimum_client_build integer not null default 405/);
assert.match(migration, /kill_switch boolean not null default false/);
assert.match(migration, /enable row level security/g);
assert.match(
  migration,
  /revoke all on table atsrs_private\.stable_id_compatibility_scopes[\s\S]*from public, anon, authenticated, service_role/,
);
assert.match(
  migration,
  /security definer[\s\S]*set search_path = ''/,
);
assert.match(
  migration,
  /revoke all on function public\.atsrs_get_stable_id_compatibility\(text, text\)[\s\S]*from public, anon, service_role/,
);
assert.match(
  migration,
  /grant execute on function public\.atsrs_get_stable_id_compatibility\(text, text\)[\s\S]*to authenticated/,
);
assert.match(migration, /select auth\.uid\(\)/);
assert.match(migration, /ATSRS_STABLE_ID_REFRESH_REQUIRED/);
assert.match(migration, /request\.headers/);
assert.match(migration, /x-atsrs-client-build/);
assert.match(migration, /event_count[\s\S]*on conflict/);
assert.doesNotMatch(migration, /raw_user_meta_data|user_metadata/);
assert.doesNotMatch(migration, /set enabled = true[\s\S]*stable_ids_required/);
assert.match(telemetryFix, /telemetry_bucket timestamptz/);
assert.match(
  telemetryFix,
  /on conflict on constraint stable_id_compatibility_events_pkey/,
);
assert.doesNotMatch(
  telemetryFix,
  /values \(\s*event_bucket,/,
);

assert.match(runtime, /function assertStableCompatibility/);
assert.match(runtime, /function stableCompatibilityRequested/);
assert.match(runtime, /ATSRSStableIdCompatibilityRuntime/);
assert.match(runtime, /getScopeHash:function/);
assert.match(compatibilityRuntime, /get\(queryKey\)==='canary'/);
assert.match(compatibilityRuntime, /options\.getScopeHash/);
assert.match(runtime, /atsrs_get_stable_id_compatibility/);
assert.match(runtime, /ATSRS_STABLE_ID_REFRESH_REQUIRED/);
assert.match(runtime, /existing server data is safe/);
assert.match(storage, /'x-atsrs-client-build':atsrsClientBuild/);
assert.match(
  index,
  /stable-id-compatibility-config\.js\?v=409[\s\S]*stable-id-compatibility-runtime\.js\?v=409[\s\S]*reference-filter-state\.js\?v=410[\s\S]*server-data\.js\?v=412/,
);

assert.match(disable, /set kill_switch = true/);
assert.match(disable, /strict_enabled = false/);
assert.match(rollback, /set kill_switch = true/);
assert.match(rollback, /strict_enabled = false/);
assert.doesNotMatch(
  rollback,
  /drop table[\s\S]*stable_id_compatibility_(scopes|events)/,
);
assert.match(canary, /^begin;/m);
assert.match(canary, /rollback;\s*$/);
assert.match(canary, /old client was not rejected before write/);
assert.match(canary, /V405 ID-less graph was not rejected/);
assert.match(canary, /operation replay changed the receipt/);
assert.match(canary, /stale revision was not rejected/);
assert.match(canary, /privacy-safe refresh telemetry mismatch/);
assert.match(canary, /kill switch did not disable strict enforcement/);

console.log('stage20 compatibility gate contracts passed');
