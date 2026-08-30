const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const index=fs.readFileSync(path.join(root,'index.html'),'utf8');
const css=fs.readFileSync(path.join(root,'css','product-updates-mission-v6003.css'),'utf8');
const updates=index.slice(index.indexOf('<section id="introPage"'),index.indexOf('<section id="jobsPage"'));

test('Product Updates exposes the screenshot-matched mission control layout',()=>{
  assert.match(index,/product-updates-mission-v6003\.css\?v=6005/);
  assert.match(updates,/class="updates-mission"/);
  assert.match(updates,/MISSION CONTROL DIAL/);
  assert.match(updates,/Three newest releases[\s\S]*One connected mission/);
  assert.match(updates,/mission-orbit-title-live">LIVE/);
  assert.match(updates,/mission-orbit-title-building">BUILDING/);
  assert.match(updates,/mission-orbit-title-next">NEXT/);
  assert.doesNotMatch(updates,/class="roadmap-card/);
  assert.doesNotMatch(updates,/class="updates-status-board/);
  assert.match(css,/margin-left:16px/);
  assert.match(css,/#atsrsGlobalControls>#workspaceSwitcher\{position:relative/);
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
