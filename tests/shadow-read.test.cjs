const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const repo = path.resolve(__dirname, '..');
const shadow = require(path.join(repo, 'js', 'shadow-read.js'));

const IDS = {
  p1: '11111111-1111-4111-8111-111111111111',
  p2: '22222222-2222-4222-8222-222222222222',
  c1: '33333333-3333-4333-8333-333333333333',
  c2: '44444444-4444-4444-8444-444444444444',
  j1: '55555555-5555-4555-8555-555555555555',
};

function targetFromSource(source) {
  const personnelIds = new Map();
  const projectIds = new Map();
  const personnel = source.personnel.map((item, index) => {
    const id = `personnel-${index + 1}`;
    personnelIds.set(item.id, id);
    return { id, source_entity_id: item.id, ...item.canonical };
  });
  const projects = source.projects.map((item, index) => {
    const id = `project-${index + 1}`;
    projectIds.set(item.id, id);
    return { id, source_entity_id: item.id, ...item.canonical };
  });
  const certificates = source.certificates.map((item, index) => {
    const canonical = item.canonical;
    return {
      id: `certificate-${index + 1}`,
      source_entity_id: item.id,
      workspace_user_id: canonical.workspace_user_id,
      workspace_account_type: canonical.workspace_account_type,
      personnel_id: personnelIds.get(canonical.personnel_source_entity_id),
      file_id: canonical.file_id,
      certificate_type: canonical.certificate_type,
      provider_name: canonical.provider_name,
      document_number: canonical.document_number,
      issuing_country: canonical.issuing_country,
      issue_date: canonical.issue_date,
      expiry_date: canonical.expiry_date,
      metadata: canonical.metadata,
    };
  });
  const assignments = source.assignments.map((item, index) => ({
    id: `assignment-${index + 1}`,
    source_entity_id: `ignored-${index + 1}`,
    workspace_user_id: item.canonical.workspace_user_id,
    workspace_account_type: item.canonical.workspace_account_type,
    personnel_id: personnelIds.get(item.canonical.personnel_source_entity_id),
    project_id: projectIds.get(item.canonical.project_source_entity_id),
  }));
  return { personnel, certificates, projects, assignments };
}

async function compareLegacy(legacy, workspace = {
  userId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  accountType: 'company',
}) {
  const source = shadow.buildSource(legacy, workspace, 'owner@example.test');
  return shadow.compare({
    legacy,
    workspace,
    email: 'owner@example.test',
    normalized: targetFromSource(source),
  });
}

(async () => {
  const empty = await compareLegacy({
    profile: null,
    personnel: [],
    certificates: [],
    projects: [],
  });
  assert.equal(empty.status, 'match');
  assert.equal(empty.mismatch_count, 0);

  const companyLegacy = {
    profile: null,
    personnel: [
      {
        atsrsId: IDS.p1,
        name: 'Same',
        surname: 'Name',
        position: 'Engineer',
        country: '',
        optional: '',
        atsrsProjectIds: [IDS.j1],
      },
      {
        atsrsId: IDS.p2,
        name: 'Same',
        surname: 'Name',
        position: 'Renamed role',
        country: null,
        atsrsProjectIds: [],
      },
    ],
    certificates: [
      {
        atsrsId: IDS.c1,
        atsrsPersonnelId: IDS.p1,
        type: 'Safety',
        docNo: 'DUPLICATE-NUMBER',
        issue: 'N/A',
        expiry: '',
      },
      {
        atsrsId: IDS.c2,
        atsrsPersonnelId: IDS.p2,
        type: 'Safety',
        docNo: 'DUPLICATE-NUMBER',
        issue: null,
        expiry: 'NA',
      },
    ],
    projects: [
      {
        atsrsId: IDS.j1,
        project: 'Project',
        vessel: '',
        recoveredAt: 'volatile-a',
      },
    ],
  };
  const full = await compareLegacy(companyLegacy);
  assert.equal(full.status, 'match');
  assert.equal(full.mismatch_count, 0);
  assert.equal(full.skipped_count, 0);
  assert.equal(full.entities.personnel.source_count, 2);
  assert.equal(full.entities.certificates.source_count, 2);
  assert.equal(full.entities.projects.source_count, 1);
  assert.equal(full.entities.assignments.source_count, 1);

  const source = shadow.buildSource(companyLegacy, {
    userId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    accountType: 'company',
  }, 'owner@example.test');
  const reordered = targetFromSource(source);
  reordered.personnel.reverse();
  reordered.certificates.reverse();
  const reorderResult = await shadow.compare({
    legacy: {
      ...companyLegacy,
      personnel: companyLegacy.personnel.slice().reverse(),
      certificates: companyLegacy.certificates.slice().reverse(),
    },
    workspace: {
      userId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      accountType: 'company',
    },
    email: 'owner@example.test',
    normalized: reordered,
  });
  assert.equal(reorderResult.status, 'match', 'stable IDs make array reorder irrelevant');

  const mismatchTarget = targetFromSource(source);
  mismatchTarget.personnel[0].position = 'Conflicting position';
  const mismatch = await shadow.compare({
    legacy: companyLegacy,
    workspace: {
      userId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      accountType: 'company',
    },
    email: 'owner@example.test',
    normalized: mismatchTarget,
  });
  assert.equal(mismatch.status, 'mismatch');
  assert.equal(mismatch.mismatch_count, 1);
  assert.deepEqual(mismatch.entities.personnel.mismatches[0].fields, ['position']);
  assert.equal(
    Object.hasOwn(mismatch.entities.personnel.mismatches[0], 'canonical'),
    false,
    'PII values must never be present in mismatch telemetry',
  );

  const missingStable = await compareLegacy({
    profile: null,
    personnel: [{ name: 'No stable id' }],
    certificates: [],
    projects: [],
  });
  assert.equal(missingStable.status, 'mismatch');
  assert.equal(missingStable.skipped_count, 1);

  const personalLegacy = {
    profile: {
      atsrsId: IDS.p1,
      name: 'Owner',
      surname: '',
      phoneVerified: false,
      whatsappVerified: false,
      capturedAt: 'volatile-b',
    },
    personnel: [],
    certificates: [{
      atsrsId: IDS.c1,
      atsrsPersonnelId: IDS.p1,
      type: 'Medical',
      issue: '2026-01-01T10:30:00Z',
      expiry: 'N/A',
    }],
    projects: [],
  };
  const personal = await compareLegacy(personalLegacy, {
    userId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    accountType: 'personal',
  });
  assert.equal(personal.status, 'match');
  assert.equal(personal.entities.personnel.source_count, 1);

  const legacyKey = 'atsrs_aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa_personal_certs';
  const hydratedOnce = await shadow.hydrateStableValue(
    legacyKey,
    JSON.stringify([{ type: 'Medical' }]),
  );
  const hydratedTwice = await shadow.hydrateStableValue(legacyKey, hydratedOnce);
  assert.equal(hydratedTwice, hydratedOnce, 'legacy hydration must be deterministic and idempotent');
  const hydratedItem = JSON.parse(hydratedOnce)[0];
  assert.match(hydratedItem.atsrsId, /^[0-9a-f-]{36}$/);
  assert.match(hydratedItem.atsrsPersonnelId, /^[0-9a-f-]{36}$/);

  assert.equal(shadow.specification.authority, 'legacy_json');
  assert.equal(shadow.specification.read_only, true);
  assert.match(shadow.specification.conflict_rule, /never overwrite/i);

  const sourceText = fs.readFileSync(path.join(repo, 'js', 'shadow-read.js'), 'utf8');
  const normalizedMigration = fs.readFileSync(
    path.join(repo, 'supabase', 'migrations', '20260729005912_normalize_workspace_operations.sql'),
    'utf8',
  );
  const dualWriteMigration = fs.readFileSync(
    path.join(repo, 'supabase', 'migrations', '20260729035118_prepare_workspace_dual_write.sql'),
    'utf8',
  );
  assert.doesNotMatch(sourceText, /\.(insert|upsert|delete)\(/);
  assert.doesNotMatch(sourceText, /\.update\(\{/);
  assert.match(sourceText, /atsrs:data-hydrated/);
  assert.match(sourceText, /window\.addEventListener\('online'/);
  assert.match(sourceText, /atsrsShadowReadStatus/);
  assert.doesNotMatch(sourceText, /dataset\.[A-Za-z0-9_]+\s*=\s*(?:user|legacy|normalized|item)/);
  assert.match(normalizedMigration, /revoke all[\s\S]+from public, anon, authenticated/i);
  assert.equal(
    (normalizedMigration.match(/for select\s+to authenticated\s+using \(\(select auth\.uid\(\)\) = workspace_user_id\)/gi) || []).length,
    4,
    'all normalized tables must enforce authenticated owner isolation',
  );
  assert.equal(
    (dualWriteMigration.match(/revoke insert, update, delete[\s\S]+?from authenticated;/gi) || []).length,
    4,
    'normalized shadow tables must remain frontend read-only',
  );

  console.log('normalized shadow-read comparator tests passed');
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
