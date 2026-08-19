const test = require('node:test');
const assert = require('node:assert/strict');

function eligible({ account = 'personal', visibility = 'Public', certificates = [] }) {
  return account === 'personal'
    && visibility === 'Public'
    && certificates.some((certificate) => certificate.persisted === true);
}

const cases = [
  ['A Public + 1 Certificate', { certificates: [{ persisted: true }] }, true],
  ['B Public + multiple Certificates', { certificates: [{ persisted: true }, { persisted: true }] }, true],
  ['C Public + expired Certificate', { certificates: [{ persisted: true, expiry: 'past' }] }, true],
  ['D Public + Certificate without expiry', { certificates: [{ persisted: true, expiry: null }] }, true],
  ['E Public + only CV', { certificates: [], otherFiles: ['cv'] }, false],
  ['F Public + only Passport outside register', { certificates: [], otherFiles: ['passport'] }, false],
  ['G Private + Certificate', { visibility: 'Private', certificates: [{ persisted: true }] }, false],
  ['H Link Only + Certificate', { visibility: 'Link Only', certificates: [{ persisted: true }] }, false],
  ['I Public + QR Certificate', { certificates: [{ persisted: true, route: 'qr' }] }, true],
  ['J Public + AI/QR-AI Certificate', { certificates: [{ persisted: true, route: 'ai' }] }, true],
  ['K final Certificate deleted', { certificates: [{ persisted: false }] }, false],
  ['L one of two Certificates deleted', { certificates: [{ persisted: false }, { persisted: true }] }, true],
  ['M Public changed to Private', { visibility: 'Private', certificates: [{ persisted: true }] }, false],
  ['N Private changed to Public with existing Certificate', { visibility: 'Public', certificates: [{ persisted: true }] }, true],
];

for (const [name, fixture, expected] of cases) {
  test(name, () => assert.equal(eligible(fixture), expected));
}

test('Corporate and non-Personal records never qualify', () => {
  assert.equal(eligible({ account: 'company', certificates: [{ persisted: true }] }), false);
});

