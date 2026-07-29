const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');
const script = read('scripts/staging/verify-restore-package.ps1');
const sql = read('supabase/audit/staging-restore-verify.sql');
const syntheticSql = read('supabase/audit/staging-stable-id-synthetic-tests.sql');
const sqlExecutable = sql.replace(/^--.*$/gm, '');
const sqlKeywords = sqlExecutable.replace(/'(?:''|[^'])*'/g, "''");
const runbook = read('docs/staging-restore-rehearsal.md');

assert.match(script, /SHA256SUMS\.txt/);
assert.match(script, /Get-FileHash[\s\S]+?-Algorithm SHA256/i);
assert.match(script, /ATSRS_STAGING_PROJECT_REF/);
assert.match(script, /Refusing to run verification against the production project/);
assert.match(script, /PGHOST/);
assert.doesNotMatch(script, /Write-Output[\s\S]{0,80}(PGPASSWORD|DB_URL)/i);
assert.match(script, /stable-id-verify\.sql/);
assert.match(script, /staging-restore-verify\.sql/);

assert.match(sql, /begin transaction read only;/i);
assert.match(sql, /rollback;\s*$/i);
assert.match(sql, /aggregate_counts/i);
assert.match(sql, /normalized_integrity/i);
assert.match(sql, /storage_reference_integrity/i);
assert.match(sql, /has_table_privilege\('anon'/i);
assert.match(sql, /has_table_privilege\('authenticated'/i);
assert.doesNotMatch(sqlExecutable, /select\s+\*\s+from/i);
assert.doesNotMatch(sqlExecutable, /payload\s*(,|from)/i);
assert.doesNotMatch(sqlKeywords, /\b(insert|update|delete|truncate|alter|drop|create)\b/i);

assert.match(syntheticSql, /^begin;/im);
assert.match(syntheticSql, /stable_ids_required/i);
assert.match(syntheticSql, /old-client deterministic ID changed/i);
assert.match(syntheticSql, /rename\/reorder changed the stable ID set/i);
assert.match(syntheticSql, /stale optimistic write was not rejected/i);
assert.match(syntheticSql, /cross-workspace personnel relation was accepted/i);
assert.match(syntheticSql, /idempotent rerun changed normalized identity state/i);
assert.match(syntheticSql, /rollback;\s*$/i);

assert.match(runbook, /auth identity mapping/i);
assert.match(runbook, /Storage bucket/i);
assert.match(runbook, /Never run[\s\S]+?hwtjuqyxzivymofamwxl/i);
assert.match(runbook, /New critical advisor findings: 0/i);
assert.match(runbook, /INVALID-DO-NOT-RESTORE/i);
assert.match(runbook, /dependency-ordered restore copy/i);

console.log('staging restore package contract tests passed');
