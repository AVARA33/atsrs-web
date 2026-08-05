const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'css', 'account.css'), 'utf8');

assert.match(html, /<div class="ref-card cv-card">\s*<div class="cv-main-panel">/);
assert.match(html, /<div class="cv-main-panel">[\s\S]*?id="uploadCVBtn"[\s\S]*?id="deleteCVBtn"[\s\S]*?<\/div>\s*<div class="cv-beta-box">/);
assert.match(html, /<div class="cv-beta-box">[\s\S]*?id="generateCVBtn"/);
assert.equal((html.match(/id="uploadCVBtn"/g)||[]).length, 1);
assert.equal((html.match(/id="previewCVBtn"/g)||[]).length, 1);
assert.equal((html.match(/id="downloadCVBtn"/g)||[]).length, 1);
assert.equal((html.match(/id="deleteCVBtn"/g)||[]).length, 1);
assert.equal((html.match(/id="generateCVBtn"/g)||[]).length, 1);
assert.match(css, /body\.personal-mode #refsPage \.cv-card\{[\s\S]*?grid-template-columns:minmax\(0,1\.25fr\) minmax\(280px,\.75fr\)!important;/);
assert.match(css, /@media\(max-width:720px\)\{[\s\S]*?body\.personal-mode #refsPage \.cv-card\{[\s\S]*?grid-template-columns:1fr!important;/);
assert.match(css, /body\.personal-mode #refsPage \.cv-actions button,[\s\S]*?min-height:40px!important;/);
assert.match(css, /@media\(max-width:720px\)[\s\S]*?min-height:44px!important;/);
assert.match(html, /href="css\/account\.css\?v=419"/);

console.log('References CV workspace layout contracts passed');
