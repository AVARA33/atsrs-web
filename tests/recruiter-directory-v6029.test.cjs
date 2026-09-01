const assert=require('node:assert/strict');
const fs=require('node:fs');

const html=fs.readFileSync('index.html','utf8');
const css=fs.readFileSync('css/recruiter-directory-v6029.css','utf8');
const js=fs.readFileSync('js/recruiters.js','utf8');

assert.match(html,/css\/recruiter-directory-v6029\.css\?v=6033/);
assert.match(html,/js\/recruiters\.js\?v=17/);
assert.match(html,/class="employers-hero recruiters-hero"/);
assert.match(html,/Global recruiter network/);
assert.match(html,/id="recruitersExploreAll"/);
assert.match(html,/id="recruitersExploreAllLabel"/);
assert.match(html,/id="recruitersActiveVacancies"/);
assert.match(html,/id="recruitersCompanyCount"/);
assert.match(html,/class="recruiters-trust-strip"/);
assert.match(html,/LinkedIn verified/);
assert.match(html,/Vacancies linked/);
assert.match(html,/Profile sharing controlled/);
assert.match(css,/body:has\(#recruitersPage:not\(\.hidden\)\)[\s\S]*?#pageTitle \{[\s\S]*?display:none !important;/);
assert.match(css,/#recruitersPage\.employers-page \{[\s\S]*?width:min\(100%,1440px\);/);
assert.match(css,/\.recruiters-hero \{[\s\S]*?margin:8px 0 10px;/);
assert.match(css,/recruiter-directory-orbit-v1\.png/);
assert.match(css,/#recruitersPage \.recruiters-trust-strip \{/);
assert.match(css,/#recruitersPage \.employers-grid \{[\s\S]*?grid-template-columns:repeat\(3,minmax\(0,1fr\)\);/);
assert.match(css,/#recruitersPage \.employer-card \{[\s\S]*?height:auto;[\s\S]*?min-height:158px;/);
assert.match(css,/#recruitersPage \.employer-actions \{[\s\S]*?display:flex;[\s\S]*?flex-wrap:nowrap;/);
assert.match(css,/#recruitersPage \.employer-actions a,[\s\S]*?flex:1 1 0;[\s\S]*?height:25px;[\s\S]*?font-size:7\.5px;/);
assert.match(js,/function resetFilters\(activeOnly\)/);
assert.match(js,/recruitersExploreAll/);
assert.match(js,/"Explore all " \+ recruiters\.length/);
assert.match(js,/recruitersActiveVacancies/);
assert.match(js,/companyCount \+ " " \+ \(companyCount === 1 \? "company" : "companies"\)/);

console.log('Recruiter Directory V6029 contracts passed');
