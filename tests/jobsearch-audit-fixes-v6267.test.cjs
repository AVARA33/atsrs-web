const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const runtime = fs.readFileSync('js/jobs-prototype.js', 'utf8');
const loader = fs.readFileSync('js/route-feature-loader.js', 'utf8');
const index = fs.readFileSync('index.html', 'utf8');

test('generic job backgrounds never show another company brand', () => {
  const visual = runtime.match(/function jobVisualArtwork\(job\)\{[^\n]+/)[0];
  const generic = visual.match(/generic=\[([^\]]+)\]/)[1];
  assert.doesNotMatch(generic, /subsea-construction-module/);
  assert.doesNotMatch(generic, /offshore-rov-oceaneering\.webp/);
  assert.match(generic, /offshore-platform-bluehour\.webp/);
});

test('known Pioneer and HPR variants use their verified local logo assets', () => {
  assert.match(runtime, /pioneer\\s\+subsea.*pioneersubsea\.co\.uk\.webp/);
  assert.match(runtime, /hydro professional resources.*hpruk\.com\.png/);
});

test('saved job icon remains visible with the loaded regular icon font', () => {
  assert.match(runtime, /if\(icon\)icon\.className='ph ph-bookmark-simple'/);
  assert.doesNotMatch(runtime, /ph-bookmark-simple-fill/);
});

test('job detail dialog supports Escape and decorative CTA icon is hidden', () => {
  assert.match(runtime, /addEventListener\('cancel',function\(e\)\{e\.preventDefault\(\);dismissDetails\(dialog\)\}\)/);
  assert.match(runtime, /viewIcon\.setAttribute\('aria-hidden','true'\)/);
});

test('pagination reports the visible range and release cache is bumped', () => {
  assert.match(runtime, /var first=jobs\.length\?\(page-1\)\*PAGE\+1:0,last=/);
  assert.match(runtime, /first\+'–'\+last/);
  assert.match(loader, /jobs-prototype\.js\?v=6267/);
  assert.match(index, /data-atsrs-build="V6267"/);
});
