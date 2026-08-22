const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const root=path.join(__dirname,'..');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const css=fs.readFileSync(path.join(root,'css','documents-split-pane-v5857.css'),'utf8');
const runtime=fs.readFileSync(path.join(root,'js','documents-split-pane-v5857.js'),'utf8');

assert.match(html,/id="documentsWorkspace" class="atsrs-documents-workspace"/);
assert.match(html,/id="openDocumentsAddPanelBtn"[^>]+aria-controls="documentsAddPanel"[^>]+aria-expanded="false"/);
assert.match(html,/id="closeDocumentsAddPanelBtn"/);
assert.match(html,/class="panel atsrs-documents-register-panel"/);
assert.match(html,/class="panel unified-cert-panel atsrs-documents-add-panel"/);
assert.match(html,/documents-split-pane-v5857\.css\?v=5857/);
assert.match(html,/documents-split-pane-v5857\.js\?v=5857/);

assert.match(css,/body\.personal-mode #certificatesPage \.atsrs-documents-workspace\.is-add-open\s*\{\s*grid-template-columns:minmax\(0,1fr\) minmax\(360px,480px\)/s);
assert.match(css,/body\.personal-mode #certificatesPage \.atsrs-documents-add-panel\s*\{\s*display:none!important/s);
assert.match(css,/\.is-add-open \.atsrs-documents-add-panel\s*\{\s*display:block!important/s);
assert.match(css,/\.atsrs-documents-register-panel\s*\{[^}]*width:100%!important;[^}]*max-width:none!important/s);
assert.doesNotMatch(css,/#[0-9a-f]{3,8}\b/i,'split-pane CSS must not introduce new hard-coded colors');
assert.doesNotMatch(css,/rgba?\(/i,'split-pane CSS must not introduce new hard-coded colors');

assert.match(runtime,/openButton\.addEventListener\('click',function\(\)\{setOpen\(true,false\)\}\)/);
assert.match(runtime,/closeButton\.addEventListener\('click',function\(\)\{setOpen\(false,true\)\}\)/);
assert.match(runtime,/event\.key!==['"]Escape['"]/);
assert.match(runtime,/page\.classList\.contains\('hidden'\)/);
assert.match(runtime,/!personalMode\(\)/);

console.log('documents split-pane contract passed');
