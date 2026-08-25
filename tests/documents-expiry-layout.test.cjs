const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const root=path.resolve(__dirname,'..');
const storage=fs.readFileSync(path.join(root,'js','storage.js'),'utf8');
const theme=fs.readFileSync(path.join(root,'css','theme.css'),'utf8');
const floating=fs.readFileSync(path.join(root,'css','floating-field-standard-v58178.css'),'utf8');
const index=fs.readFileSync(path.join(root,'index.html'),'utf8');
const harness=fs.readFileSync(path.join(__dirname,'fixtures','documents-expiry-layout-harness.html'),'utf8');

assert.match(storage,/const items=\[\['cExpiry','cExpiryNA','cExpiryNALabel'\],\['autoExpiry','autoExpiryNA','autoExpiryNALabel'\]\]/);
assert.match(storage,/group\.className='documents-expiry-group'/);
assert.match(storage,/wrap\.parentNode\.insertBefore\(group,wrap\);\s*group\.appendChild\(wrap\)/);
assert.match(storage,/group\.insertAdjacentHTML\('beforeend',`<label class="na-check">/);
assert.match(storage,/else if\(row\.parentNode!==group\)\{\s*group\.appendChild\(row\)/);
assert.match(storage,/if\(cb\.dataset\.expiryNaBound==='1'\)return/);

assert.match(theme,/#certificatesPage \.documents-expiry-group\s*\{[^}]*display: grid;[^}]*gap: var\(--atsrs-space-2, 8px\);[^}]*min-width: 0;/s);
assert.match(theme,/#certificatesPage \.documents-expiry-group > \.field-wrap\s*\{[^}]*margin: 0;/s);
assert.match(theme,/#certificatesPage \.documents-expiry-group > \.na-check\s*\{[^}]*min-height: 20px;[^}]*margin: 0 0 2px 2px;/s);
assert.match(theme,/html\[data-theme="light"\] body #app #certificatesPage #certManualPanel \.documents-expiry-group > \.na-check > input:focus-visible\s*\{[^}]*box-shadow: var\(--atsrs-light-focus\) !important;/s);
assert.match(floating,/\.atsrs-field-shell:not\(\.atsrs-field-textarea\)\{\s*height:var\(--atsrs-field-height\)!important;\s*max-height:var\(--atsrs-field-height\)!important/);
assert.doesNotMatch(theme,/\.atsrs-field-shell:not\(\.atsrs-field-textarea\)/);
assert.match(index,/css\/theme\.css\?v=58196/);
assert.match(index,/js\/storage\.js\?v=585/);

for(const state of ['qr','ai','manual','edit'])assert.match(harness,new RegExp(`value="${state}"`));
for(const width of ['desktop','768','390'])assert.match(harness,new RegExp(`data-viewport="${width}"`));
for(const themeName of ['light','dark'])assert.match(harness,new RegExp(`value="${themeName}"`));
assert.match(harness,/Issue → Expiry → Not Applicable → Save/);

console.log('documents expiry layout contract tests passed');
