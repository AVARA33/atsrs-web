const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const root=path.resolve(__dirname,'..');
const index=fs.readFileSync(path.join(root,'index.html'),'utf8');
const loader=fs.readFileSync(path.join(root,'js','route-feature-loader.js'),'utf8');

assert.doesNotMatch(index,/<script src="vendor\/qrcode-generator-1\.4\.4\.js\?v=535"><\/script>/);
assert.doesNotMatch(index,/<script src="js\/document-qr-upload-v535\.js\?v=541"><\/script>/);
assert.doesNotMatch(index,/<script src="js\/product-experience\.js\?v=447"><\/script>/);
assert.doesNotMatch(index,/<script src="js\/jobs-prototype\.js\?v=574"><\/script>/);
assert.match(index,/src="js\/route-feature-loader\.js\?v=58150"/);

assert.match(loader,/loadScript\('vendor\/qrcode-generator-1\.4\.4\.js\?v=535'\)/);
assert.match(loader,/loadScript\('js\/document-qr-upload-v535\.js\?v=541'\)/);
assert.match(loader,/loadScript\('js\/product-experience\.js\?v=447'\)/);
assert.match(loader,/loadScript\('js\/jobs-prototype\.js\?v=58150'\)/);
assert.match(loader,/String\(page\|\|''\)==='jobs'/);
assert.match(loader,/window\.openDocumentQrUpload=qrStub/);
assert.match(loader,/window\.atsrsOpenFilePreview=previewStub/);

console.log('route feature loader tests passed');

