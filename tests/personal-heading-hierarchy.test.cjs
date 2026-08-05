const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'css', 'personal-workspace-surface.css'), 'utf8');
const app = fs.readFileSync(path.join(root, 'js', 'app.js'), 'utf8');
const storage = fs.readFileSync(path.join(root, 'js', 'storage.js'), 'utf8');
const corporate = fs.readFileSync(path.join(root, 'js', 'corporate-remediation.js'), 'utf8');
const harness = fs.readFileSync(path.join(root, 'tests', 'fixtures', 'personal-workspace-surface-harness.html'), 'utf8');

assert.match(app, /corporate\?'Add company document':'Add document'/);
assert.doesNotMatch(app, /corporate\?'Add company document':'Documents'/);
assert.match(storage, /isPersonalMode\(\)\?"Add document":ptr\("addDoc"\)/);
assert.match(storage, /addDocTitle\.innerText=isPersonalMode\(\)\?"Add document":v23\("addDoc"\)/);
assert.match(storage, /referenceLetters:"Reference Letters"/);
assert.match(storage, /referenceCardTitle\.innerText=isPersonalMode\(\)\?v25\('referenceLetters'\):v25\('references'\)/);
assert.match(index, /id="referenceCardTitle">Reference Letters<\/h3>/);
assert.match(index, /<h1 id="accountPageHeading" class="hidden"><\/h1>/);

assert.match(css, /body\.personal-mode #refsPage > \.panel > #refsTitle/);
assert.match(css, /body\.personal-mode #profilePage > \.panel > #accountTitle/);
assert.match(css, /body\.personal-mode\.atsrs-personal-legal-route[\s\S]*?#pageTitle[\s\S]*?display:none!important/);
assert.doesNotMatch(css, /body\.company-mode[\s\S]*?#refsTitle[\s\S]*?display:none/);

assert.match(storage, /function syncPersonalHeadingHierarchy\(page\)/);
assert.match(storage, /personalAccount=personal&&page==="profile"/);
assert.match(storage, /pageTitle\.classList\.toggle\("hidden",personalAccount\)/);
assert.match(storage, /accountHeading\.classList\.toggle\("hidden",!personalAccount\)/);
assert.match(storage, /if\(personalAccount\)accountHeading\.textContent=pageTitle\.textContent/);
assert.match(storage, /if\(!personalAccount\)\{pageTitle\.setAttribute\("role","heading"\);pageTitle\.setAttribute\("aria-level","1"\)\}/);
assert.doesNotMatch(storage, /accountHeading\.setAttribute\("role"/);
assert.match(storage, /section\.querySelectorAll\("h3,h4"\)/);
assert.match(storage, /nestedReferenceHeading=page==="refs"&&h\.tagName==="H4"/);
assert.match(storage, /"aria-level",nestedReferenceHeading\?"3":"2"/);
assert.match(storage, /atsrs-personal-legal-route/);
assert.match(storage, /renderAll\(\);syncPersonalHeadingHierarchy\(page\)/);
assert.match(storage, /syncPersonalHeadingHierarchy\(localStorage\.getItem\("atsrs_current_page"\)\|\|"intro"\)/);
assert.match(css, /> \.main > #accountPageHeading,[\s\S]*?> \.main > section/);
assert.match(css, /:is\(#pageTitle,#accountPageHeading\)[\s\S]*?margin-bottom:16px/);
assert.match(harness, /<h1 id="accountPageHeading" class="hidden"><\/h1>/);
assert.match(harness, /pageTitle\.classList\.toggle\('hidden', route === 'profile'\)/);
assert.match(harness, /accountPageHeading\.classList\.toggle\('hidden', route !== 'profile'\)/);

assert.match(corporate, /setText\('accountTitle',corporate\?'Corporate Account':'Account'\)/);
assert.match(corporate, /setText\('refsTitle','Reference Materials'\)/);

for (const file of ['privacy.html', 'data-deletion.html']) {
  assert.ok(fs.existsSync(path.join(root, file)), `${file} must remain standalone`);
}

console.log('Personal heading hierarchy contracts passed');
