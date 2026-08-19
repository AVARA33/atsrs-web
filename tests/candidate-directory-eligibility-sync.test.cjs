const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const migration = fs.readFileSync(
  path.join(root, 'supabase', 'migrations', '20260818114009_fix_candidate_certificate_eligibility.sql'),
  'utf8',
);
const projection = fs.readFileSync(
  path.join(root, 'supabase', 'migrations', '20260818114009_fix_candidate_certificate_eligibility.sql'),
  'utf8',
);
const edge = fs.readFileSync(
  path.join(root, 'supabase', 'functions', 'talent-profile-actions', 'index.ts'),
  'utf8',
);

assert.match(migration, /new\.account_type = 'personal'/,
  'visibility synchronization must be limited to Personal profiles');
assert.match(migration, /requested_visibility not in \('Private', 'Link Only', 'Public'\)/,
  'only approved visibility values may reach the directory projection');
assert.match(migration, /discoverable = \(requested_visibility = 'Public'\)/,
  'Public enables directory consent and every other visibility disables it');
assert.match(migration, /after insert or update of payload on public\.atsrs_workspace_data/,
  'future visibility changes must synchronize from the authoritative profile row');
assert.match(migration, /for profile_owner in[\s\S]*atsrs_reconcile_talent_profile_from_workspace/,
  'every existing Personal profile must be reconciled once');
assert.match(migration, /coalesce\(nullif\(btrim\(source_profile ->> 'position'\), ''\), 'Not specified'\)/,
  'missing optional display position must not silently block eligibility');
assert.match(migration, /revoke all on function[\s\S]*from public, anon, authenticated/,
  'the trigger helper must not be directly callable by browser roles');

assert.match(projection, /profile\.discoverable = true\s*and profile\.profile_visibility = 'Public'/,
  'visibility OFF must remain excluded');
assert.match(projection, /from public\.atsrs_personnel_certificates certificate[\s\S]*join public\.atsrs_files file/,
  'eligibility must start from the canonical Certificate register and require a persisted file');
assert.match(projection, /certificate\.workspace_account_type = 'personal'/,
  'only Personal certificates may qualify');
assert.match(projection, /file\.user_id = certificate\.workspace_user_id[\s\S]*file\.category = 'document'/,
  'the linked file must belong to the same Personal owner and be a persisted document');
assert.doesNotMatch(projection, /count\s*\([^)]*\)\s*>\s*1|having[\s\S]*count[\s\S]*>\s*1/i,
  'multiple certificates must not be required');
const eligibilityClause = projection.match(/with eligible as \(([\s\S]*?)\), counted as/)[1];
assert.doesNotMatch(eligibilityClause, /expiry_date|phone_verified|whatsapp_verified|subscription|availability_status\s*=/i,
  'expiry, verification, availability and plan state must not affect eligibility');

assert.match(edge, /persistedCertificateFileIds\(admin, targetUserId\)/,
  'Candidate detail access must use the same canonical certificate source');
assert.match(edge, /\.from\("atsrs_personnel_certificates"\)/,
  'the Edge Function must not treat every generic document as a certificate');
assert.match(edge, /\.in\("id", certificateFiles\.ids\)/,
  'document summaries must be limited to canonical Certificate-linked files');

console.log('candidate directory eligibility synchronization tests passed');
