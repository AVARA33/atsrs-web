const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const storage=fs.readFileSync(path.resolve(__dirname,'../js/storage.js'),'utf8');
const index=fs.readFileSync(path.resolve(__dirname,'../index.html'),'utf8');
const gate=fs.readFileSync(path.resolve(__dirname,'../supabase/migrations/20260827235500_owner_only_corporate_workspace_gate.sql'),'utf8');

assert.match(storage,/if\(hasWorkspace\(state,pendingMode\)\)\{[\s\S]+?await openExistingWorkspace\(user,pendingMode,state\)/i,'An authenticated existing account must open instead of stopping on an already-exists message.');
assert.match(storage,/mode==='company' && ctx==='signup'[\s\S]+?Corporate Account is in development/i,'Corporate signup must be stopped before OAuth starts.');
assert.match(index,/id="googleSigninBtn"[\s\S]+?>Sign in<\/button>/i,'The public auth screen must retain sign in.');
assert.match(index,/id="googleSignupBtn"[\s\S]+?>Sign up<\/button>/i,'The pre-trial auth screen must retain ordinary registration.');
assert.match(gate,/account_type = 'personal'[\s\S]+?atsrs_admin_users/i,'Corporate workspace access must be limited to the owner/admin allowlist in the database.');

console.log('existing-account-trial-login: PASS');
