const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');
const normalizeMigration = read(
  'supabase/migrations/20260729005912_normalize_workspace_operations.sql'
);
const dualWriteMigration = read(
  'supabase/migrations/20260729035118_prepare_workspace_dual_write.sql'
);
const stableMigration = read(
  'supabase/migrations/20260729041619_stable_workspace_entity_ids.sql'
);
const verifySql = read('supabase/activation/stable-id-verify.sql');
const rollbackSql = read('supabase/activation/stable-id-rollback.sql');
const serverData = read('js/server-data.js');

const targetTables = [
  'atsrs_workspace_projects',
  'atsrs_workspace_personnel',
  'atsrs_personnel_certificates',
  'atsrs_project_personnel'
];

assert.match(stableMigration, /^\s*--[\s\S]*?\bbegin;/i);
assert.match(stableMigration, /\bcommit;\s*$/i);
assert.match(stableMigration, /set local lock_timeout = '5s'/i);
assert.match(stableMigration, /set local statement_timeout = '30s'/i);
assert.doesNotMatch(stableMigration, /\bdrop\s+(table|column|constraint)\b/i);

for (const table of targetTables) {
  assert.match(
    stableMigration,
    new RegExp(`alter table public\\.${table}\\s+add column if not exists source_entity_id uuid`, 'i')
  );
  assert.match(
    stableMigration,
    new RegExp(`conrelid = 'public\\.${table}'::regclass[\\s\\S]+?unique \\(workspace_user_id, workspace_account_type, source_entity_id\\)`, 'i')
  );
  assert.match(normalizeMigration, new RegExp(`alter table public\\.${table} enable row level security`, 'i'));
}

assert.match(stableMigration, /values \('stable_ids_required', false\)/i);
assert.match(stableMigration, /extensions\.uuid_generate_v5/i);
assert.equal(
  stableMigration.includes('9fe1439e-5b5a-5c86-9d7c-28a67036e814'),
  serverData.includes("STABLE_ID_NAMESPACE='9fe1439e-5b5a-5c86-9d7c-28a67036e814'")
);

assert.match(
  stableMigration,
  /Preserve an old client's authoritative JSON without assigning identity[\s\S]+?return source_row;/i
);
assert.match(
  stableMigration,
  /Do not bind stable project identity to mutable legacy array order[\s\S]+?return source_row;/i
);
assert.match(
  stableMigration,
  /Preserve legacy JSON and do not guess identity[\s\S]+?return source_row;/i
);

assert.match(
  dualWriteMigration,
  /create trigger atsrs_workspace_data_normalized_shadow[\s\S]+?after insert or update or delete[\s\S]+?execute function atsrs_private\.sync_workspace_normalized_shadow\(\)/i
);
const dualWriteFunction = dualWriteMigration.match(
  /create or replace function atsrs_private\.sync_workspace_normalized_shadow\(\)[\s\S]+?\$function\$([\s\S]+?)\$function\$;/i
)?.[1] || '';
assert.ok(dualWriteFunction);
assert.doesNotMatch(dualWriteFunction, /\b(insert into|update|delete from)\s+public\.atsrs_workspace_data\b/i);
assert.doesNotMatch(dualWriteFunction, /\b(dblink|http_|net\.|pg_background)\b/i);

assert.match(
  normalizeMigration,
  /atsrs_personnel_certificates_personnel_fkey[\s\S]+?on delete cascade/i
);
assert.match(
  normalizeMigration,
  /atsrs_personnel_certificates_file_fkey[\s\S]+?on delete set null/i
);
assert.match(
  normalizeMigration,
  /atsrs_project_personnel_project_fkey[\s\S]+?on delete cascade/i
);
assert.match(
  normalizeMigration,
  /atsrs_project_personnel_personnel_fkey[\s\S]+?on delete cascade/i
);
assert.match(stableMigration, /cannot remove personnel with stable relationships/i);
assert.match(stableMigration, /cannot remove a project with personnel assignments/i);

assert.match(stableMigration, /file_row\.user_id = source_row\.user_id/i);
assert.match(stableMigration, /file_row\.account_type = source_row\.account_type/i);
assert.match(stableMigration, /file_row\.file_name = item->>'fileName'/i);
assert.match(stableMigration, /file_row\.mime_type = item->>'mimeType'/i);
assert.match(stableMigration, /file_row\.size_bytes = \(item->>'fileSize'\)::bigint/i);

assert.match(serverData, /var DATA_TABLE='atsrs_workspace_data'/);
assert.match(serverData, /function readBusinessValue/);
assert.doesNotMatch(serverData, /\.from\(['"]atsrs_workspace_(projects|personnel)['"]\)/);

assert.match(verifySql, /jsonb_agg\(canonical order by source_entity_id\)/i);
assert.match(verifySql, /duplicate_source_entity_ids/i);
assert.match(verifySql, /certificate_orphans/i);
assert.match(verifySql, /assignment_orphans/i);
assert.match(rollbackSql, /set enabled = false/i);
assert.doesNotMatch(rollbackSql, /\bdrop\s+(table|column|constraint)\b/i);

console.log('stable-id SQL and ownership contract tests passed');
