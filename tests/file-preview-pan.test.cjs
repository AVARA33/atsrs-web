const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const runtime = fs.readFileSync(path.join(root, 'js', 'product-experience.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'css', 'product-experience.css'), 'utf8');
const harness = fs.readFileSync(path.join(root, 'tests', 'fixtures', 'file-preview-pan-harness.html'), 'utf8');

assert.match(index, /js\/product-experience\.js\?v=447/);
assert.match(index, /css\/product-experience\.css\?v=447/);
assert.match(runtime, /stage\.scrollWidth>stage\.clientWidth\+1\|\|stage\.scrollHeight>stage\.clientHeight\+1/);
assert.match(runtime, /addEventListener\('pointerdown'/);
assert.match(runtime, /setPointerCapture/);
assert.match(runtime, /stage\.scrollLeft=startLeft-/);
assert.match(runtime, /stage\.scrollTop=startTop-/);
assert.match(runtime, /bindStagePan\(pdfStage\)/);
assert.match(runtime, /bindStagePan\(imageStage\)/);
assert.match(css, /\.file-preview-pdf-stage\.is-pannable[\s\S]*?cursor:grab/);
assert.match(css, /\.file-preview-image-stage\.is-panning[\s\S]*?cursor:grabbing/);
assert.match(harness, /implementation-personal-default\.png/);
assert.match(harness, /js\/product-experience\.js\?v=447/);

console.log('File preview pan contracts passed');
