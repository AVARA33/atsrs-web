const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const source = fs.readFileSync('js/share-profile.js', 'utf8');
const match = source.match(/window\.atsrsGetShareFiles=function\(shareId\)\{[^\n]+\};/);
assert.ok(match, 'Share history file mapping must be available.');

const oldCvId = 'old-cv';
const newCvId = 'new-cv';
const certificateId = 'certificate';
const shares = new Map([
  ['old-link', { selected_file_ids: [oldCvId, certificateId] }],
  ['new-link', { selected_file_ids: [newCvId] }]
]);
const ownerFiles = [
  { id: newCvId, file_name: 'Anar Aghasiyev CV.pdf' },
  { id: certificateId, file_name: 'Certificate.pdf' }
];
const context = {
  window: {},
  shareById: id => shares.get(id),
  ownerFiles,
  documentMeta: () => ({ type: 'Document' }),
  fileCategoryLabel: () => 'Document'
};
vm.runInNewContext(match[0], context);

const oldLinkFiles = context.window.atsrsGetShareFiles('old-link');
assert.deepEqual(Array.from(oldLinkFiles, file => file.id), [oldCvId, certificateId]);
assert.equal(oldLinkFiles[0].available, false);
assert.equal(oldLinkFiles[0].name, 'File no longer available');
assert.equal(oldLinkFiles[1].available, true);
assert.equal(oldLinkFiles.some(file => file.id === newCvId), false,
  'Replacing a CV must not add it to an existing link.');

const newLinkFiles = context.window.atsrsGetShareFiles('new-link');
assert.deepEqual(Array.from(newLinkFiles, file => file.id), [newCvId]);
assert.equal(newLinkFiles[0].available, true);
assert.equal(newLinkFiles[0].name, 'Anar Aghasiyev CV.pdf');
