const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const css = fs.readFileSync('css/jobs-prototype.css', 'utf8');
const runtime = fs.readFileSync('js/jobs-prototype.js', 'utf8');

test('JobSearch cards use the approved dark editorial layout', () => {
  assert.match(css, /V6194: reference-led editorial job cards/);
  assert.match(css, /--jobs-copper:#ac613b/);
  assert.match(css, /--jobs-page:#0c0d0e/);
  assert.match(css, /min-height:344px/);
  assert.match(css, /linear-gradient\(180deg,rgba\(0,0,0,\.12\).*rgba\(0,0,0,\.94\)/s);
  assert.match(css, /\.job-card-brand\{position:absolute;top:18px/);
  assert.match(css, /\.job-card-tags/);
  assert.match(css, /\.job-fact-location.*\.job-fact-posted.*\.job-fact-duration.*\.job-fact-work-type/s);
});

test('compact cards preserve complete detail access and deterministic tags', () => {
  assert.match(runtime, /job-fact-'\+key/);
  assert.match(runtime, /icons=\{region:'ph-map-pin'.*'work-type':'ph-briefcase'/s);
  assert.match(runtime, /job-card-brand/);
  assert.match(runtime, /jobCompanyLogo/);
  assert.match(runtime, /el\('img','job-card-brand-logo'\)/);
  assert.match(runtime, /logoImage\.onerror/);
  assert.match(runtime, /brand\.append\(logoImage,brandText\)/);
  assert.match(runtime, /job-card-view-cta/);
  assert.match(runtime, /job-card-recruiter-copy/);
  assert.match(runtime, /job-card-tags/);
  assert.match(runtime, /Recruiter LinkedIn.*recruiterLinkedInUrl/s);
  assert.match(runtime, /openDetails\(job,details,preview\)/);
});

test('reference companies and current feed companies resolve to curated wordmarks', () => {
  for (const asset of [
    'oceaneering.png', 'technipfmc.svg', 'saipem.png', 'subsea7.png', 'dof.png', 'fugro.png',
    'accor.svg', 'sgs.png', 'eurofins.png', 'avery-dennison.png', 'veolia.webp',
    'servicenow.svg', 'vattenfall.svg', 'ubisoft.svg', 'jll.png', 'aecom.svg',
    'western-sydney-university.png', 'syngenta.svg', 'western-digital.svg',
    'viva-energy.png', 'sixt.png', 'intuitive.png', 'lgc.png', 'tomra.png',
    'umdasch.svg', 'seek.png', 'red-bull.svg', 'egis.png', 'jde-peets.png',
    'abano.png', 'ldc.png', 'qantas.svg', 'hellokindred.svg', 'wabtec.svg'
  ]) assert.match(runtime, new RegExp(asset.replace('.', '\\.')));
  assert.match(css, /V6219: use each employer's real mark/);
  assert.match(css, /max-width:168px!important/);
  assert.match(css, /\.job-card-brand\.is-mono \.job-card-brand-logo/);
  assert.match(css, /\.job-card-brand\.is-catalog \.job-card-brand-logo/);
});

test('raster wordmarks that previously carried white canvases retain transparency', () => {
  for (const asset of ['abano.png', 'jll.png', 'ldc.png', 'sgs.png']) {
    const png = fs.readFileSync(`assets/company-logos/job-card/${asset}`);
    assert.deepEqual([...png.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10], `${asset} must be a real PNG`);
    const colourType = png[25];
    const hasPaletteTransparency = png.includes(Buffer.from('tRNS'));
    assert.ok(colourType === 4 || colourType === 6 || hasPaletteTransparency, `${asset} must support transparency`);
  }
});

test('SGS cards use the official SGS wordmark rather than the company slogan', () => {
  assert.match(runtime, /\/assets\/company-logos\/job-card\/sgs\.png\?v=6225/);
  const png = fs.readFileSync('assets/company-logos/job-card/sgs.png');
  const width = png.readUInt32BE(16);
  const height = png.readUInt32BE(20);
  assert.equal(width, 170);
  assert.equal(height, 80);
});

test('JobSearch artwork keeps natural colour beneath the specified black overlay', () => {
  assert.match(css, /background:#0B0C0D!important/);
  assert.match(css, /border-color:#34383C!important/);
  assert.match(css, /border-top-color:#AC613B!important/);
  assert.match(css, /rgba\(0,0,0,\.58\)/);
  assert.match(css, /rgba\(0,0,0,\.82\)/);
  assert.match(css, /background-blend-mode:normal,normal!important/);
  assert.match(css, /filter:none!important/);
  assert.match(css, /background:#C06D45!important/);
});
