const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'css', 'dark-surface-standard-v58154.css'), 'utf8');

assert.match(html, /button-content-standard-v58148\.css\?v=58148[\s\S]*dark-surface-standard-v58154\.css\?v=58154/);
assert.match(css, /html\[data-theme="dark"\] body :where\([\s\S]*?\.ref-card[\s\S]*?\.cv-generator-dialog[\s\S]*?background-color:#0b0d0d!important/);
assert.match(css, /\.cv-generator-preview\{background:#101311!important\}/);
assert.match(css, /\.secondary,[\s\S]*?\.cv-generator-preview-actions button[\s\S]*?background:#0b0d0c!important/);
assert.doesNotMatch(css, /html\[data-theme="light"\]/);

console.log('V58154 dark surface standard contracts passed');
