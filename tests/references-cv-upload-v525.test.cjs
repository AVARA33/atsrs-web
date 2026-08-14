const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'css', 'references-cv-upload-v525.css'), 'utf8');
const fixture = fs.readFileSync(path.join(root, 'tests', 'fixtures', 'references-cv-upload-v525-harness.html'), 'utf8');

assert.match(index, /data-atsrs-build="V534"/);
assert.match(index, /references-cv-upload-v525\.css\?v=525/);
assert.match(index, /class="cv-generator-primary-actions">[\s\S]*?id="generateCVBtn"[\s\S]*?id="uploadCvFromGeneratorBtn"[^>]*onclick="replaceCV\(\)"[^>]*>Upload CV<\/button>/);
assert.equal((index.match(/id="uploadCvFromGeneratorBtn"/g) || []).length, 1);
assert.equal((index.match(/id="cvUploadInput"/g) || []).length, 1);
assert.match(css, /grid-template-columns:repeat\(2,minmax\(0,1fr\)\)!important/);
assert.match(css, /#generateCVBtn,[\s\S]*?#uploadCvFromGeneratorBtn\{[\s\S]*?width:100%!important;[\s\S]*?min-height:40px!important/);
assert.match(css, /@media\(max-width:720px\)[\s\S]*?min-height:44px!important/);
assert.match(css, /@media\(max-width:360px\)[\s\S]*?grid-template-columns:1fr!important/);
assert.match(fixture, /references-cv-upload-v525\.css\?v=525/);
assert.match(fixture, /id="generateCVBtn"[\s\S]*?id="uploadCvFromGeneratorBtn"/);

console.log('V525 AI CV Upload action contracts passed');
