const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const migration = fs.readFileSync(
  path.join(root, 'supabase', 'migrations', '20260818024500_sync_candidate_directory_visibility.sql'),
  'utf8',
);
const projection = fs.readFileSync(
  path.join(root, 'supabase', 'migrations', '20260816184500_bounded_talent_directory_page.sql'),
  'utf8',
);

assert.match(migration, /new\.account_type <> 'personal'/,
  'visibility synchronization must be limited to Personal profiles');
assert.match(migration, /requested_visibility not in \('Private', 'Link Only', 'Public'\)/,
  'only approved visibility values may reach the directory projection');
assert.match(migration, /discoverable = \(requested_visibility = 'Public'\)/,
  'Public enables directory consent and every other visibility disables it');
assert.match(migration, /after insert or update of payload on public\.atsrs_workspace_data/,
  'future visibility changes must synchronize from the authoritative profile row');
assert.match(migration, /with authoritative_profiles[\s\S]*update public\.atsrs_talent_profiles/,
  'existing stale projections must be reconciled once');
assert.match(migration, /revoke all on function[\s\S]*from public, anon, authenticated/,
  'the trigger helper must not be directly callable by browser roles');

assert.match(projection, /profile\.discoverable = true\s*and profile\.profile_visibility = 'Public'/,
  'visibility OFF must remain excluded');
assert.match(projection, /exists\s*\([\s\S]*file\.account_type = 'personal'[\s\S]*file\.category = 'document'/,
  'one persisted Personal certificate document must remain the only file eligibility requirement');
assert.doesNotMatch(projection, /count\s*\([^)]*\)\s*>\s*1|having[\s\S]*count[\s\S]*>\s*1/i,
  'multiple certificates must not be required');

console.log('candidate directory eligibility synchronization tests passed');
