const assert = require('node:assert/strict');
const path = require('node:path');

const repo = path.resolve(__dirname, '..');
const shadow = require(path.join(repo, 'js', 'shadow-read.js'));
const adapter = require(path.join(repo, 'js', 'normalized-read-adapter.js'));

const workspace = {
  userId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  accountType: 'company',
};
const ids = {
  people: [
    '11111111-1111-4111-8111-111111111111',
    '22222222-2222-4222-8222-222222222222',
  ],
  certificates: [
    '33333333-3333-4333-8333-333333333333',
    '44444444-4444-4444-8444-444444444444',
  ],
  project: '55555555-5555-4555-8555-555555555555',
};
const legacy = {
  profile: null,
  personnel: ids.people.map((id, index) => ({
    atsrsId: id,
    name: 'Duplicate',
    surname: 'Name',
    position: index ? '' : 'Engineer',
    atsrsProjectIds: index ? [] : [ids.project],
    volatileUiNote: `keep-${index}`,
  })),
  certificates: ids.certificates.map((id, index) => ({
    atsrsId: id,
    atsrsPersonnelId: ids.people[index],
    person: 'Duplicate Name',
    type: 'Safety',
    docNo: 'SAME-NUMBER',
    provider: '',
    issue: '',
    expiry: 'N/A',
    fileName: `keep-${index}.pdf`,
  })),
  projects: [{
    atsrsId: ids.project,
    project: 'Project One',
    vessel: '',
    uiOrder: 7,
  }],
};

function normalizedFromLegacy(value) {
  const source = shadow.buildSource(value, workspace, '');
  const personnelIds = new Map(source.personnel.map((row, index) => [
    row.id,
    `person-${index}`,
  ]));
  const projectIds = new Map(source.projects.map((row, index) => [
    row.id,
    `project-${index}`,
  ]));
  return {
    personnel: source.personnel.map((row) => ({
      id: personnelIds.get(row.id),
      source_entity_id: row.id,
      ...row.canonical,
    })).reverse(),
    certificates: source.certificates.map((row, index) => {
      const canonical = {...row.canonical};
      delete canonical.personnel_source_entity_id;
      return {
        id: `certificate-${index}`,
        source_entity_id: row.id,
        personnel_id: personnelIds.get(row.canonical.personnel_source_entity_id),
        ...canonical,
      };
    }).reverse(),
    projects: source.projects.map((row) => ({
      id: projectIds.get(row.id),
      source_entity_id: row.id,
      ...row.canonical,
    })).reverse(),
    assignments: source.assignments.map((row, index) => ({
      id: `assignment-${index}`,
      source_entity_id: `assignment-source-${index}`,
      workspace_user_id: row.canonical.workspace_user_id,
      workspace_account_type: row.canonical.workspace_account_type,
      personnel_id: personnelIds.get(row.canonical.personnel_source_entity_id),
      project_id: projectIds.get(row.canonical.project_source_entity_id),
    })).reverse(),
  };
}

(async () => {
  const normalized = normalizedFromLegacy(legacy);
  const result = await adapter.evaluate({
    featureFlag: 'canary',
    primaryRead: true,
    legacy,
    normalized,
    workspace,
  });
  assert.equal(result.selected_source, 'normalized_overlay');
  assert.equal(result.parity.status, 'match');
  assert.deepEqual(
    result.read_model.personnel.map((row) => row.atsrsId),
    ids.people,
    'legacy UI order must not change when normalized rows are reordered',
  );
  assert.equal(result.read_model.personnel[0].volatileUiNote, 'keep-0');
  assert.equal(result.read_model.certificates[0].fileName, 'keep-0.pdf');
  assert.equal(result.read_model.certificates[1].fileName, 'keep-1.pdf');
  assert.equal(result.read_model.certificates[0].docNo, 'SAME-NUMBER');
  assert.equal(result.read_model.certificates[1].docNo, 'SAME-NUMBER');
  assert.deepEqual(result.read_model.personnel[0].atsrsProjectIds, [ids.project]);
  assert.deepEqual(result.read_model.personnel[1].atsrsProjectIds, []);
  assert.equal(result.read_model.projects[0].uiOrder, 7);
  assert.deepEqual(
    adapter.legacyModel({
      legacy: result.read_model,
      workspace,
      email: '',
    }),
    result.normalized_model,
  );

  const renamed = structuredClone(normalized);
  renamed.personnel.find(
    (row) => row.source_entity_id === ids.people[0],
  ).first_name = 'Changed';
  const rejected = await adapter.evaluate({
    featureFlag: 'canary',
    primaryRead: true,
    legacy,
    normalized: renamed,
    workspace,
  });
  assert.equal(rejected.selected_source, 'legacy_json');
  assert.equal(rejected.fallback_reason, 'parity_gate_failed');

  const empty = await adapter.evaluate({
    featureFlag: 'canary',
    primaryRead: true,
    legacy: {profile: null, personnel: [], certificates: [], projects: []},
    normalized: {personnel: [], certificates: [], projects: [], assignments: []},
    workspace,
  });
  assert.equal(empty.selected_source, 'normalized_overlay');
  assert.deepEqual(empty.read_model.personnel, []);
  assert.deepEqual(empty.read_model.certificates, []);
  assert.deepEqual(empty.read_model.projects, []);

  console.log('normalized primary read compatibility tests passed');
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
