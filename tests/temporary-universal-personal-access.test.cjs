const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const sql=fs.readFileSync(path.resolve(__dirname,'../supabase/migrations/20260828000500_temporary_universal_personal_access.sql'),'utf8');
const index=fs.readFileSync(path.resolve(__dirname,'../index.html'),'utf8');

assert.match(sql,/drop trigger if exists atsrs_grant_verified_signup_trial_on_insert/i,'Automatic trial grants must be disabled.');
assert.match(sql,/drop trigger if exists atsrs_grant_verified_signup_trial_on_confirmation/i,'Confirmed-email trial grants must be disabled.');
assert.match(sql,/case when p_user_id is null then 'free' else 'business' end/i,'Every authenticated Personal account must temporarily receive full entitlements.');
assert.match(sql,/select false, null::text, null::timestamptz, null::timestamptz, 0::bigint/i,'The UI trial status must be disabled.');
assert.doesNotMatch(index,/Start (?:7-day|1-month) trial/i,'The public site must not advertise a trial during manual launch access.');
assert.doesNotMatch(index,/id="googleSignupBtn"/i,'The auth card must expose login only.');

console.log('temporary-universal-personal-access: PASS');
