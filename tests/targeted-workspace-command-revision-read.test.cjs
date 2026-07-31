const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const applySql = fs.readFileSync(
  path.join(root, "supabase", "activation", "targeted-workspace-command-revision-read.sql"),
  "utf8",
);
const rollbackSql = fs.readFileSync(
  path.join(root, "supabase", "activation", "targeted-workspace-command-revision-read-rollback.sql"),
  "utf8",
);

assert.match(applySql, /^begin;/m);
assert.match(applySql, /set local lock_timeout = '250ms'/);
assert.match(applySql, /set local statement_timeout = '5s'/);
assert.match(applySql, /create function public\.atsrs_get_workspace_command_revision/);
assert.match(applySql, /stable[\s\S]*security definer/i);
assert.match(applySql, /set search_path = ''/);
assert.match(applySql, /actor_id uuid := \(select auth\.uid\(\)\)/);
assert.match(applySql, /from public\.atsrs_workspaces workspace/);
assert.match(applySql, /workspace\.user_id = actor_id/);
assert.match(applySql, /workspace\.account_type = p_account_type/);
assert.match(applySql, /from atsrs_private\.workspace_write_revisions state/);
assert.match(
  applySql,
  /revoke all on function public\.atsrs_get_workspace_command_revision\(text\)[\s\S]*from public, anon, service_role/,
);
assert.match(
  applySql,
  /grant execute on function public\.atsrs_get_workspace_command_revision\(text\)[\s\S]*to authenticated/,
);
assert.doesNotMatch(applySql, /\b(insert|update|delete|truncate|alter table|create table)\b/i);
assert.match(applySql, /commit;\s*$/);

assert.match(rollbackSql, /^begin;/m);
assert.match(
  rollbackSql,
  /revoke all on function public\.atsrs_get_workspace_command_revision\(text\)[\s\S]*from public, anon, authenticated, service_role/,
);
assert.match(
  rollbackSql,
  /drop function if exists public\.atsrs_get_workspace_command_revision\(text\)/,
);
assert.match(rollbackSql, /commit;\s*$/);

console.log("targeted workspace revision read contract: PASS");
