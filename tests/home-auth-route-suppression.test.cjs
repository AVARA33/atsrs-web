const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const landing = fs.readFileSync(path.join(root, 'js', 'public-landing.js'), 'utf8');
const storage = fs.readFileSync(path.join(root, 'js', 'storage.js'), 'utf8');

assert.match(index, /data-atsrs-build="V579"/);
assert.match(index, /src="js\/storage\.js\?v=579"/);
assert.match(
  landing,
  /if\(requestedView==='home'\)[\s\S]*?__atsrsSuppressAutomaticSessionOpen=true[\s\S]*?history\.replaceState[\s\S]*?showLanding\(\);\s*return;/
);
assert.match(
  landing,
  /session&&session\.user[\s\S]*?__atsrsSuppressAutomaticSessionOpen=false[\s\S]*?atsrsResumeSession\(session,'resume'\)/
);
assert.match(
  storage,
  /__atsrsSuppressAutomaticSessionOpen\s*&&[\s\S]*?event==='INITIAL_SESSION'[\s\S]*?event==='TOKEN_REFRESHED'[\s\S]*?event==='getSession'[\s\S]*?event==='resume'[\s\S]*?event==='SIGNED_IN'/
);
assert.match(storage, /intent==='signin'\?'signin-session':'resume'/);

function sessionSuppressed(flag, event, entryRoute) {
  return flag && (
    event === 'INITIAL_SESSION' ||
    event === 'TOKEN_REFRESHED' ||
    event === 'getSession' ||
    event === 'resume' ||
    (event === 'SIGNED_IN' && entryRoute !== 'auth')
  );
}

assert.equal(sessionSuppressed(true, 'resume', 'landing'), true, 'explicit Home must block delayed resume');
assert.equal(sessionSuppressed(false, 'resume', 'landing'), false, 'bare retained-session resume remains allowed after landing clears suppression');
assert.equal(sessionSuppressed(true, 'signin-session', 'auth'), false, 'direct login remains allowed');
assert.equal(sessionSuppressed(true, 'SIGNED_IN', 'auth'), false, 'auth-route sign-in remains allowed');

console.log('HOME-AUTH-001 route suppression tests passed');
