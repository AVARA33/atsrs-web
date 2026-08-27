const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const migration = fs.readFileSync(
  path.join(__dirname, '..', 'supabase', 'migrations', '20260828010000_unlimited_trial_and_owner_ai_cv.sql'),
  'utf8',
);
const securityFix = fs.readFileSync(
  path.join(__dirname, '..', 'supabase', 'migrations', '20260828010100_secure_unlimited_ai_cv_eligibility.sql'),
  'utf8',
);

assert.match(migration, /atsrs_admin_users[\s\S]+user_id = p_user_id/i);
assert.match(
  migration,
  /status = 'trialing'[\s\S]+trial_ends_at > now\(\)/i,
  'Only a currently active trial may bypass the customer-plan generation quota.',
);
assert.match(migration, /when v_unlimited then 2147483647/i);
assert.match(
  migration,
  /updated_at <= now\(\) - interval '15 seconds'/i,
  'Unlimited accounts must retain the anti-double-click cooldown.',
);
assert.match(migration, /grant execute[\s\S]+service_role/i);
assert.doesNotMatch(migration, /grant execute[\s\S]+authenticated/i);

assert.match(securityFix, /atsrs_ai_cv_is_unlimited[\s\S]+security definer/i);
assert.match(securityFix, /v_unlimited := private\.atsrs_ai_cv_is_unlimited\(p_user_id\)/i);
assert.match(
  securityFix,
  /revoke all on function private\.atsrs_ai_cv_is_unlimited\(uuid\)[\s\S]+authenticated, service_role/i,
);
assert.match(
  securityFix,
  /grant execute on function private\.atsrs_ai_cv_is_unlimited\(uuid\) to service_role/i,
);
assert.doesNotMatch(securityFix, /grant select on (table )?public\.atsrs_(admin_users|subscriptions)/i);

console.log('AI CV unlimited trial and owner quota regression checks passed.');
