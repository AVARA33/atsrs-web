const assert=require('node:assert/strict');
const fs=require('node:fs');

const html=fs.readFileSync('index.html','utf8');
const css=fs.readFileSync('css/recruiter-directory-v6029.css','utf8');
const js=fs.readFileSync('js/recruiters.js','utf8');

assert.match(html,/css\/recruiter-directory-v6029\.css\?v=6030/);
assert.match(html,/js\/recruiters\.js\?v=17/);
assert.match(html,/class="employers-hero recruiters-hero"/);
assert.match(html,/Global recruiter network/);
assert.match(html,/id="recruitersExploreAll"/);
assert.match(html,/id="recruitersExploreAllLabel"/);
assert.match(html,/id="recruitersActiveVacancies"/);
assert.match(html,/id="recruitersCompanyCount"/);
assert.match(css,/body:has\(#recruitersPage:not\(\.hidden\)\)[\s\S]*?#pageTitle \{[\s\S]*?display:none !important;/);
assert.match(css,/#recruitersPage\.employers-page \{[\s\S]*?width:min\(100%,1440px\);/);
assert.match(css,/\.recruiters-hero \{[\s\S]*?margin:8px 0 10px;/);
assert.match(css,/recruiter-directory-orbit-v1\.png/);
assert.match(css,/#recruitersPage \.employer-card \{[\s\S]*?height:198px;[\s\S]*?min-height:198px;/);
assert.match(js,/function resetFilters\(activeOnly\)/);
assert.match(js,/recruitersExploreAll/);
assert.match(js,/"Explore all " \+ recruiters\.length/);
assert.match(js,/recruitersActiveVacancies/);
assert.match(js,/companyCount \+ " " \+ \(companyCount === 1 \? "company" : "companies"\)/);

console.log('Recruiter Directory V6029 contracts passed');
