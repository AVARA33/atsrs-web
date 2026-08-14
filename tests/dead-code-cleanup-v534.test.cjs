const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const sourceFiles = [
  'index.html',
  ...fs.readdirSync(path.join(root, 'js')).filter((file) => file.endsWith('.js')).map((file) => `js/${file}`),
  ...fs.readdirSync(path.join(root, 'css')).filter((file) => file.endsWith('.css')).map((file) => `css/${file}`),
];
const productionSource = sourceFiles.map(read).join('\n');

const removedIdentifiers = [
  ['atsrs', 'TestAutomation'].join(''),
  ['atsrs', 'RunFullAutomation'].join(''),
  ['atsrs', 'TopbarTrouble'].join(''),
  ['atsrs', 'HardFixTopbar'].join(''),
  ['runTopbar', 'Troubleshoot'].join(''),
  ['atsrsV76', 'RunAudit'].join(''),
  ['v76', '-audit'].join(''),
];

for (const identifier of removedIdentifiers) {
  assert.equal(productionSource.includes(identifier), false, `${identifier} must have no production references`);
}

for (const asset of ['atsrs-login-blue.png', 'atsrs-login-green.png']) {
  assert.equal(fs.existsSync(path.join(root, 'assets', 'branding', asset)), false, `${asset} must remain deleted`);
}

const storage = read('js/storage.js');
const share = read('js/share-profile.js');
for (const name of ['getManagedFile', 'saveManagedFile', 'handleManagedUpload', 'previewManagedFile', 'downloadManagedFile', 'deleteManagedFile', 'ensureManagedCard', 'renderManagedFiles']) {
  const count = [...storage.matchAll(new RegExp(`function\\s+${name}\\s*\\(`, 'g'))].length;
  assert.equal(count, 1, `${name} must have one implementation in storage.js`);
}
for (const name of ['endpoint', 'publishableKey', 'safeSessionGet', 'safeSessionSet', 'safeViewerGet', 'safeViewerSet', 'viewerKey', 'shareUrl', 'formatDate']) {
  const count = [...share.matchAll(new RegExp(`function\\s+${name}\\s*\\(`, 'g'))].length;
  assert.equal(count, 1, `${name} must have one implementation in share-profile.js`);
}

assert.match(read('index.html'), /data-atsrs-build="V534"/);
console.log('V534 dead-code zero-trace contracts passed');
