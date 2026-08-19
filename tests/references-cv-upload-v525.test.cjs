const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'css', 'references-cv-upload-v525.css'), 'utf8');
const fixture = fs.readFileSync(path.join(root, 'tests', 'fixtures', 'references-cv-upload-v525-harness.html'), 'utf8');
const runtime = fs.readFileSync(path.join(root, 'js', 'cv-generator.js'), 'utf8');

assert.match(index, /data-atsrs-build="V5812"/);
assert.match(index, /references-cv-upload-v525\.css\?v=58152/);
assert.match(index, /class="cv-generator-action-grid">[\s\S]*?id="uploadCvFromGeneratorBtn"[^>]*>Upload \/ Replace CV<\/button>[\s\S]*?id="generateCVBtn"[\s\S]*?id="resetCvGeneratorBtn"[\s\S]*?id="generatedCvActions"[\s\S]*?id="previewGeneratedCvBtn"[\s\S]*?id="printGeneratedCvBtn"/);
assert.doesNotMatch(index, /id="(?:addGeneratedCvBtn|replaceMainWithGeneratedCvBtn)"/);
assert.match(runtime, /\['uploadCvFromGeneratorBtn',choose\]/);
assert.match(runtime, /\['generateCVBtn',function\(\)\{return generate\(false\)\}\]/);
assert.equal((index.match(/id="uploadCvFromGeneratorBtn"/g) || []).length, 1);
assert.equal((index.match(/id="cvUploadInput"/g) || []).length, 1);
assert.equal((index.match(/id="aiCvUploadInput"/g) || []).length, 1);
assert.match(css, /grid-template-columns:repeat\(2,minmax\(0,1fr\)\)!important/);
assert.match(css, /\.generated-cv-actions:not\(\.hidden\)\{[\s\S]*?display:contents!important/);
assert.match(css, /\.generated-cv-actions\.hidden\{[\s\S]*?display:none!important/);
assert.match(css, /\.cv-generator-action-grid > button,[\s\S]*?\.generated-cv-actions > button\{[\s\S]*?width:100%!important;[\s\S]*?height:44px!important/);
assert.match(css, /@media\(max-width:480px\)[\s\S]*?grid-template-columns:1fr!important/);
assert.match(fixture, /references-cv-upload-v525\.css\?v=58152/);
assert.match(runtime, /aiCvSource=null,generatedCv=null,profileMain=/);

console.log('V525 AI CV Upload action contracts passed');
