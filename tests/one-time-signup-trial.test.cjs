const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const migration=fs.readFileSync(path.resolve(__dirname,'../supabase/migrations/20260827203000_one_time_full_access_signup_trial.sql'),'utf8');

assert.match(migration,/create table if not exists private\.atsrs_signup_trial_claims/i,'A private redemption ledger must survive account deletion.');
assert.match(migration,/email_fingerprint text primary key/i,'One verified mailbox must map to one trial claim.');
assert.doesNotMatch(migration,/create table[^;]+\bemail\b(?!_fingerprint)/i,'The anti-abuse ledger must not retain plaintext email addresses.');
assert.match(migration,/gmail\.com.*googlemail\.com[\s\S]+?split_part\(v_local, '\+', 1\)[\s\S]+?replace/i,'Gmail dot and plus aliases must canonicalize to one mailbox.');
assert.match(migration,/new\.email_confirmed_at is null/i,'Unverified addresses must not consume or receive a trial.');
assert.match(migration,/after insert on auth\.users/i,'Verified OAuth signups must receive the trial at first registration.');
assert.match(migration,/after update of email_confirmed_at on auth\.users/i,'Email signups must receive the trial only after confirmation.');
assert.match(migration,/on conflict \(email_fingerprint\) do nothing/i,'Deleting and recreating an account must not grant the same mailbox another trial.');
assert.match(migration,/'business',[\s\S]+?'trialing',[\s\S]+?interval '7 days'/i,'The one-time trial must use full TITAN entitlements for exactly seven days.');
assert.match(migration,/subscription\.status = 'trialing'[\s\S]+?subscription\.trial_ends_at > now\(\)/i,'Every entitlement lookup must time-gate the trial.');
assert.match(migration,/create or replace function public\.atsrs_my_personal_trial\(\)/i,'The signed-in UI must be able to display remaining trial time.');
assert.match(migration,/v_plan := private\.atsrs_personal_plan_key\(p_user_id\)/i,'AI CV usage must fall back to Free when the trial expires.');
assert.doesNotMatch(migration,/update\s+auth\.users|delete\s+from\s+auth\.users/i,'The migration must not alter existing Auth users.');

console.log('one-time-signup-trial: PASS');
