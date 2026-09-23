const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const jobs = fs.readFileSync('js/jobs-prototype.js', 'utf8');
const locale = fs.readFileSync('js/locale-az.js', 'utf8');
const loader = fs.readFileSync('js/route-feature-loader.js', 'utf8');
const index = fs.readFileSync('index.html', 'utf8');

const messages = [
  ['For more info, please expand the card.', 'Ətraflı məlumat üçün kartı genişləndirin.'],
  ['Original listing', 'Orijinal elan'],
  ['Open application', 'Müraciəti aç'],
  ['Open LinkedIn', 'LinkedIn profilini aç'],
  ['Expand job details', 'Vakansiya məlumatlarını genişləndir'],
  ['Minimize job details', 'Vakansiya məlumatlarını kiçilt'],
  ['Recruiter organisation', 'Rekruter təşkilatı'],
  ['Recruiter email', 'Rekruterin e-poçtu'],
  ['Listing source', 'Elanın mənbəyi'],
  ['Contact and application', 'Əlaqə və müraciət'],
  ['No matching roles', 'Uyğun vəzifə tapılmadı'],
];

test('JobSearch Azerbaijani dictionary contains every dynamic card and action label', () => {
  for (const [english, azerbaijani] of messages) {
    assert.ok(locale.includes(JSON.stringify(english)), `missing source key: ${english}`);
    assert.ok(locale.includes(JSON.stringify(azerbaijani)), `missing Azerbaijani value: ${azerbaijani}`);
  }
});

test('dynamic JobSearch controls pass user-visible labels through uiText', () => {
  assert.match(jobs, /job-card-expand-hint',uiText\('For more info, please expand the card\.'\)/);
  assert.match(jobs, /contact\(actions,'Listing source',sourceName\(job\)/);
  assert.match(jobs, /contact\(actions,'Application',uiText\('Open application'\)/);
  assert.match(jobs, /contact\(actions,'Recruiter LinkedIn',uiText\('Open LinkedIn'\)/);
  assert.match(jobs, /var label=uiText\(expanded\?'Minimize job details':'Expand job details'\)/);
  assert.match(jobs, /pageButton\(uiText\('Previous'\)/);
  assert.match(jobs, /pageButton\(uiText\('Next'\)/);
  assert.match(jobs, /jobs-select-empty',uiText\('No matching roles'\)/);
});

test('V6177 preserves the Azerbaijani locale and JobSearch runtime', () => {
  assert.match(index, /data-atsrs-build="V6183"/);
  assert.match(index, /js\/locale-az\.js\?v=6169/);
  assert.match(index, /js\/route-feature-loader\.js\?v=6183/);
  assert.match(loader, /js\/jobs-prototype\.js\?v=6170/);
});
