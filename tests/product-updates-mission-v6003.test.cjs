const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const index=fs.readFileSync(path.join(root,'index.html'),'utf8');
const css=fs.readFileSync(path.join(root,'css','product-updates-mission-v6003.css'),'utf8');
const updates=index.slice(index.indexOf('<section id="introPage"'),index.indexOf('<section id="jobsPage"'));

test('Product Updates exposes the screenshot-matched mission control layout',()=>{
  assert.match(index,/product-updates-mission-v6003\.css\?v=6024/);
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
  assert.match(updates,/class="orbit orbit-live" d="M18 482 C28 210 153 7 372 7 C591 7 716 210 726 482"/);
  assert.match(updates,/class="orbit orbit-inner" d="M171 417 A208\.5 208\.5 0 1 1 573 417" data-orbit-cx="372" data-orbit-cy="357" data-orbit-radius="208\.5"/);
  assert.match(updates,/class="orbit orbit-building" d="M18 482 C104 708 640 708 726 482"/);
  assert.match(updates,/id="missionBuildingGradient"/);
  assert.match(updates,/class="orbit orbit-building orbit-building-secondary" d="M18 482 C112 698 632 698 726 482"/);
  assert.match(updates,/class="stage-join-dots">\s*<circle cx="18" cy="482" r="3\.2"\/>\s*<circle cx="726" cy="482" r="3\.2"\/>/);
  assert.match(updates,/class="building-dots">\s*<circle cx="238" cy="637" r="4"\/>\s*<circle cx="506" cy="637" r="4"\/>/);
  assert.match(updates,/class="next-dots">\s*<circle cx="16" cy="576" r="4"\/>\s*<circle cx="728" cy="576" r="4"\/>/);
  assert.match(updates,/assets\/branding\/atsrs-favicon-green-v576\.png/);
  assert.match(updates,/<g class="core-rings">\s*<ellipse cx="372" cy="324" rx="148" ry="128"\/>\s*<\/g>/);
  assert.match(updates,/<strong>Worldwide JobSearch<\/strong>\s*<small>Core release hub<\/small>/);
  assert.doesNotMatch(updates,/31 Aug 2026|ph-calendar-blank/);
  assert.match(updates,/class="orbit orbit-next orbit-next-secondary" d="M16 576 C69 798 675 798 728 576"/);
  assert.match(css,/\.orbit-next-secondary\{stroke:rgba\(148,154,164,\.22\)\}/);
  assert.match(css,/\.mission-orbit-title-next\{top:735px!important\}/);
  assert.match(updates,/class="mission-connector mission-connector-projects" d="M372 121V148"/);
  assert.match(updates,/id="missionConnectorProjects"[\s\S]*?stop-opacity="\.32"[\s\S]*?stop-opacity="\.72"[\s\S]*?stop-opacity="1"/);
  assert.match(updates,/class="mission-visible-arrows"[\s\S]*?class="is-top"[\s\S]*?class="is-left"[\s\S]*?class="is-right"/);
  assert.match(css,/\.mission-visible-arrows\{position:absolute;inset:0;z-index:5;pointer-events:none\}/);
  assert.match(updates,/class="mission-connector mission-connector-candidates" d="M244 159L258 181"/);
  assert.match(updates,/class="mission-connector mission-connector-email" d="M145 425L171 417"/);
  assert.match(updates,/class="mission-dots">[\s\S]*cx="258" cy="181"[\s\S]*cx="171" cy="417"/);
  assert.match(updates,/class="mission-launch-connector"/);
  assert.match(updates,/class="mission-launch-connector" d="M372 452V475H274V477M372 475H470V477"/);
  assert.match(updates,/class="launch-join-dots">\s*<circle cx="274" cy="477" r="3\.6"\/>\s*<circle cx="470" cy="477" r="3\.6"\/>/);
  assert.match(css,/\.mission-connectors \.mission-connector\{stroke-width:1\.35;filter:url\(#missionConnectorGlow\)\}/);
  assert.match(css,/data-theme="light"\] \.orbit-live\{stroke:#2f6dcc\}/);
  assert.match(css,/data-theme="light"\] \.mission-connectors \.mission-connector\{stroke:#5b8fdd!important/);
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

test('capability connector dots remain anchored to the open live orbit',()=>{
  const orbit=updates.match(/class="orbit orbit-inner"[^>]+data-orbit-cx="([\d.]+)" data-orbit-cy="([\d.]+)" data-orbit-radius="([\d.]+)"/);
  assert.ok(orbit);
  const cx=Number(orbit[1]);
  const cy=Number(orbit[2]);
  const radius=Number(orbit[3]);
  const dotGroup=updates.match(/<g class="mission-dots">([\s\S]*?)<\/g>/);
  assert.ok(dotGroup);
  const dots=[...dotGroup[1].matchAll(/<circle cx="([\d.]+)" cy="([\d.]+)" r="4"\/>/g)]
    .slice(0,9)
    .map(([,x,y])=>[Number(x),Number(y)]);
  assert.equal(dots.length,9);
  for(const [x,y] of dots){
    const drift=Math.abs(Math.hypot(x-cx,y-cy)-radius);
    assert.ok(drift<2,`connector dot ${x},${y} drifted ${drift.toFixed(2)}px from the live orbit`);
  }
});
