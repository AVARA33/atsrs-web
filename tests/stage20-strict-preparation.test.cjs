const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const canary = fs.readFileSync(
  path.join(root, "supabase", "audit", "staging-stage20-strict-canary.sql"),
  "utf8"
);
const enable = fs.readFileSync(
  path.join(root, "supabase", "activation", "stable-id-enable.sql"),
  "utf8"
);
const rollback = fs.readFileSync(
  path.join(root, "supabase", "activation", "stable-id-rollback.sql"),
  "utf8"
);
const runtime = fs.readFileSync(
  path.join(root, "js", "server-data.js"),
  "utf8"
);

assert.match(canary, /^begin;/m);
assert.match(canary, /rollback;\s*$/);
assert.match(canary, /stable_ids_required=false/);
assert.match(canary, /set enabled = true/);
assert.match(canary, /set enabled = false/);
assert.match(canary, /ID-less company project/);
assert.match(canary, /ID-less personal profile/);
assert.match(canary, /ID-less direct legacy write/);
assert.match(canary, /ATSRS_INVALID_STABLE_ID_GRAPH/);
assert.match(canary, /ATSRS_INVALID_PROFILE_GRAPH/);
assert.match(canary, /operation replay did not return the original receipt/);
assert.match(canary, /stale revision was not rejected immediately/);
assert.match(canary, /legacy JSON mirror is missing/);

assert.match(enable, /lock table public\.atsrs_workspace_data/i);
assert.match(enable, /set enabled = true/i);
assert.match(rollback, /set enabled = false/i);
assert.doesNotMatch(rollback, /\bdrop\b|\bdelete\b/i);

assert.match(runtime, /async function hydrateStableValue/);
assert.match(runtime, /if\(!validUuid\(decoded\.atsrsId\)\)/);
assert.match(runtime, /if\(!validUuid\(item\.atsrsId\)\)/);
assert.match(runtime, /atsrsPersonnelId/);
assert.match(runtime, /atsrsProjectIds/);

console.log("stage20 strict preparation contract: PASS");
