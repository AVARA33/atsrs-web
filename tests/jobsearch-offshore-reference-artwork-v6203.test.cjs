const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const runtime = fs.readFileSync('js/jobs-prototype.js', 'utf8');
const css = fs.readFileSync('css/jobs-prototype.css', 'utf8');

test('offshore jobs receive deterministic reference-style backgrounds', () => {
  for (const asset of [
    'offshore-rov-oceaneering.webp',
    'offshore-construction-vessel.webp',
    'offshore-platform-bluehour.webp',
    'subsea-construction-module.webp',
    'offshore-supply-vessel.webp',
    'offshore-survey-vessel.webp'
  ]) {
    assert.equal(fs.existsSync(`assets/job-card-backgrounds/${asset}`), true, `${asset} should exist`);
    assert.match(runtime, new RegExp(asset.replace('.', '\\.')));
  }
  assert.match(runtime, /function jobVisualArtwork\(job\)/);
  assert.match(runtime, /a\.style\.setProperty\('--job-card-art'/);
  assert.match(runtime, /dialog\.style\.setProperty\('--job-card-art'/);
});

test('background approval precedes a shared company-logo position', () => {
  assert.match(css, /\.job-card-brand\{visibility:hidden\}/);
  assert.match(css, /background-position:center,right center!important/);
  assert.match(css, /rgba\(0,0,0,\.58\)/);
  assert.match(css, /rgba\(0,0,0,\.82\)/);
});
