const assert = require('node:assert/strict');
const crypto = require('node:crypto');

function optionalText(value) {
  const text = value == null ? '' : String(value).trim();
  return text === '' ? null : text;
}

function isoDate(value) {
  const text = optionalText(value);
  if (text == null || /^(N\/A|NA)$/i.test(text)) return null;
  assert.match(text, /^\d{4}-\d{2}-\d{2}$/);
  return text;
}

function stableObject(entries) {
  return Object.fromEntries(entries);
}

function canonicalPersonnel(item) {
  return stableObject([
    ['source_entity_id', item.atsrsId],
    ['name', optionalText(item.name)],
    ['surname', optionalText(item.surname)],
    ['position', optionalText(item.position)],
    ['company', optionalText(item.company)],
    ['employee_id', optionalText(item.employeeId)],
    ['project_ids', [...new Set(item.atsrsProjectIds || [])].sort()]
  ]);
}

function canonicalCertificate(item) {
  return stableObject([
    ['source_entity_id', item.atsrsId],
    ['personnel_source_entity_id', item.atsrsPersonnelId],
    ['type', optionalText(item.type)],
    ['provider', optionalText(item.provider)],
    ['document_number', optionalText(item.docNo)],
    ['country', optionalText(item.country)],
    ['issue_date', isoDate(item.issue)],
    ['expiry_date', isoDate(item.expiry)]
  ]);
}

function canonicalSet(items, mapper) {
  const mapped = items.filter(item => !item.deleted).map(mapper);
  const ids = mapped.map(item => item.source_entity_id);
  assert.equal(new Set(ids).size, ids.length, 'duplicate semantic source_entity_id');
  mapped.sort((a, b) => a.source_entity_id.localeCompare(b.source_entity_id));
  return mapped;
}

function checksum(items, mapper) {
  return crypto
    .createHash('sha256')
    .update(JSON.stringify(canonicalSet(items, mapper)))
    .digest('hex');
}

const idA = '11111111-1111-5111-8111-111111111111';
const idB = '22222222-2222-5222-8222-222222222222';
const projectA = 'aaaaaaaa-aaaa-5aaa-8aaa-aaaaaaaaaaaa';
const projectB = 'bbbbbbbb-bbbb-5bbb-8bbb-bbbbbbbbbbbb';

const personnelA = [
  {
    atsrsId: idA,
    name: '  Anar  ',
    surname: '',
    position: null,
    atsrsProjectIds: [projectB, projectA, projectA]
  },
  { atsrsId: idB, name: 'Second', atsrsProjectIds: [] }
];
const personnelB = [
  { atsrsId: idB, name: 'Second', atsrsProjectIds: [] },
  {
    atsrsId: idA,
    name: 'Anar',
    surname: null,
    position: '   ',
    atsrsProjectIds: [projectA, projectB]
  }
];
assert.equal(
  checksum(personnelA, canonicalPersonnel),
  checksum(personnelB, canonicalPersonnel),
  'trim, null/empty and array order must normalize consistently'
);

const certificatesA = [{
  atsrsId: idA,
  atsrsPersonnelId: idB,
  type: ' Passport ',
  issue: 'N/A',
  expiry: '2030-01-02'
}];
const certificatesB = [{
  atsrsId: idA,
  atsrsPersonnelId: idB,
  type: 'Passport',
  issue: null,
  expiry: '2030-01-02'
}];
assert.equal(
  checksum(certificatesA, canonicalCertificate),
  checksum(certificatesB, canonicalCertificate)
);

assert.throws(
  () => checksum([...personnelA, { ...personnelA[0] }], canonicalPersonnel),
  /duplicate semantic source_entity_id/
);

const withTombstone = [
  ...personnelA,
  { atsrsId: '33333333-3333-5333-8333-333333333333', name: 'Deleted', deleted: true }
];
assert.equal(
  checksum(personnelA, canonicalPersonnel),
  checksum(withTombstone, canonicalPersonnel),
  'tombstones are excluded from the active entity checksum'
);
assert.equal(withTombstone.filter(item => item.deleted).length, 1);

assert.throws(
  () => canonicalCertificate({ atsrsId: idA, atsrsPersonnelId: idB, issue: '02/01/2030' }),
  /did not match the regular expression/
);

console.log('canonical checksum specification tests passed');
