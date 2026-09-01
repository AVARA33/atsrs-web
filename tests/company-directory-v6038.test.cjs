const assert = require('node:assert/strict');
const fs = require('node:fs');

const html = fs.readFileSync('index.html', 'utf8');
const css = fs.readFileSync('css/company-directory-v6034.css', 'utf8');
const js = fs.readFileSync('js/employers.js', 'utf8');

assert.match(html, /class="employers-hero company-directory-hero"/);
assert.match(html, /Companies on ATSRS/);
assert.doesNotMatch(html, /id="employersBrowseAll"/);
assert.doesNotMatch(html, /id="employersHiringNow"/);
assert.match(html, /assets\/company-directory\/companies-reference-2000x790\.png/);
assert.match(html, /id="employersLocation"/);
assert.match(html, /id="employersSize"/);
assert.match(html, /id="employersPaginationTop"[^>]*data-employers-pagination/);
assert.match(html, /id="employersPaginationBottom"[^>]*data-employers-pagination/);
assert.match(html, /css\/company-directory-v6034\.css\?v=6046/);
assert.match(html, /js\/employers\.js\?v=6046/);

assert.match(css, /max-width:1440px/);
assert.match(css, /height:274px;min-height:274px/);
assert.match(css, /grid-template-columns:44% 56%/);
assert.match(css, /grid-template-columns:minmax\(0,499fr\)/);
assert.doesNotMatch(css, /#employersPage \.employer-card\{/);
assert.match(css, /@media\(max-width:979px\)/);
assert.match(css, /@media\(max-width:639px\)/);

assert.match(js, /var COMPANY_PAGE_SIZE = 30/);
assert.match(js, /querySelectorAll\("\[data-employers-pagination\]"\)/);
assert.match(js, /function pageItems\(current, count\)/);
assert.match(js, /\.slice\(0, 96\)/);
assert.match(js, /sabic-reference\.jpg/);
assert.doesNotMatch(js, /employersHiringNow/);

console.log('company directory v6038 tests passed');
