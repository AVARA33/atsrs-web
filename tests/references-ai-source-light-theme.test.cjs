const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'css', 'references-workspace-v5984.css'), 'utf8');

assert.match(html, /href="css\/references-workspace-v5984\.css\?v=59850"/);
assert.match(css,/html\[data-theme="light"\] body\.personal-mode #app #refsPage #cvCardTitle\{color:var\(--atsrs-light-blue,#2563eb\)!important;/);
assert.match(css, /html\[data-theme="light"\] body\.personal-mode #app #refsPage\[data-references-workspace="v5984"\] #aiCvSourceStatus,[\s\S]*?#aiCvSourceStatus\.is-ready\{[\s\S]*?background:#fff!important;[\s\S]*?border-color:#ced8d2!important;[\s\S]*?color:#1d2822!important;/);

console.log('References AI source light-theme contract passed');
