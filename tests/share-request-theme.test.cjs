const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const css = fs.readFileSync(path.join(root, 'css', 'share-profile.css'), 'utf8');
const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

assert.doesNotMatch(css, /\.share-request-dialog\{[^}]*linear-gradient/, 'request dialog must not use the legacy blue gradient');
assert.match(css, /\.share-request-dialog\{[^}]*background:#fff/, 'light request dialog must use a white surface');
assert.match(css, /html\[data-theme="dark"\] \.share-request-dialog\{[^}]*background:#0b0d0d/, 'dark request dialog must use the neutral ATSRS black surface');
assert.match(css, /\.share-request-dialog input:focus[^}]*border-color:#2879b8!important/, 'light request inputs must use the blue standard focus');
assert.match(css, /html\[data-theme="dark"\] \.share-request-dialog input:focus[^}]*border-color:#36c85b!important/, 'dark request inputs must use the green standard focus');
assert.match(index, /css\/share-profile\.css\?v=510/, 'the browser must receive the refreshed request dialog theme');
assert.match(index, />Send verification code<\/button>/, 'the first request action must describe the OTP step accurately');
assert.doesNotMatch(index, />Verify Email &amp; Send Request<\/button>/, 'the OTP action must not claim that the request is already sent');

console.log('Share request theme contracts passed');
