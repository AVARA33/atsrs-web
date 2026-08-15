const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const index = read('index.html');
const app = read('js/app.js');
const qr = read('js/document-qr-upload-v535.js');
const controls = read('css/workspace-control-standard-v522.css');
const theme = read('css/theme.css');

assert.match(index, /data-atsrs-build="V553"/);
assert.match(index, /id="cancelScanModeBtn"[^>]*>Cancel<\/button>/);
assert.ok(index.indexOf('id="uploadDocBtn"') < index.indexOf('id="cancelScanModeBtn"'));

assert.match(app, /function setDocumentMethodState\(method\)/);
assert.match(app, /button\.setAttribute\('aria-pressed',selected\?'true':'false'\)/);
assert.match(app, /scanPanel\.classList\.toggle\('active',method==='scan'\)/);
assert.match(app, /manualPanel\.classList\.toggle\('active',method==='manual'\)/);
assert.match(app, /cancelScan\.onclick=function\(e\).*?closeDocumentMethod\(\)/);
assert.match(qr, /atsrsSetDocumentMethodState\('qr'\)/);
assert.match(qr, /atsrsSetDocumentMethodState\(''\)/);

assert.match(controls, /#certificatesPage \.cert-mode-buttons button\.active[\s\S]*?background:var\(--atsrs-control-accent\)!important/);
assert.match(theme, /#certificatesPage \.cert-mode-buttons button\.active[\s\S]*?background: #e7efff !important/);

console.log('V541 document method selection tests passed');
