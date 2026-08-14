const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const root=path.resolve(__dirname,'..');
const read=(file)=>fs.readFileSync(path.join(root,file),'utf8');
const css=read('css/theme-palette-v508.css');
const index=read('index.html');

assert.match(index,/data-atsrs-build="V532"/);
assert.match(index,/css\/theme-palette-v508\.css\?v=509/);
assert.match(index,/js\/theme\.js\?v=509/);
assert.match(css,/--atsrs-ref-light-bg:#edf2f8/);
assert.match(css,/--atsrs-ref-light-text:#0b2554/);
assert.match(css,/--atsrs-ref-blue:#167bd3/);
assert.match(css,/--atsrs-ref-cyan:#20aee5/);
assert.match(css,/#landingPage\.atsrs-public-landing/);
assert.match(css,/#landingPage \.public-header/);
assert.match(css,/body:where\(\.personal-mode,\.company-mode\).*?\.main/s);
assert.match(css,/--atsrs-ref-dark-bg:#050606/);
assert.match(css,/--atsrs-ref-dark-text:#f4f6ef/);
assert.match(css,/--atsrs-ref-lime:#b8ff19/);
assert.match(css,/sidebar \.nav button\.active/);
assert.match(css,/:focus-visible/);
assert.doesNotMatch(css,/\.main\s*\{[^}]*?(?:width|grid-template-columns|padding)/s,'palette layer must not alter app geometry');

for(const file of ['pricing.html','privacy.html','data-deletion.html','data-protection.html','security.html','terms.html']){
  assert.match(read(file),/css\/theme-palette-v508\.css\?v=509/,`${file} must load the shared palette`);
}

console.log('V509 reference palette contract tests passed');
