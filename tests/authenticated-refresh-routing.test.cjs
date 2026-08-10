const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const landing = fs.readFileSync(path.join(root, 'js', 'public-landing.js'), 'utf8');
const storage = fs.readFileSync(path.join(root, 'js', 'storage.js'), 'utf8');

assert.match(index, /data-atsrs-build="V474"/);
assert.match(index, /__atsrsEntryRoute==='auth'\|\|window\.__atsrsEntryRoute==='share'/);
assert.doesNotMatch(index, /__atsrsEntryRoute!==['"]callback['"]/);
assert.match(landing, /atsrsGetSessionSingleFlight/);
assert.match(landing, /session&&session\.user/);
assert.match(landing, /__atsrsSuppressAutomaticSessionOpen=false/);
assert.match(landing, /atsrsResumeSession\(session,'resume'\)/);
assert.match(landing, /if\(!client\|\|!client\.auth\)/);
assert.match(landing, /catch\(function\(error\)[\s\S]*?showLanding\(\)/);
assert.match(storage, /function prepareAuthenticatedRoute\(\)[\s\S]*?__atsrsEntryRoute='app'/);
assert.match(storage, /function handlePassiveRestore\(user,event\)/);

console.log('Authenticated refresh routing regression tests passed');
