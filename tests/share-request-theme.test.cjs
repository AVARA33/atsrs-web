const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const css = fs.readFileSync(path.join(root, 'css', 'share-profile.css'), 'utf8');
const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

assert.doesNotMatch(css, /\.share-request-dialog\{[^}]*linear-gradient/, 'request dialog must not use the legacy blue gradient');
assert.match(css, /\.share-request-dialog\{[^}]*background:#fff/, 'light request dialog must use a white surface');
assert.match(css, /html\[data-theme="dark"\] \.share-request-dialog\{[^}]*background:#0b0d0d/, 'dark request dialog must use the neutral ATSRS black surface');
assert.match(css, /\.share-request-dialog \.share-request-field\.atsrs-field-shell:focus-within[^}]*border-color:var\(--atsrs-field-focus-block-line\) var\(--atsrs-field-focus-inline-line\)!important/, 'request field shells must use the canonical field borders');
assert.match(css, /\.share-request-dialog \.share-request-field\.atsrs-field-shell:focus-within[^}]*box-shadow:var\(--atsrs-field-focus-shadow\)!important/, 'request field shells must use the exact canonical search shadow');
assert.match(css, /\.share-request-dialog \.share-request-field\.atsrs-field-shell\{[^}]*background:var\(--atsrs-field-surface,#fff\)!important/, 'request field shells must use the canonical theme surface instead of the legacy blue background');
assert.match(css, /\.share-request-dialog \.share-request-field>input:-webkit-autofill[^}]*1000px var\(--atsrs-field-surface\) inset/, 'browser autofill must not replace the canonical light field surface');
assert.match(css, /\.share-request-dialog \.share-request-field>input:-webkit-autofill[^}]*-webkit-text-fill-color:var\(--atsrs-field-text\)!important/, 'browser autofill must retain canonical text contrast');
assert.match(index, /class="share-request-field atsrs-field-shell"><span class="atsrs-field-label">Full name<\/span>/, 'request fields must use the same shell structure as canonical search controls');
assert.match(index, /css\/share-profile\.css\?v=515/, 'the browser must receive the refreshed request dialog theme');
assert.match(index, />Send verification code<\/button>/, 'the first request action must describe the OTP step accurately');
assert.doesNotMatch(index, />Verify Email &amp; Send Request<\/button>/, 'the OTP action must not claim that the request is already sent');

console.log('Share request theme contracts passed');
