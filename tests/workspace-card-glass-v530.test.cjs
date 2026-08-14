const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=(file)=>fs.readFileSync(path.join(root,file),'utf8');
const index=read('index.html');
const css=read('css/workspace-card-glass-v530.css');
const harness=read('tests/fixtures/workspace-card-glass-v530-qa.html');

assert.match(index,/data-atsrs-build="V530"/);
assert.match(index,/workspace-card-glass-v530\.css\?v=530/);
assert.doesNotMatch(index,/workspace-card-glass-v529\.css\?v=529/);
assert.match(css,/--atsrs-v530-light-top:rgba\(255,255,255,\.36\)/);
assert.match(css,/--atsrs-v530-light-bottom:rgba\(246,250,255,\.16\)/);
assert.match(css,/--atsrs-v530-light-line:rgba\(255,255,255,\.64\)/);
assert.match(css,/0 18px 36px rgba\(62,79,103,\.13\)/);
assert.match(css,/inset 1px 1px 0 rgba\(255,255,255,\.76\)/);
assert.match(css,/-webkit-backdrop-filter:blur\(24px\) saturate\(116%\)/);
assert.match(css,/--atsrs-v530-dark-top:rgba\(23,31,46,\.56\)/);
assert.match(css,/--atsrs-v530-dark-bottom:rgba\(11,18,30,\.44\)/);
assert.match(css,/#dashboardPage#dashboardPage \.dashboard-priority-alerts-panel/);
assert.match(css,/#profilePage#profilePage \.work-availability-card/);
assert.match(css,/#introPage#introPage \.roadmap-card/);
assert.doesNotMatch(css,/input:not|\.sidebar|#landingPage|#login/);
assert.match(harness,/workspace-card-glass-v530\.css\?v=530/);
assert.match(harness,/Transparent glass pillows/);

console.log('V530 transparent raised Light glass contracts passed');
