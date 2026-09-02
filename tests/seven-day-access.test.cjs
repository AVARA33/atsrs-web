const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const {formatRemaining, fullAt} = require('../js/access-window-v6012.js');
const sql = fs.readFileSync(path.join(root,'supabase/migrations/20260902221128_seven_day_access_windows.sql'),'utf8');
test('exact seven-day countdown, rollover and expiry boundary',()=>{
  assert.equal(formatRemaining(7*86400000),'7d 00h 00m 00s');
  assert.equal(formatRemaining(90061000),'1d 01h 01m 01s');
  assert.equal(formatRemaining(-1000),'0d 00h 00m 00s');
  const state={full_access:true,ends_at:'2026-09-10T00:00:00Z'};
  const end=Date.parse(state.ends_at);
  assert.equal(fullAt(state,end-1),true); assert.equal(fullAt(state,end),false);
  assert.equal(fullAt({...state,permanent:true},end+1),true);
  assert.equal(fullAt({full_access:true},end),true);
  assert.equal(fullAt({full_access:false},end),false);
  assert.equal(fullAt(null,end),false);
});
test('server authorization, exceptions, registration origin and non-destructive limits',()=>{
  assert.match(sql,/atsrs_permanent_full_access/); assert.match(sql,/atsrs_free_plan_test/);
  assert.match(sql,/coalesce\(new.created_at, now\(\)\)/);
  assert.match(sql,/private\.atsrs_accessible_files/); assert.match(sql,/as restrictive for select/);
  assert.match(sql,/pg_advisory_xact_lock/); assert.doesNotMatch(sql,/delete from public\.atsrs_files/i);
  assert.match(sql,/perform 1 from public\.atsrs_get_developer_registrations/);
  assert.match(sql,/revoke all on function public\.atsrs_service_file_access\(uuid,uuid\) from public,anon,authenticated/);
});
test('every server signed-document route checks file allowance',()=>{
  for(const name of ['share-profile','talent-profile-actions']) assert.match(fs.readFileSync(path.join(root,'supabase/functions',name,'index.ts'),'utf8'),/atsrs_service_file_access/);
  assert.match(sql,/atsrs_authorize_recipient_document[\s\S]*private\.atsrs_accessible_files\(share_row.owner_user_id\)/);
  assert.match(fs.readFileSync(path.join(root,'supabase/functions/document-qr-upload/index.ts'),'utf8'),/atsrs_service_upload_access/);
});
test('clock uses server anchor, no client persisted entitlement or second-by-second network calls',()=>{
 const js=fs.readFileSync(path.join(root,'js/access-window-v6012.js'),'utf8');
 assert.match(js,/Date.parse\(state.server_now\)/); assert.match(js,/performance.now\(\) - anchoredAt/);
 assert.doesNotMatch(js,/localStorage|Date.now\(\)/); assert.match(js,/60000/);
 assert.match(js,/token !== requestId/);
 assert.match(js,/expired = !!\(state.ends_at && !state.permanent && Date.parse\(state.ends_at\) <= serverTime\)/);
});
