const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const app = read('js/app.js');
const cloud = read('js/server-data.js');
const scan = read('supabase/functions/scan-document/index.ts');
const index = read('index.html');

test('QR uploads reuse the authenticated AI scan pipeline without uploading a duplicate', () => {
  assert.match(cloud, /async function downloadCloudFile\(id\)/);
  assert.match(cloud, /storage\.from\(FILE_BUCKET\)\.download\(row\.storage_path\)/);
  assert.match(cloud, /downloadDocumentFile:function\(id\)/);
  assert.match(app, /window\.atsrsReceiveQrDocument=async function\(row\)/);
  assert.match(app, /downloadDocumentFile\(row\.id\)/);
  assert.match(app, /scanDocumentFile\(qrFile,\{qrRow:qrRow\}\)/);
  assert.match(app, /window\.atsrsPendingQrDocument=options\.qrRow/);
  assert.match(app, /window\.atsrsPendingCertificateFile=null/);
});

test('QR AI processing remains consent-gated and falls back to manual review', () => {
  assert.match(app, /Confirm AI processing to detect the document details/);
  assert.match(app, /requestAiConsent\(\)/);
  assert.match(app, /prepareQrManual\(options\.qrRow/);
  assert.match(index, /AI suggestions can be incomplete or incorrect\. Review every field before saving\./);
});

test('universal extraction distinguishes driving licence metadata and dates', () => {
  assert.match(scan, /document_category/);
  assert.match(scan, /"driving_licence"/);
  assert.match(scan, /issuing_country/);
  assert.match(scan, /issuing_authority/);
  assert.match(scan, /distinguish date of birth, issue date, and expiry date/);
  assert.match(scan, /regardless of country, language, industry, or visual layout/);
  assert.match(app, /documentData\.issuing_country\|\|documentData\.country_authority/);
});

test('updated frontend assets are cache-busted together', () => {
  assert.match(index, /js\/server-data\.js\?v=572/);
  assert.match(index, /js\/document-date-validation\.js\?v=1/);
  assert.match(index, /js\/app\.js\?v=568/);
});
