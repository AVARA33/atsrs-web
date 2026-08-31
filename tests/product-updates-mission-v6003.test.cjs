const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const index=fs.readFileSync(path.join(root,'index.html'),'utf8');
const css=fs.readFileSync(path.join(root,'css','product-updates-mission-v6003.css'),'utf8');
const updates=index.slice(index.indexOf('<section id="introPage"'),index.indexOf('<section id="jobsPage"'));

test('Product Updates exposes the screenshot-matched mission control layout',()=>{
  assert.match(index,/product-updates-mission-v6003\.css\?v=6018/);
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
  assert.match(updates,/class="orbit orbit-inner" cx="372" cy="357" rx="208\.5" ry="208\.5"/);
  assert.match(updates,/class="mission-connector mission-connector-projects" d="M372 121V148"/);
  assert.match(updates,/class="mission-connector mission-connector-candidates" d="M244 159L258 181"/);
  assert.match(updates,/class="mission-connector mission-connector-email" d="M145 425L171 417"/);
  assert.match(updates,/class="mission-dots">[\s\S]*cx="258" cy="181"[\s\S]*cx="171" cy="417"/);
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

test('capability connector dots remain anchored to the live orbit',()=>{
  const orbit=updates.match(/class="orbit orbit-inner" cx="([\d.]+)" cy="([\d.]+)" rx="([\d.]+)" ry="([\d.]+)"/);
  assert.ok(orbit);
  const cx=Number(orbit[1]);
  const cy=Number(orbit[2]);
  const rx=Number(orbit[3]);
  const ry=Number(orbit[4]);
  assert.equal(rx,ry);
  const dotGroup=updates.match(/<g class="mission-dots">([\s\S]*?)<\/g>/);
  assert.ok(dotGroup);
  const dots=[...dotGroup[1].matchAll(/<circle cx="([\d.]+)" cy="([\d.]+)" r="4"\/>/g)]
    .slice(0,9)
    .map(([,x,y])=>[Number(x),Number(y)]);
  assert.equal(dots.length,9);
  for(const [x,y] of dots){
    const drift=Math.abs(Math.hypot(x-cx,y-cy)-rx);
    assert.ok(drift<2,`connector dot ${x},${y} drifted ${drift.toFixed(2)}px from the live orbit`);
  }
});
