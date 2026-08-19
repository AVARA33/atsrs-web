const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const client = fs.readFileSync(path.join(root, 'js', 'talent-directory.js'), 'utf8');
const migration = fs.readFileSync(
  path.join(root, 'supabase', 'migrations', '20260819193000_protect_candidate_projection_source.sql'),
  'utf8',
);

assert.match(client, /function cloudProfileReady\(\)/,
  'Candidate projection writes must know whether cloud profile data is hydrated');
assert.match(client, /async function syncOwnProfile\(force\)\{[\s\S]*?if\(!cloudProfileReady\(\)\)return false/,
  'explicit full-profile synchronization must not read an unhydrated form');
assert.match(client, /setTimeout\(function\(\)\{\s*if\(mode\(\)==='personal'\)\{touchOwnProfile\(true\)/,
  'startup activity must not perform a full projection overwrite');
assert.match(client, /atsrs:resume[\s\S]*?touchOwnProfile\(false\)/,
  'resume activity must not perform a full projection overwrite');
assert.match(client, /setInterval\(function\(\)\{if\(mode\(\)==='personal'\)touchOwnProfile\(false\)/,
  'periodic activity must not perform a full projection overwrite');

assert.match(migration, /authoritative_visibility := source_profile ->> 'visibility'/,
  'the Personal workspace profile must be the visibility source of truth');
assert.match(migration, /new\.profile_visibility := authoritative_visibility/,
  'cached projection writes must inherit the authoritative visibility');
assert.match(migration, /new\.discoverable := \(authoritative_visibility = 'Public'\)/,
  'discoverability must stay coupled to explicit Public consent');
assert.match(migration, /else\s+new\.profile_visibility := 'Private';\s+new\.discoverable := false/,
  'missing or invalid consent must fail closed');
assert.match(migration, /for profile_owner in[\s\S]*atsrs_reconcile_talent_profile_from_workspace/,
  'all existing profiles must be repaired generically without hardcoded IDs');
assert.match(migration, /revoke all on function[\s\S]*from public, anon, authenticated/,
  'the trigger helper must not become a browser-callable privilege bypass');

console.log('Candidate directory hydration race regression tests passed');
