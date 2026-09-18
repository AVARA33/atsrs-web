const assert = require('node:assert/strict');
const fs = require('node:fs');

const html = fs.readFileSync('index.html', 'utf8');
const locale = fs.readFileSync('js/locale.js', 'utf8');
const az = fs.readFileSync('js/locale-az.js', 'utf8');
const sharing = fs.readFileSync('js/profile-sharing-v1.js', 'utf8');
const share = fs.readFileSync('js/share-profile.js', 'utf8');

assert.match(html, /js\/locale-az\.js\?v=27/);
assert.match(html, /js\/locale\.js\?v=32/);
assert.match(locale, /profileSharingDocumentDialog/);
assert.match(locale, /profileSharingFilesDialog/);
assert.doesNotMatch(locale, /#profileSharingDocumentChoices,#profileSharingActiveList/);
assert.match(locale, /Başlanğıc:/);
assert.match(locale, /fayl paylaşılıb/);
assert.match(az, /"View files": "Fayllara bax"/);
assert.match(az, /"Files in this share link": "Bu paylaşım keçidindəki fayllar"/);
assert.match(az, /"Recipient \/ link label": "Alıcı \/ keçid qeydi"/);
assert.match(az, /"● Active": "● Aktiv"/);
assert.match(sharing, /uiText\('Sharing settings could not be saved\. Please try again\.'\)/);
assert.match(share, /window\.confirm\(uiText\('Delete this share link/);
assert.match(share, /Bu təsdiqlənmiş rekruter sorğusu/);

console.log('Profile Sharing Azerbaijani localization contracts passed');
