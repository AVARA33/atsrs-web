const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const repo = path.resolve(__dirname, '..');
const shadow = require(path.join(repo, 'js', 'shadow-read.js'));
const runtime = require(path.join(repo, 'js', 'normalized-read-runtime.js'));

const userId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const accountType = 'company';
const scope = `${userId}::${accountType}`;
const scopeHash = crypto.createHash('sha256').update(scope).digest('hex');
const personId = '11111111-1111-4111-8111-111111111111';
const legacy = {
  personnel: [{
    atsrsId: personId,
    name: 'Canary',
    surname: 'Person',
    position: 'Engineer',
    atsrsProjectIds: [],
  }],
  certificates: [],
  projects: [],
};
const source = shadow.buildSource(
  {profile: null, ...legacy},
  {userId, accountType},
  '',
);
const normalized = {
  atsrs_workspace_personnel: source.personnel.map((item) => ({
    id: '22222222-2222-4222-8222-222222222222',
    source_entity_id: item.id,
    ...item.canonical,
  })),
  atsrs_personnel_certificates: [],
  atsrs_workspace_projects: [],
  atsrs_project_personnel: [],
};

function rootFixture(options = {}) {
  const reads = [];
  const queries = [];
  const listeners = {};
  const dataset = {};
  let mode = accountType;
  const root = {
    currentUser: {id: userId, email: ''},
    localStorage: {getItem: () => mode},
    document: {documentElement: {dataset}},
    addEventListener: (name, listener) => { listeners[name] = listener; },
    atsrsCloudData: {
      read(key) {
        reads.push(key);
        if (key.endsWith('_personnel')) return JSON.stringify(legacy.personnel);
        if (key.endsWith('_certs')) return '[]';
        if (key.endsWith('_projects')) return '[]';
        return '{}';
      },
    },
    supabaseClient: {
      from(table) {
        const query = {table, filters: []};
        queries.push(query);
        return {
          select(columns) {
            query.columns = columns;
            return this;
          },
          eq(field, value) {
            query.filters.push([field, value]);
            if (query.filters.length < 2) return this;
            if (options.error) {
              return Promise.resolve({data: null, error: {code: 'PGRST000'}});
            }
            const response = {
              data: (options.normalized || normalized)[table],
              error: null,
            };
            return options.delay
              ? new Promise((resolve) => setTimeout(() => resolve(response), options.delay))
              : Promise.resolve(response);
          },
        };
      },
    },
  };
  return {
    root,
    reads,
    queries,
    listeners,
    dataset,
    setMode(value) { mode = value; },
  };
}

(async () => {
  const off = rootFixture();
  runtime.install(off.root, {enabled: false, scopeHashes: [scopeHash]});
  const offResult = await runtime.run(off.root, {scope, accountType});
  assert.equal(offResult.fallback_reason, 'feature_flag_off');
  assert.equal(off.queries.length, 0, 'default-off mode must make zero Data API calls');
  assert.equal(off.reads.length, 0, 'default-off mode must not inspect legacy data');

  const canary = rootFixture();
  runtime.configure({enabled: true, scopeHashes: [scopeHash]});
  const result = await runtime.run(canary.root, {scope, accountType});
  assert.equal(result.status, 'match');
  assert.equal(result.normalized_candidate, true);
  assert.equal(result.selected_source, 'legacy_json');
  assert.equal(result.mutation, false);
  assert.equal(canary.queries.length, 4);
  for (const query of canary.queries) {
    assert.deepEqual(query.filters, [
      ['workspace_user_id', userId],
      ['workspace_account_type', accountType],
    ]);
  }

  const denied = rootFixture();
  runtime.configure({enabled: true, scopeHashes: ['0'.repeat(64)]});
  const deniedResult = await runtime.run(denied.root, {scope, accountType});
  assert.equal(deniedResult.fallback_reason, 'feature_flag_off');
  assert.equal(denied.queries.length, 0);

  const failure = rootFixture({error: true});
  runtime.configure({enabled: true, scopeHashes: [scopeHash]});
  const failedResult = await runtime.run(failure.root, {scope, accountType});
  assert.equal(failedResult.status, 'fallback');
  assert.equal(failedResult.fallback_reason, 'normalized_read_unavailable');
  assert.equal(failedResult.selected_source, 'legacy_json');

  const mismatchRows = structuredClone(normalized);
  mismatchRows.atsrs_workspace_personnel[0].position = 'Mismatch';
  const mismatch = rootFixture({normalized: mismatchRows});
  runtime.configure({enabled: true, scopeHashes: [scopeHash]});
  const mismatchResult = await runtime.run(mismatch.root, {scope, accountType});
  assert.equal(mismatchResult.status, 'fallback');
  assert.equal(mismatchResult.mismatch_count, 1);
  assert.equal(mismatchResult.selected_source, 'legacy_json');

  const stale = rootFixture({delay: 10});
  runtime.configure({enabled: true, scopeHashes: [scopeHash]});
  const stalePromise = runtime.run(stale.root, {scope, accountType});
  stale.setMode('personal');
  const staleResult = await stalePromise;
  assert.equal(staleResult.fallback_reason, 'stale_scope_result');
  assert.equal(staleResult.selected_source, 'legacy_json');

  const reconnect = rootFixture({error: true});
  runtime.configure({enabled: true, scopeHashes: [scopeHash]});
  const offlineResult = await runtime.run(reconnect.root, {scope, accountType});
  assert.equal(offlineResult.fallback_reason, 'normalized_read_unavailable');
  reconnect.root.supabaseClient = rootFixture().root.supabaseClient;
  const reconnectResult = await runtime.run(reconnect.root, {scope, accountType});
  assert.equal(reconnectResult.status, 'match');

  const tabRuntimes = [0, 1, 2].map(() => {
    delete require.cache[require.resolve(path.join(repo, 'js', 'normalized-read-runtime.js'))];
    return require(path.join(repo, 'js', 'normalized-read-runtime.js'));
  });
  const tabFixtures = tabRuntimes.map(() => rootFixture());
  const tabResults = await Promise.all(tabRuntimes.map((tabRuntime, index) => {
    tabRuntime.configure({enabled: true, scopeHashes: [scopeHash]});
    return tabRuntime.run(tabFixtures[index].root, {scope, accountType});
  }));
  assert.deepEqual(tabResults.map((item) => item.status), ['match', 'match', 'match']);
  assert.deepEqual(tabResults.map((item) => item.selected_source), [
    'legacy_json', 'legacy_json', 'legacy_json',
  ]);

  const rolledBack = runtime.rollback(canary.root);
  assert.equal(rolledBack.selected_source, 'legacy_json');
  assert.equal(runtime.state().enabled, false);
  assert.equal(canary.dataset.atsrsNormalizedReadMode, 'legacy');

  const sourceText = fs.readFileSync(
    path.join(repo, 'js', 'normalized-read-runtime.js'),
    'utf8',
  );
  assert.doesNotMatch(sourceText, /\.(insert|update|upsert|delete)\(/);
  assert.doesNotMatch(sourceText, /service_role/i);
  assert.doesNotMatch(sourceText, /localStorage\.(setItem|removeItem)/);
  assert.equal(runtime.specification.default_enabled, false);
  assert.equal(runtime.specification.normalized_write, false);

  const index = fs.readFileSync(path.join(repo, 'index.html'), 'utf8');
  const shadowScript = index.indexOf('js/shadow-read.js?v=392');
  const adapterScript = index.indexOf('js/normalized-read-adapter.js?v=392');
  const runtimeScript = index.indexOf('js/normalized-read-runtime.js?v=392');
  const storageScript = index.indexOf('js/storage.js?v=392');
  assert.ok(
    shadowScript < adapterScript
      && adapterScript < runtimeScript
      && runtimeScript < storageScript,
    'normalized read scripts must load after comparator and before app storage',
  );
  assert.doesNotMatch(index, /__ATSRS_NORMALIZED_READ_CANARY__\s*=/);

  console.log('normalized read runtime tests passed');
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
