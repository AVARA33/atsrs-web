const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const migration = fs.readFileSync(path.join(
  root,
  "supabase/migrations/20261029233000_reconcile_public_jobs_feed_contract.sql",
), "utf8");

assert.match(migration, /create or replace function public\.atsrs_jobs_feed\(/i);
assert.match(migration, /security definer[\s\S]*set search_path = ''/i);
assert.match(migration, /jsonb_build_object\([\s\S]*'id', job\.id[\s\S]*'expires_at', job\.expires_at/i);
assert.doesNotMatch(migration, /to_jsonb\(job\)/i);

for (const internalField of [
  "external_id",
  "source_item_key",
  "normalized_source_url",
  "created_by",
  "updated_by",
  "archived_at",
]) {
  assert.doesNotMatch(migration, new RegExp(`'${internalField}'\\s*,`, "i"));
}

assert.match(migration, /case when v_full then job\.recruiter_email else null end/i);
assert.match(migration, /revoke all on function public\.atsrs_jobs_feed[\s\S]*from public, anon, authenticated, service_role/i);
assert.match(migration, /grant execute on function public\.atsrs_jobs_feed[\s\S]*to anon, authenticated/i);

console.log("Supabase advisor payment-activation contract passed.");
