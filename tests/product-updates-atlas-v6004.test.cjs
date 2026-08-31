const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const index=fs.readFileSync(path.join(root,'index.html'),'utf8');
const css=fs.readFileSync(path.join(root,'css','product-updates-atlas-v6010.css'),'utf8');
const js=fs.readFileSync(path.join(root,'js','product-updates-atlas-v6004.js'),'utf8');
const updates=index.slice(index.indexOf('<section id="introPage"'),index.indexOf('<section id="jobsPage"'));

test('Product Updates exposes the scalable release atlas',()=>{
  assert.match(index,/product-updates-atlas-v6010\.css\?v=6011/);
  assert.match(index,/product-updates-atlas-v6004\.js\?v=6011/);
  assert.match(updates,/class="updates-atlas"/);
  assert.equal((updates.match(/class="atlas-marker/g)||[]).length,8);
  assert.equal((updates.match(/class="atlas-marker is-live/g)||[]).length,5);
  assert.equal((updates.match(/class="atlas-marker is-building/g)||[]).length,1);
  assert.equal((updates.match(/class="atlas-marker is-next/g)||[]).length,2);
  assert.match(updates,/data-atlas-view="atlas"/);
  assert.match(updates,/data-atlas-view="list"/);
  assert.match(css,/grid-template-columns:minmax\(0,1fr\) 308px/);
  assert.match(css,/width:min\(100%,1440px\)!important/);
  assert.match(css,/width:max-content!important;max-width:230px!important/);
  assert.match(css,/html\[data-theme="light"\] \.atlas-stats-grid>div/);
  assert.match(css,/release-atlas-texture-light-v6010\.png/);
  assert.match(updates,/class="atlas-route-lines"/);
  assert.match(js,/setLineDash\(\[4,7\]\)/);
  assert.match(css,/\.is-building :is\(span,strong\)\{color:var\(--atlas-yellow\)!important\}/);
  assert.match(css,/white-space:nowrap!important/);
  assert.match(css,/release-atlas-texture-v6004\.png/);
  assert.match(css,/@media\(max-width:760px\)/);
  assert.match(updates,/class="updates-atlas-detail updates-atlas-stats"/);
  assert.doesNotMatch(updates.slice(updates.indexOf('updates-atlas-stats'),updates.indexOf('</aside>',updates.indexOf('updates-atlas-stats'))),/Worldwide JobSearch/);
  assert.match(updates,/Product status/);
  assert.match(updates,/Live<\/span><strong>5/);
  assert.match(updates,/Building<\/span><strong>1/);
  assert.match(updates,/Next<\/span><strong>2/);
});

test('Atlas interactions are data-driven and retain working launch actions',()=>{
  assert.match(js,/var releases=\{/);
  assert.match(js,/atsrsOpenJobsDirectory\('recruiters'/);
  assert.match(js,/atsrsOpenJobsDirectory\('employers'/);
  assert.match(js,/dataAtlasMode|dataset\.atlasMode/);
  assert.match(js,/querySelectorAll\('\.atlas-marker'\)/);
});
