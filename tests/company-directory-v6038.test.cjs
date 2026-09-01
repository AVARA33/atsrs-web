const assert = require('node:assert/strict');
const fs = require('node:fs');

const html = fs.readFileSync('index.html', 'utf8');
const css = fs.readFileSync('css/company-directory-v6034.css', 'utf8');
const js = fs.readFileSync('js/employers.js', 'utf8');

assert.match(html, /class="employers-hero company-directory-hero"/);
assert.match(html, /Companies on ATSRS/);
assert.match(html, /id="employersBrowseAllLabel">Browse 96 companies/);
assert.match(html, /id="employersHiringNow"[^>]*aria-pressed="false"/);
assert.match(html, /assets\/company-directory\/companies-reference-2000x790\.png/);
assert.match(html, /id="employersLocation"/);
assert.match(html, /id="employersSize"/);
assert.match(html, /id="employersPaginationTop"[^>]*data-employers-pagination/);
assert.match(html, /id="employersPaginationBottom"[^>]*data-employers-pagination/);
assert.match(html, /css\/company-directory-v6034\.css\?v=6044/);
assert.match(html, /js\/employers\.js\?v=6040/);

assert.match(css, /max-width:1718px/);
assert.match(css, /height:445px;min-height:445px/);
assert.match(css, /grid-template-columns:44% 56%/);
assert.match(css, /grid-template-columns:minmax\(0,499fr\)/);
assert.match(css, /grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/);
assert.match(css, /@media\(max-width:979px\)/);
assert.match(css, /@media\(max-width:639px\)/);

assert.match(js, /var COMPANY_PAGE_SIZE = 30/);
assert.match(js, /querySelectorAll\("\[data-employers-pagination\]"\)/);
assert.match(js, /\.slice\(0, 96\)/);
assert.match(js, /sabic-reference\.jpg/);
assert.match(js, /setAttribute\("aria-pressed", String\(hiringOnly\)\)/);

console.log('company directory v6038 tests passed');
