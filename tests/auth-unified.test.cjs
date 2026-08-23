const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const auth = fs.readFileSync(path.join(root, 'js', 'auth-unified.js'), 'utf8');
const storage = fs.readFileSync(path.join(root, 'js', 'storage.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'css', 'auth-unified.css'), 'utf8');
const workspaceSql = fs.readFileSync(path.join(root, 'supabase', 'atsrs_workspaces.sql'), 'utf8');

assert.match(index, /id="authGoogleBtn"[\s\S]*?Continue with Google/);
assert.match(index, /id="authEmailRevealBtn"[\s\S]*?Continue with email/);
assert.match(index, /id="authEmailPanel"[\s\S]*?autocomplete="email"[\s\S]*?autocomplete="current-password"/);
assert.equal((index.match(/id="authEmail"/g) || []).length, 1, 'email auth field must not be duplicated');
assert.equal((index.match(/id="googleChoiceArea"/g) || []).length, 1, 'workspace chooser must not be duplicated');
assert.match(index, /id="authVerificationPanel"/);
assert.match(index, /id="authNoWorkspacePanel"/);
assert.match(index, /id="authResendBtn"/);

assert.match(auth, /signUp\(\{email:email,password:password,options:\{emailRedirectTo:redirectUrl\('signup'\),data:\{source:'atsrs-web',app:'ATSRS'\}\}\}\)/);
assert.doesNotMatch(auth, /account_type|atsrs_account_type|use_mode/);
assert.match(auth, /signInWithPassword\(\{email:email,password:password\}\)/);
assert.match(auth, /resetPasswordForEmail\(email,\{redirectTo:redirectUrl\('recovery'\)\}\)/);
assert.match(auth, /resend\(\{type:'signup',email:email/);
assert.match(auth, /mode==='signup'&&password\.length<8/);
assert.match(auth, /window\.updatePassword=async function/);
assert.match(auth, /Password updated successfully\./);
assert.match(auth, /email.*not.*confirm/);
assert.match(auth, /\^\(127\\\.0\\\.0\\\.1\|localhost\)\$/);
assert.doesNotMatch(index, /id="authEmailPanel"[\s\S]*?Confirm password[\s\S]*?<\/form>/);

assert.match(storage, /async function handleSignUp\(user,event\)[\s\S]*?if\(pHas\|\|cHas\)\{await handleSignIn\(user,event\);return;\}[\s\S]*?showRecoveredSignupChoice\(user\)/);
assert.match(storage, /async function handleSignIn\(user,event\)[\s\S]*?if\(!pHas && !cHas\)[\s\S]*?atsrsShowNoWorkspaceConfirmation/);
assert.match(workspaceSql, /primary key \(user_id, account_type\)/);
assert.match(storage, /if\(result\.error\.code==='23505'\) return \{created:false,duplicate:true\}/);
assert.match(storage, /window\.atsrsStartGoogleSignUp/);
assert.doesNotMatch(storage, /if\(intent==='signup' && pendingMode!=='personal'/);

assert.match(css, /#auth \.auth-card/);
assert.match(css, /html\[data-theme="light"\] #auth/);
assert.match(css, /@media\(max-width:420px\)/);
assert.match(css, /focus-visible/);

console.log('Unified authentication contract tests passed');
