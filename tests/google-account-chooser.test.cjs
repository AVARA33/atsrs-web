const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const storage = fs.readFileSync(path.join(root, 'js', 'storage.js'), 'utf8');

const oauthStart = storage.match(
  /async function startGoogle\(ev,intent\)\{([\s\S]*?)\n  \}\n  window\.atsrsHandleAccountTypeChoice=/
);

assert.ok(oauthStart, 'Google OAuth start function must remain present');
assert.match(
  oauthStart[1],
  /var googleQueryParams=\{prompt:'select_account'\}/,
  'explicit Google sign-in and sign-up must request the account chooser'
);
assert.doesNotMatch(
  oauthStart[1],
  /googleQueryParams\s*=\s*\{login_hint|localStorage\.getItem\('atsrs_last_google_email'\)/,
  'OAuth start must not suppress account selection with the last Google identity'
);
assert.match(
  oauthStart[1],
  /queryParams:googleQueryParams[\s\S]*?skipBrowserRedirect:true/,
  'the existing Supabase redirect contract must remain unchanged'
);
assert.match(index, /src="js\/storage\.js\?v=584"/);

console.log('Google account chooser regression tests passed');
