const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const styles = fs.readFileSync(path.join(root, 'css', 'personal-dashboard-qa.css'), 'utf8');
const runtime = fs.readFileSync(path.join(root, 'js', 'personal-dashboard-qa.js'), 'utf8');

assert.match(index, /css\/personal-dashboard-qa\.css\?v=449/, 'V449 mobile nav CSS must bypass the production cache');
assert.match(index, /js\/personal-dashboard-qa\.js\?v=449/, 'V449 mobile nav runtime must bypass the production cache');
assert.match(runtime, /if\(mobile\)sidebar\.classList\.remove\('v76-mobile-closed'\)/, 'mobile sync must clear legacy closed state');
assert.match(runtime, /if\(visible&&window\.innerWidth<=800\)[\s\S]*?sidebar\.classList\.remove\('v76-mobile-closed'\)/, 'entering Personal Dashboard must keep the bottom nav open');
assert.doesNotMatch(runtime, /classList\.add\('v76-mobile-closed'\)/, 'Dashboard runtime must never close persistent mobile navigation');
assert.match(styles, /@media\(max-width:800px\)[\s\S]*?\.sidebar\.v76-mobile-closed \.nav\{\s*display:flex!important/, 'legacy closed class must not hide the bottom nav');
assert.doesNotMatch(styles, /\.sidebar\.v76-mobile-closed \.nav,[\s\S]*?display:none!important/, 'Dashboard CSS must not restore drawer hiding');

console.log('Mobile Dashboard bottom-navigation persistence contracts passed');
