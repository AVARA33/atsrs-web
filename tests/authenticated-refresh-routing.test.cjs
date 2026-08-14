const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const landing = fs.readFileSync(path.join(root, 'js', 'public-landing.js'), 'utf8');
const storage = fs.readFileSync(path.join(root, 'js', 'storage.js'), 'utf8');

assert.match(index, /data-atsrs-build="V539"/);
assert.equal((index.match(/js\/public-landing\.js\?v=536/g) || []).length, 1);
assert.ok(index.indexOf('js/public-landing.js?v=536') < index.indexOf('js/boot-refresh.js?v=443'), 'public route must resolve before the boot fallback can reveal auth');
assert.match(index, /__atsrsEntryRoute==='auth'\|\|window\.__atsrsEntryRoute==='share'\|\|window\.__atsrsEntryRoute==='landing'/);
assert.doesNotMatch(index, /__atsrsEntryRoute!==['"]callback['"]/);
assert.match(landing, /atsrsGetSessionSingleFlight/);
assert.match(landing, /session&&session\.user/);
assert.match(landing, /__atsrsSuppressAutomaticSessionOpen=false/);
assert.match(landing, /atsrsResumeSession\(session,'resume'\)/);
assert.match(landing, /if\(!client\|\|!client\.auth\)/);
assert.match(landing, /function hasRetainedSessionHint\(\)[\s\S]*?atsrs_auth_mode[\s\S]*?supabase/);
assert.match(landing, /if\(callback\|\|publicShare\)return;\s*var retainedSessionHint=hasRetainedSessionHint\(\);\s*if\(!retainedSessionHint\)showLanding\(\);\s*var client=/);
assert.match(landing, /catch\(function\(error\)[\s\S]*?showLanding\(\)/);
assert.match(storage, /function prepareAuthenticatedRoute\(\)[\s\S]*?__atsrsEntryRoute='app'/);
assert.match(storage, /function handlePassiveRestore\(user,event\)/);
assert.match(storage, /function handlePassiveRestore\(user,event\)[\s\S]*?var lastMode=readLastWorkspace\(user\)[\s\S]*?if\(lastMode && hasWorkspace\(state,lastMode\)\)[\s\S]*?var pickRequired=/);
assert.match(storage, /ATSRS passive workspace restore failed[\s\S]*?return false/);
assert.doesNotMatch(storage, /ATSRS passive workspace restore failed[^}]*?returnToLogin/);
assert.match(storage, /if\(event==='resume'\) return handlePassiveRestore\(user,event\)/);
assert.match(landing, /atsrsResumeSession\(session,'resume'\)[\s\S]*?if\(opened===false\)showLanding\(\)/);

console.log('Authenticated refresh routing regression tests passed');
