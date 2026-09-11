const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const css = fs.readFileSync(path.join(root, 'css', 'account.css'), 'utf8');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

assert.match(css, /html\[data-theme="light"\] \.atsrs-ai-consent-check span\{[^}]*color:#284258!important;[^}]*-webkit-text-fill-color:#284258!important/s);
assert.match(html, /css\/account\.css\?v=6097/);

console.log('AI consent light-theme contrast contract: ok');
