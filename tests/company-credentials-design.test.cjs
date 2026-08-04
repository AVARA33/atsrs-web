const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const ia = fs.readFileSync(path.join(root, 'css', 'corporate-information-architecture.css'), 'utf8');
const css = fs.readFileSync(path.join(root, 'css', 'corporate-remediation.css'), 'utf8');

assert.equal((html.match(/role="tab" aria-controls="certificatesPage"/g) || []).length, 2);
assert.equal((html.match(/role="tab" aria-controls="refsPage"/g) || []).length, 2);
assert.match(ia, /button\[aria-selected="true"\][\s\S]*background:var\(--atsrs-panel2/);
assert.doesNotMatch(ia, /company-credentials-tabs button\[aria-selected="true"\][\s\S]{0,180}(?:linear-gradient|#0f766e|#22c55e|#e7efff|#8fb0ff|#1649c8)/);
const eyebrow = css.match(/company-credentials-heading>div:first-child>\.pill\{([\s\S]*?)\n\}/);
assert.ok(eyebrow, 'Company Credentials eyebrow rule must exist');
assert.match(eyebrow[1], /background:transparent/);
assert.match(eyebrow[1], /border:0/);
assert.match(css, /body\.company-mode #refsPage \.atsrs-v134-upload[\s\S]*background:var\(--credentials-surface\)/);
assert.doesNotMatch(css, /body\.company-mode #refsPage \.atsrs-v134-upload[\s\S]{0,300}(?:#93c5fd|#bfdbfe|#1649c8)/);
assert.match(css, /#certificatesPage \.cert-mode-buttons[\s\S]*grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
assert.match(css, /#certificatesPage \.cert-mode-buttons button[\s\S]*min-height:var\(--atsrs-control-height\)/);
assert.match(css, /@media\(max-width:720px\)[\s\S]*min-height:var\(--atsrs-touch-height\)/);
assert.match(css, /#certificatesPage \.table-wrap[\s\S]*overflow-x:auto!important/);
assert.match(css, /#refsPage \.atsrs-v134-status\.empty[\s\S]*color:var\(--credentials-muted\)/);
assert.match(css, /html\[data-theme="light"\][\s\S]*--credentials-border-strong:#334155/);

console.log('Company Credentials neutral design contract tests passed');
