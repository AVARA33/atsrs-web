const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const runtime = fs.readFileSync(path.join(root, 'js', 'jobs-prototype.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'css', 'jobs-prototype.css'), 'utf8');

assert.match(runtime, /function previewText\(x,limit\)/);
assert.match(runtime, /previewText\(job\.summary\|\|job\.description,420\)/);
assert.doesNotMatch(runtime, /el\('p','',description\)/);
assert.match(css, /\.job-card-description p\{[^}]*-webkit-line-clamp:12/);
assert.match(css, /\.jobs-list \.job-card-description p\{[^}]*-webkit-line-clamp:4/);

console.log('Job cards keep source descriptions out of the initial DOM and show a bounded preview.');
