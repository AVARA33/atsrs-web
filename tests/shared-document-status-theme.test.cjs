const assert = require('node:assert/strict');
const fs = require('node:fs');
const test = require('node:test');

const share = fs.readFileSync('css/share-profile.css', 'utf8');
const dark = fs.readFileSync('css/dark-green-text-standard-v58140.css', 'utf8');
const script = fs.readFileSync('js/share-profile.js', 'utf8');

test('expired and warning cards keep their semantic colors in light mode', () => {
  assert.match(share, /\.shared-document-status\.expired\{[^}]*background:rgba\(239,68,68,.14\);[^}]*color:#f87171/s);
  assert.match(share, /\.shared-document-status\.warning\{[^}]*color:#fbbf24/s);
  assert.match(share, /\.shared-document-status:not\(\.warning\):not\(\.expired\)/);
  assert.match(share, /\.shared-document-summary-status:not\(\.warning\):not\(\.expired\)/);
});

test('shared document names follow 90, 60, 30, 1 day and expired tones', () => {
  for (const step of ['90', '60', '30', '1']) {
    assert.match(script, new RegExp(`expiring-${step}`));
    assert.match(share, new RegExp(`\\.shared-document-card\\.status-expiring-${step} h3`));
  }
  assert.match(share, /\.shared-document-card\.status-expired h3/);
  assert.match(script, /className\.indexOf\('warning'\)>=0/);
  assert.match(script, /card\.classList\.add\('status-'\+name\)/);
});

test('dark brand accent does not override semantic document states', () => {
  assert.match(dark, /\.shared-document-status:not\(\.warning\):not\(\.expired\)/);
  assert.match(dark, /\.shared-document-summary-status:not\(\.warning\):not\(\.expired\)/);
  assert.doesNotMatch(dark, /\n\s*\.shared-document-status,\n/);
  assert.doesNotMatch(dark, /\n\s*\.shared-document-summary-status,\n/);
});
