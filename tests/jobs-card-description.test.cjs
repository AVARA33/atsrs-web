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
assert.match(runtime, /function cardDisclosure\(card,kind,labelText,text,missing\)/);
assert.match(runtime, /el\('button','job-card-disclosure-toggle job-card-'\+kind\+'-toggle'\)/);
assert.match(runtime, /el\('span','job-card-disclosure-symbol job-card-'\+kind\+'-symbol','\+'\)/);
assert.match(runtime, /toggle\.setAttribute\('aria-expanded','false'\)/);
assert.match(runtime, /content\.hidden=true/);
assert.match(runtime, /slot\.style\.height=slot\.getBoundingClientRect\(\)\.height\+'px'/);
assert.match(runtime, /slot\.classList\.add\('is-disclosure-open'\)/);
assert.match(runtime, /function ensureCardDisclosureBackdrop\(\)/);
assert.match(runtime, /backdrop\.onclick=function\(\)\{document\.querySelectorAll\('\.job-card-slot\.is-disclosure-open'\)\.forEach\(closeCardDisclosures\)\}/);
assert.match(runtime, /readableJobText\(description\)/);
assert.match(runtime, /cardDisclosure\(a,'requirements','Requirements',readableJobText\(job\.requirements\),false\)/);
assert.match(runtime, /el\('p','',readableJobText\(v\[1\]\)\)/);
assert.doesNotMatch(runtime, /el\('p','',description\)/);
assert.match(css, /\.job-card-description p\{display:block;margin:0;overflow:visible/);
assert.match(css, /\.jobs-cards \.job-card-summary\{[^}]*-webkit-line-clamp:3/);
assert.match(css, /\.job-card-requirements-content span\{display:block;overflow:visible;white-space:pre-line\}/);
assert.match(css, /\.job-card-slot\.is-disclosure-open>\.job-card\{position:absolute/);
assert.match(css, /\.job-card-slot\.is-disclosure-open\{z-index:80\}/);
assert.match(css, /\.job-card-disclosure-backdrop\{position:fixed;z-index:70;inset:0;[^}]*backdrop-filter:blur\(4px\)/);
assert.match(css, /\.job-card-disclosure-content\[hidden\]\{display:none!important\}/);
assert.match(css, /#jobsPage \.job-card-disclosure-toggle\{[^}]*height:auto!important;min-height:0!important;[^}]*padding:0!important;[^}]*border:0!important;[^}]*background:transparent!important;[^}]*box-shadow:none!important/);
assert.match(runtime, /Missing — manual review required/);

console.log('Job descriptions and requirements disclose above the fixed card grid without page reflow.');
