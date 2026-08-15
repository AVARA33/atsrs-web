const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'css', 'sidebar-fixed-utilities-v550.css'), 'utf8');
const harness = fs.readFileSync(path.join(root, 'tests', 'fixtures', 'sidebar-fixed-utilities-v550-harness.html'), 'utf8');

assert.match(html, /css\/sidebar-fixed-utilities-v550\.css\?v=555/);
assert.match(html, /class="nav-primary"[\s\S]*?id="navProfile"[\s\S]*?class="nav-utility-group"[\s\S]*?id="navIntro"[\s\S]*?id="navPrivacy"/);
assert.match(css, /grid-template-rows:minmax\(0,1fr\) auto!important/);
assert.match(css, /position:fixed!important;[\s\S]*?display:flex!important;[\s\S]*?flex-direction:column!important;[\s\S]*?height:100svh!important/);
assert.doesNotMatch(css, /position:sticky!important/);
assert.match(css, /> \.main\{[\s\S]*?grid-column:2!important/);
assert.match(css, /\.sidebar > \.nav,[\s\S]*?flex:1 1 auto!important;[\s\S]*?height:auto!important/);
assert.match(css, /\.nav-primary[\s\S]*?overflow-y:auto!important/);
assert.match(css, /\.nav-utility-group[\s\S]*?flex:0 0 auto!important/);
assert.match(css, /@media\(max-width:800px\)[\s\S]*?position:fixed!important;[\s\S]*?height:calc\(100svh - 70px\)!important/);
assert.match(css, /\.sidebar\.v76-mobile-closed > \.nav[\s\S]*?display:grid!important/);
assert.match(css, /min-height:44px!important/);
assert.match(css, /@media\(max-width:800px\)[\s\S]*?> \.main\{[\s\S]*?width:auto!important;[\s\S]*?max-width:100%!important;[\s\S]*?overflow-x:hidden!important/);
assert.match(css, /> \.main > #pageTitle,[\s\S]*?> \.main > section\{[\s\S]*?width:100%!important;[\s\S]*?min-width:0!important/);
assert.match(harness, /sidebar-fixed-utilities-v550\.css\?v=555/);
assert.match(harness, /shell-polish\.js\?v=555/);
assert.match(harness, /id="navIntro"[\s\S]*?id="navPrivacy"/);

console.log('V555 fixed sidebar and compact viewport contracts passed');
