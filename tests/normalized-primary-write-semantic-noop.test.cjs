const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const migration = fs.readFileSync(
  path.join(
    root,
    'supabase',
    'migrations',
    '20260730111258_normalized_primary_write_semantic_noop.sql',
  ),
  'utf8',
);
const rollback = fs.readFileSync(
  path.join(
    root,
    'supabase',
    'activation',
    'normalized-primary-write-semantic-noop-rollback.sql',
  ),
  'utf8',
);
const directReceiptFix = fs.readFileSync(
  path.join(
    root,
    'supabase',
    'migrations',
    '20260730112618_semantic_noop_direct_receipt_fix.sql',
  ),
  'utf8',
);
const canonicalTieBreaker = fs.readFileSync(
  path.join(
    root,
    'supabase',
    'migrations',
    '20260730113050_semantic_canonical_array_tiebreaker.sql',
  ),
  'utf8',
);
const runtime = fs.readFileSync(
  path.join(root, 'js', 'server-data.js'),
  'utf8',
);

assert.match(migration, /^begin;/m);
assert.match(migration, /commit;\s*$/);
assert.match(
  migration,
  /create or replace function atsrs_private\.atsrs_strip_technical_metadata/,
);
assert.match(
  migration,
  /create or replace function atsrs_private\.atsrs_workspace_business_semantic/,
);
assert.match(migration, /jsonb_agg\(row_value order by row_value->>'source_entity_id'\)/);
assert.match(migration, /atsrsProjectIds/);
assert.match(migration, /jsonb_agg\(lower\(project_id\) order by lower\(project_id\)\)/);
assert.match(migration, /ATSRS_SEMANTIC_NOOP_ROLLBACK/);
assert.match(migration, /when sqlstate 'A1901'/);
assert.match(migration, /'status', 'no_op'/);
assert.match(migration, /'changed_keys', 0/);
assert.match(migration, /'committed_revision', current_revision/);
assert.match(migration, /workspace_write_commands/);
assert.match(migration, /set search_path = ''/);
assert.match(
  migration,
  /revoke all on function public\.atsrs_apply_workspace_command[\s\S]*?from public, anon, service_role/,
);
assert.match(
  migration,
  /grant execute on function public\.atsrs_apply_workspace_command[\s\S]*?to authenticated/,
);
assert.doesNotMatch(migration, /grant execute[\s\S]*?to (?:public|anon|service_role)/i);

assert.match(directReceiptFix, /^begin;/m);
assert.match(directReceiptFix, /current_revision <> p_expected_revision/);
assert.match(directReceiptFix, /ATSRS_INVALID_OPERATION_KEY/);
assert.match(directReceiptFix, /if not semantic_no_op then[\s\S]*?return atsrs_private\.atsrs_apply_workspace_command_v1/);
assert.match(directReceiptFix, /insert into atsrs_private\.workspace_write_commands/);
assert.match(directReceiptFix, /'status', 'no_op'/);
assert.doesNotMatch(directReceiptFix, /ATSRS_SEMANTIC_NOOP_ROLLBACK/);
assert.match(directReceiptFix, /commit;\s*$/);

assert.match(canonicalTieBreaker, /^begin;/m);
assert.match(canonicalTieBreaker, /rename to atsrs_workspace_business_semantic_v1/);
assert.match(canonicalTieBreaker, /jsonb_agg\(entry\.value order by entry\.value::text\)/);
assert.match(canonicalTieBreaker, /commit;\s*$/);

assert.match(runtime, /function sameBusinessValue\(key,left,right\)/);
assert.match(runtime, /BUSINESS_VOLATILE_FIELDS/);
assert.match(
  runtime,
  /memoryStore\.has\(key\)&&sameBusinessValue\(key,memoryStore\.get\(key\),value\)/,
);

assert.match(rollback, /^begin;/m);
assert.match(rollback, /drop function public\.atsrs_apply_workspace_command/);
assert.match(
  rollback,
  /alter function atsrs_private\.atsrs_apply_workspace_command_v1[\s\S]*?rename to atsrs_apply_workspace_command/,
);
assert.match(rollback, /set schema public/);
assert.match(rollback, /atsrs_workspace_business_semantic_v1/);
assert.match(rollback, /commit;\s*$/);

console.log('normalized primary-write semantic no-op contracts passed');
