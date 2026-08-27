const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const sql = fs.readFileSync(path.join(__dirname, '..', 'supabase', 'migrations', '20260828002000_fix_workspace_admin_policy_verification.sql'), 'utf8');

assert.match(sql, /security definer/i);
assert.match(sql, /account_type = 'personal'/i);
assert.match(sql, /account_type = 'company' and public\.atsrs_is_current_admin\(\)/i);
assert.doesNotMatch(sql, /grant select[^;]+atsrs_admin_users/is);

console.log('workspace-admin-policy-verification: PASS');
