const assert = require('node:assert/strict');
const fs = require('node:fs');

const html = fs.readFileSync('index.html', 'utf8');
const css = fs.readFileSync('css/documents-register-v5976.css', 'utf8');
const app = fs.readFileSync('js/app.js', 'utf8');

assert.match(html, /data-atsrs-build="V5978"/);
assert.match(html, /class="atsrs-documents-heading personal-only"/);
assert.match(html, /id="documentSummaryValid"/);
assert.match(html, /id="documentSummaryExpiring"/);
assert.match(html, /id="documentSummaryNoExpiry"/);
assert.match(html, /css\/documents-register-v5976\.css\?v=5978/);

assert.match(app, /function updateDocumentSummary\(rows\)/);
assert.match(app, /function documentIconData\(item\)/);
assert.match(app, /ph ph-eye/);
assert.match(app, /ph ph-pencil-simple/);
assert.match(app, /ph ph-trash/);
assert.match(app, /Number\(st\.days\)>0&&Number\(st\.days\)<=90\?'is-expiring'/);

assert.match(css, /#certificatesPage \.atsrs-documents-summary/);
assert.match(css, /grid-template-columns:1\.2fr \.92fr 1fr!important/);
assert.match(css, /#certificatesPage \.atsrs-document-type-icon/);
assert.match(css, /#certificatesPage \.atsrs-document-filter::before\{[\s\S]*?right:13px/);
assert.match(css, /padding:0 42px 0 12px!important/);
assert.match(css, /html\[data-theme="light"\] body\.personal-mode/);
assert.match(css, /@media\(max-width:800px\)/);

console.log('Documents register V5976 checks passed.');
