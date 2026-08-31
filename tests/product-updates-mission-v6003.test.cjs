const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const index=fs.readFileSync(path.join(root,'index.html'),'utf8');
const css=fs.readFileSync(path.join(root,'css','product-updates-mission-v6003.css'),'utf8');
const updates=index.slice(index.indexOf('<section id="introPage"'),index.indexOf('<section id="jobsPage"'));

test('Product Updates exposes the screenshot-matched mission control layout',()=>{
  assert.match(index,/product-updates-mission-v6003\.css\?v=6017/);
  assert.match(updates,/class="updates-mission"/);
  assert.match(updates,/MISSION CONTROL DIAL/);
  assert.match(updates,/Three newest releases[\s\S]*One connected mission/);
  assert.match(updates,/mission-orbit-title-live">LIVE/);
  assert.match(updates,/mission-orbit-title-building">BUILDING/);
  assert.match(updates,/mission-orbit-title-next">NEXT/);
  assert.doesNotMatch(updates,/class="roadmap-card/);
  assert.doesNotMatch(updates,/class="updates-status-board/);
  assert.match(css,/margin-inline:auto/);
  assert.match(updates,/id="missionConnectorGlow"/);
  assert.match(updates,/class="mission-connector mission-connector-projects" d="M372 121V148"/);
  assert.match(updates,/class="mission-connector mission-connector-email" d="M172 416L195 403"/);
  assert.match(updates,/class="mission-launch-connector"/);
  assert.match(css,/\.mission-connectors \.mission-connector\{stroke-width:1\.35;filter:url\(#missionConnectorGlow\)\}/);
  assert.doesNotMatch(css,/grid-template-columns:1(?:50|75)px minmax/);
  assert.match(css,/padding:24px 22px 22px!important/);
  assert.equal((css.match(/width:min\(100%,1222px\)!important/g)||[]).length,2);
  assert.match(css,/#pageTitle\{[^}]*border-bottom:0!important/);
  assert.match(css,/product-updates-content\{display:flex!important;justify-content:center!important/);
  assert.doesNotMatch(css,/min-height:1058px/);
  assert.doesNotMatch(css,/translateX\(-(?:18|61|98)px\) scale/);
  assert.match(css,/@media\(min-width:1280px\) and \(max-width:1359px\)/);
  assert.match(css,/#navIntro \.atsrs-nav-label\{white-space:nowrap/);
});

test('mission control keeps honest status totals and working launch modules',()=>{
  assert.match(updates,/<b>17<\/b>/);
  assert.match(updates,/<b>1<\/b>/);
  assert.match(updates,/<b>2<\/b>/);
  assert.match(updates,/showPage\('jobs'/);
  assert.match(updates,/atsrsOpenJobsDirectory\('recruiters'/);
  assert.match(updates,/atsrsOpenJobsDirectory\('employers'/);
  assert.match(css,/@media\(max-width:760px\)/);
  assert.match(css,/data-theme="light"/);
});
