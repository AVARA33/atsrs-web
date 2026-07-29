const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const repo = path.resolve(__dirname, '..');
const shadow = require(path.join(repo, 'js', 'shadow-read.js'));
const adapter = require(path.join(repo, 'js', 'normalized-read-adapter.js'));

const workspace = {
  userId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  accountType: 'company',
};
const ids = {
  person: '11111111-1111-4111-8111-111111111111',
  certificate: '22222222-2222-4222-8222-222222222222',
  project: '33333333-3333-4333-8333-333333333333',
};
const legacy = {
  profile: null,
  personnel: [{
    atsrsId: ids.person,
    name: 'Canary',
    surname: 'Person',
    position: 'Engineer',
    atsrsProjectIds: [ids.project],
  }],
  certificates: [{
    atsrsId: ids.certificate,
    atsrsPersonnelId: ids.person,
    type: 'Safety',
    issue: '2026-01-01',
    expiry: '',
  }],
  projects: [{
    atsrsId: ids.project,
    project: 'Canary Project',
  }],
};

function normalizedFromLegacy() {
  const source = shadow.buildSource(legacy, workspace, '');
  const personnelId = 'aaaaaaaa-1111-4111-8111-111111111111';
  const projectId = 'aaaaaaaa-3333-4333-8333-333333333333';
  return {
    personnel: source.personnel.map((item) => ({
      id: personnelId,
      source_entity_id: item.id,
      ...item.canonical,
    })),
    certificates: source.certificates.map((item) => ({
      id: 'aaaaaaaa-2222-4222-8222-222222222222',
      source_entity_id: item.id,
      personnel_id: personnelId,
      workspace_user_id: item.canonical.workspace_user_id,
      workspace_account_type: item.canonical.workspace_account_type,
      file_id: item.canonical.file_id,
      certificate_type: item.canonical.certificate_type,
      provider_name: item.canonical.provider_name,
      document_number: item.canonical.document_number,
      issuing_country: item.canonical.issuing_country,
      issue_date: item.canonical.issue_date,
      expiry_date: item.canonical.expiry_date,
      metadata: item.canonical.metadata,
    })),
    projects: source.projects.map((item) => ({
      id: projectId,
      source_entity_id: item.id,
      ...item.canonical,
    })),
    assignments: source.assignments.map((item) => ({
      id: 'aaaaaaaa-4444-4444-8444-444444444444',
      source_entity_id: 'aaaaaaaa-5555-4555-8555-555555555555',
      workspace_user_id: item.canonical.workspace_user_id,
      workspace_account_type: item.canonical.workspace_account_type,
      personnel_id: personnelId,
      project_id: projectId,
    })),
  };
}

(async () => {
  const normalized = normalizedFromLegacy();
  const off = await adapter.evaluate({
    featureFlag: 'legacy',
    legacy,
    normalized,
    workspace,
  });
  assert.equal(off.selected_source, 'legacy_json');
  assert.equal(off.normalized_candidate, false);
  assert.equal(off.fallback_reason, 'feature_flag_off');
  assert.equal(off.normalized_model, null);

  const canary = await adapter.evaluate({
    featureFlag: 'canary',
    legacy,
    normalized,
    workspace,
  });
  assert.equal(canary.parity.status, 'match');
  assert.equal(canary.normalized_candidate, true);
  assert.equal(canary.selected_source, 'legacy_json');
  assert.equal(canary.cutover_enabled, false);
  assert.deepEqual(canary.legacy_model, canary.normalized_model);

  normalized.personnel[0].position = 'Conflicting value';
  const mismatch = await adapter.evaluate({
    featureFlag: true,
    legacy,
    normalized,
    workspace,
  });
  assert.equal(mismatch.normalized_candidate, false);
  assert.equal(mismatch.selected_source, 'legacy_json');
  assert.equal(mismatch.fallback_reason, 'parity_gate_failed');
  assert.equal(mismatch.parity.mismatch_count, 1);

  const missingStable = await adapter.evaluate({
    featureFlag: 'canary',
    legacy: {
      profile: null,
      personnel: [{name: 'Missing ID'}],
      certificates: [],
      projects: [],
    },
    normalized: {personnel: [], certificates: [], projects: [], assignments: []},
    workspace,
  });
  assert.equal(missingStable.normalized_candidate, false);
  assert.equal(missingStable.parity.skipped_count, 1);

  assert.equal(adapter.specification.default_mode, 'legacy');
  assert.equal(adapter.specification.cutover_enabled, false);
  assert.equal(adapter.specification.mutation, false);

  const source = fs.readFileSync(
    path.join(repo, 'js', 'normalized-read-adapter.js'),
    'utf8',
  );
  assert.doesNotMatch(source, /\.(insert|update|upsert|delete)\(/);
  assert.doesNotMatch(source, /localStorage|sessionStorage/);
  assert.doesNotMatch(source, /service_role/i);

  console.log('normalized read adapter preparation tests passed');
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
