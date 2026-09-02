const assert = require('node:assert/strict');
const fs = require('node:fs');
const css = fs.readFileSync('css/qr-phone-upload-v535.css', 'utf8');
const page = fs.readFileSync('qr-upload.html', 'utf8');
assert.match(css, /:root\[data-theme="light"\][^{]*\{[^}]*--accent:#2563eb/);
assert.match(css, /:root\[data-theme="light"\] \.phone-upload-choices #chooseFileBtn\{color:var\(--accent\)\}/);
assert.match(css, /\.phone-upload-choices button\.secondary\{[^}]*color:var\(--text\)/, 'Dark button text remains unchanged');
assert.match(page, /qr-phone-upload-v535\.css\?v=541/);
console.log('QR choose-file light-theme regression passed');
