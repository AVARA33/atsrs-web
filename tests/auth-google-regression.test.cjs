const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const storage = fs.readFileSync(path.join(root, 'js', 'storage.js'), 'utf8');

assert.match(storage, /signInWithOAuth\(\{\s*provider:'google'/);
assert.match(storage, /queryParams:googleQueryParams/);
assert.match(storage, /prompt:'select_account'/);
assert.match(storage, /exchangeCodeForSession\(window\.__atsrsOAuthCode\)/);
assert.match(storage, /async function handleSignIn\(user,event\)/);
assert.match(storage, /if\(pHas && !cHas\)\{ await openExistingWorkspace\(user,'personal',state\); return; \}/);
assert.match(storage, /if\(cHas && !pHas\)\{ await openExistingWorkspace\(user,'company',state\); return; \}/);
assert.match(storage, /var lastMode=readLastWorkspace\(user\)/);
assert.match(storage, /if\(lastMode && hasWorkspace\(state,lastMode\)\)\{ await openExistingWorkspace\(user,lastMode,state\); return; \}/);
assert.match(storage, /if\(pHas\|\|cHas\)\{await handleSignIn\(user,event\);return;\}/, 'Google Sign-up with an existing workspace must route as returning user');
assert.match(storage, /if\(!pHas && !cHas\)[\s\S]*?atsrsShowNoWorkspaceConfirmation/, 'unknown Google Sign-in must require explicit account creation');
assert.match(storage, /insert\(\{user_id:user\.id,account_type:mode\}\)/);
assert.match(storage, /if\(result\.error\.code==='23505'\) return \{created:false,duplicate:true\}/);

console.log('Existing Google and workspace routing regression tests passed');
