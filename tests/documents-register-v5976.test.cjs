const assert = require('node:assert/strict');
const fs = require('node:fs');

const html = fs.readFileSync('index.html', 'utf8');
const css = fs.readFileSync('css/documents-register-v5976.css', 'utf8');
const app = fs.readFileSync('js/app.js', 'utf8');
const serverData = fs.readFileSync('js/server-data.js', 'utf8');

assert.match(html, /data-atsrs-build="V5983"/);
assert.match(html, /class="atsrs-documents-heading personal-only"/);
assert.match(html, /id="documentSummaryValid"/);
assert.match(html, /id="documentSummaryExpiring"/);
assert.match(html, /id="documentSummaryNoExpiry"/);
assert.match(html, /css\/documents-register-v5976\.css\?v=5983/);
assert.match(html, /id="documentMethodBackdrop"/);
assert.match(html, /id="certScanPanel"[^>]+role="dialog"[^>]+aria-modal="true"/);
assert.match(html, /id="certManualPanel"[^>]+role="dialog"[^>]+aria-modal="true"/);
assert.match(html, /id="closeCertScanModalBtn"/);
assert.match(html, /id="closeCertManualModalBtn"/);

assert.match(app, /function updateDocumentSummary\(rows\)/);
assert.match(app, /function documentIconData\(item\)/);
assert.match(app, /ph ph-eye/);
assert.match(app, /ph ph-pencil-simple/);
assert.match(app, /ph ph-trash/);
assert.match(app, /Number\(st\.days\)>0&&Number\(st\.days\)<=90\?'is-expiring'/);
assert.match(app, /document\.body\.classList\.toggle\('atsrs-document-method-open',modalOpen\)/);
assert.match(app, /event\.key!==\'Escape\'/);
assert.match(app, /methodBackdrop\.addEventListener\('click'/);
assert.match(app, /function updateDocumentListScroll\(visibleCount\)/);
assert.match(app, /Number\(visibleCount\)>7/);
assert.match(app, /querySelectorAll\('tr'\),0,7/);
assert.match(app, /updateDocumentListScroll\(rows\.length\)/);
assert.match(serverData, /if\(pageName==='certificates'\)\{if\(control\)control\.remove\(\);return;\}/);

assert.match(css, /#certificatesPage \.atsrs-documents-summary/);
assert.match(css, /grid-template-columns:repeat\(3,minmax\(0,1fr\)\)!important/);
assert.match(css, /max-width:none!important;[\s\S]*?width:100%!important/);
assert.match(css, /#certificatesPage \.atsrs-document-type-icon/);
assert.match(css, /#certificatesPage \.atsrs-document-filter::before\{[\s\S]*?right:13px/);
assert.match(css, /padding:0 42px 0 12px!important/);
assert.match(css, /html\[data-theme="light"\] body\.personal-mode/);
assert.match(css, /@media\(max-width:800px\)/);
assert.match(css, /\.atsrs-document-method-backdrop/);
assert.match(css, /box-shadow:0 0 0 100vmax rgba\(0,3,4,\.55\)/);
assert.match(css, /#certScanPanel\.cert-mode-panel\.active[\s\S]*?display:block!important/);
assert.match(css, /background:rgba\(0,3,4,\.72\)/);
assert.match(css, /\.atsrs-field-shell:has\(> #ocrRawText\)\{display:none!important\}/);
assert.match(css, /\.table-wrap\.atsrs-document-list-scroll/);
assert.match(css, /max-height:var\(--atsrs-document-list-max-height,445px\)!important/);
assert.match(css, /\.main:has\(#certificatesPage:not\(\.hidden\)\)[\s\S]*?height:100dvh!important;[\s\S]*?overflow:hidden!important/);
assert.match(css, /position:sticky!important/);
assert.match(css, /table tbody \.atsrs-document-status\.is-valid/);
assert.match(css, /#deleteSelectedCertsBtn\{[\s\S]*?background:#fff5f6!important/);
assert.match(css, /\.atsrs-document-sort\{[\s\S]*?background:transparent!important/);
assert.match(css, /#certManualPanel > \.sub\{color:#5c6b74!important/);

console.log('Documents register V5976 checks passed.');
