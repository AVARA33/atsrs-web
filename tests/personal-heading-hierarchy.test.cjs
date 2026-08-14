const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'css', 'personal-workspace-surface.css'), 'utf8');
const app = fs.readFileSync(path.join(root, 'js', 'app.js'), 'utf8');
const storage = fs.readFileSync(path.join(root, 'js', 'storage.js'), 'utf8');
const corporate = fs.readFileSync(path.join(root, 'js', 'corporate-remediation.js'), 'utf8');

assert.match(app, /corporate\?'Add company document':'Add document'/);
assert.doesNotMatch(app, /corporate\?'Add company document':'Documents'/);
assert.match(storage, /isPersonalMode\(\)\?"Add document":ptr\("addDoc"\)/);
assert.match(storage, /addDocTitle\.innerText=isPersonalMode\(\)\?"Add document":v23\("addDoc"\)/);
assert.match(storage, /referenceLetters:"Reference Letters"/);
assert.match(storage, /referenceCardTitle\.innerText=isPersonalMode\(\)\?v25\('referenceLetters'\):v25\('references'\)/);
assert.match(index, /id="referenceCardTitle">Reference Letters<\/h3>/);

assert.match(css, /body\.personal-mode #refsPage > \.panel > #refsTitle/);
assert.match(css, /body\.personal-mode #profilePage > \.panel > #accountTitle/);
assert.match(css, /body\.personal-mode\.atsrs-personal-legal-route[\s\S]*?#pageTitle[\s\S]*?display:none!important/);
assert.doesNotMatch(css, /body\.company-mode[\s\S]*?#refsTitle[\s\S]*?display:none/);

assert.match(storage, /function syncPersonalHeadingHierarchy\(page\)/);
assert.match(storage, /pageTitle\.setAttribute\("role","heading"\);pageTitle\.setAttribute\("aria-level","1"\)/);
assert.match(storage, /section\.querySelectorAll\("h3,h4"\)/);
assert.match(storage, /nestedReferenceHeading=page==="refs"&&h\.tagName==="H4"/);
assert.match(storage, /"aria-level",nestedReferenceHeading\?"3":"2"/);
assert.match(storage, /atsrs-personal-legal-route/);
assert.match(storage, /renderAll\(\);syncPersonalHeadingHierarchy\(renderedPage\)/);
assert.match(storage, /syncPersonalHeadingHierarchy\(localStorage\.getItem\("atsrs_current_page"\)\|\|"intro"\)/);

assert.match(corporate, /setText\('accountTitle',corporate\?'Corporate Account':'Account'\)/);
assert.match(corporate, /setText\('refsTitle','Reference Materials'\)/);

for (const file of ['privacy.html', 'data-deletion.html']) {
  assert.ok(fs.existsSync(path.join(root, file)), `${file} must remain standalone`);
}

console.log('Personal heading hierarchy contracts passed');
