const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const runtime = fs.readFileSync('js/jobs-prototype.js', 'utf8');
const css = fs.readFileSync('css/jobs-prototype.css', 'utf8');

test('offshore jobs receive deterministic reference-style backgrounds', () => {
  for (const asset of [
    'offshore-rov-oceaneering-hd.png',
    'offshore-technipfmc-hd.png',
    'offshore-saipem-clean-hd.png',
    'offshore-subsea7-hd.png',
    'offshore-dof-hd.png',
    'offshore-fugro-hd.png'
  ]) {
    assert.equal(fs.existsSync(`assets/job-card-backgrounds/${asset}`), true, `${asset} should exist`);
    assert.match(runtime, new RegExp(asset.replace('.', '\\.')));
  }
  assert.match(runtime, /function jobVisualArtwork\(job\)/);
  assert.match(runtime, /a\.style\.setProperty\('--job-card-art'/);
  assert.match(runtime, /dialog\.style\.setProperty\('--job-card-art'/);
  assert.match(runtime, /if\(\/oceaneering\/\.test\(company\)\)return branded\[0\]/);
  assert.match(runtime, /if\(\/saipem\/\.test\(company\)\)return branded\[2\]/);
  assert.doesNotMatch(runtime, /offshore-saipem-hd\.png/);
  assert.match(runtime, /\.\.\/assets\/job-card-backgrounds\/offshore-rov-oceaneering-hd\.png/);
});

test('approved backgrounds preserve a shared company-logo position', () => {
  assert.match(css, /\.job-card-brand\{[\s\S]*visibility:visible!important/);
  assert.match(css, /background-position:center,right center!important/);
  assert.match(css, /rgba\(0,0,0,\.58\)/);
  assert.match(css, /rgba\(0,0,0,\.82\)/);
});
