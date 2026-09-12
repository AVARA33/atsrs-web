const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const runtime = fs.readFileSync(path.join(root, 'js', 'jobs-prototype.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'css', 'jobs-prototype.css'), 'utf8');

assert.match(runtime, /function previewText\(x,limit\)/);
assert.match(runtime, /function readableJobText\(x\)/);
assert.match(runtime, /function readablePreviewText\(x,limit\)/);
assert.match(runtime, /previewText\(rawSummary,420\)/);
assert.match(runtime, /description&&\(!rawSummary\|\|norm\(description\)!==norm\(rawSummary\)\)/);
assert.match(runtime, /el\('section','job-card-description'\)/);
assert.match(runtime, /readablePreviewText\(description,900\)/);
assert.match(runtime, /readablePreviewText\(job\.requirements,600\)/);
assert.match(runtime, /el\('p','',readableJobText\(v\[1\]\)\)/);
assert.doesNotMatch(runtime, /el\('p','',description\)/);
assert.match(css, /\.job-card-description p\{[^}]*-webkit-line-clamp:12/);
assert.match(css, /\.jobs-list \.job-card-description p\{[^}]*-webkit-line-clamp:4/);

console.log('Job cards show bounded, readable description and requirements previews.');
