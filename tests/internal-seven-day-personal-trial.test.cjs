const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const sql = fs.readFileSync(path.join(root, 'supabase', 'migrations', '20260828003000_activate_internal_seven_day_personal_trial.sql'), 'utf8');
const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const pricing = fs.readFileSync(path.join(root, 'pricing.html'), 'utf8');

assert.match(sql, /v_started_at \+ interval '7 days'/i);
assert.match(sql, /atsrs_signup_trial_email_fingerprint/i);
assert.match(sql, /on conflict \(email_fingerprint\) do nothing/i);
assert.match(sql, /subscription\.status = 'trialing'[\s\S]+subscription\.trial_ends_at > now\(\)/i);
assert.doesNotMatch(index, /Start 7-day trial|7-day free trial/i);
assert.doesNotMatch(pricing, /Start 7-day trial|7-day free trial/i);

console.log('internal-seven-day-personal-trial: PASS');
