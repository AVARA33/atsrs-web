const assert = require('node:assert/strict');
const crypto = require('node:crypto').webcrypto;
const fs = require('node:fs');
const vm = require('node:vm');

const source = fs.readFileSync(
  require('node:path').join(__dirname, '..', 'js', 'server-data.js'),
  'utf8'
);

class FakeStorage {
  constructor() {
    this.values = new Map();
  }
  get length() {
    return this.values.size;
  }
  key(index) {
    return Array.from(this.values.keys())[index] ?? null;
  }
  getItem(key) {
    return this.values.has(String(key)) ? this.values.get(String(key)) : null;
  }
  setItem(key, value) {
    this.values.set(String(key), String(value));
  }
  removeItem(key) {
    this.values.delete(String(key));
  }
}

function fakeClient(rows, controls = {}) {
  function execute(builder) {
    const filters = Object.fromEntries(builder.filters);
    const matches = row =>
      Object.entries(filters).every(([key, value]) => String(row[key]) === String(value));
    const found = rows.filter(matches);

    if (builder.operation === 'select') {
      const delay = controls.selectDelay?.[filters.account_type] || 0;
      return new Promise(resolve =>
        setTimeout(() => resolve({
          data: builder.returnSingle ? (found[0] ? { ...found[0] } : null) : found.map(row => ({ ...row })),
          error: null
        }), delay)
      );
    }
    if (builder.operation === 'update') {
        controls.updateCount = (controls.updateCount || 0) + 1;
        if (controls.rejectUpdates) {
          const error = new Error('trigger rejected write');
          error.code = 'P0001';
          return Promise.resolve({ data: null, error });
        }
      if (controls.failNextUpdate) {
        controls.failNextUpdate = false;
        return Promise.resolve({ data: null, error: new Error('offline') });
      }
      if (controls.forceStaleUpdates) {
        return Promise.resolve({ data: null, error: null });
      }
      if (!found.length) return Promise.resolve({ data: null, error: null });
      Object.assign(found[0], builder.value);
      const result = {
        data: { updated_at: found[0].updated_at },
        error: null
      };
      return controls.updateDelay
        ? new Promise(resolve => setTimeout(() => resolve(result), controls.updateDelay))
        : Promise.resolve(result);
    }
      if (builder.operation === 'insert') {
        const duplicate = rows.some(row =>
          row.user_id === builder.value.user_id &&
          row.account_type === builder.value.account_type &&
          row.data_key === builder.value.data_key
        );
        if (duplicate) {
          const error = new Error('duplicate');
          error.code = '23505';
          return Promise.resolve({ data: null, error });
        }
      rows.push({ ...builder.value });
      return Promise.resolve({
        data: { updated_at: builder.value.updated_at },
        error: null
      });
    }
    return Promise.resolve({ data: null, error: null });
  }

  return {
    rpc(name, args) {
      if (name === 'atsrs_get_stable_id_compatibility') {
        controls.compatibilityCalls = Number(controls.compatibilityCalls || 0) + 1;
        if (Number(controls.compatibilityOfflineFailures || 0) > 0) {
          controls.compatibilityOfflineFailures--;
          return {
            data: null,
            error: { code: 'PGRST001', message: 'simulated offline compatibility check' },
            status: 503
          };
        }
        const state = controls.compatibilityState || {
          strict_required: false,
          client_compatible: true,
          refresh_required: false,
          minimum_client_build: 'V405',
          kill_switch: false
        };
        return controls.compatibilityDelay
          ? new Promise(resolve => setTimeout(() => resolve({
            data: { ...state },
            error: null
          }), controls.compatibilityDelay))
          : { data: { ...state }, error: null };
      }
      if (name === 'atsrs_get_workspace_command_revision') {
        assert.ok(['personal', 'company'].includes(args.p_account_type));
        controls.revisionReads = Number(controls.revisionReads || 0) + 1;
        const readRevision = Number(controls.commandRevision || 0);
        if (controls.advanceRevisionAfterReadOnce) {
          controls.advanceRevisionAfterReadOnce = false;
          controls.commandRevision = readRevision + 1;
        }
        return {
          data: readRevision,
          error: null
        };
      }
      assert.equal(name, 'atsrs_apply_workspace_command');
      controls.rpcCalls = controls.rpcCalls || [];
      controls.rpcCalls.push(JSON.parse(JSON.stringify(args)));
      if (Number(controls.rateLimitFailuresRemaining || 0) > 0) {
        controls.rateLimitFailuresRemaining--;
        return {
          data: null,
          error: { code: 'ATSRS_RATE_LIMITED', message: 'simulated rate limit' },
          status: 429
        };
      }
      if (Number(controls.transientFailuresRemaining || 0) > 0) {
        controls.transientFailuresRemaining--;
        return {
          data: null,
          error: { code: 'PGRST001', message: 'simulated transient network failure' },
          status: 503
        };
      }
      if (controls.hangRpc) {
        let rejectRequest;
        const request = new Promise((_resolve, reject) => {
          rejectRequest = reject;
        });
        request.abortSignal = signal => {
          signal.addEventListener('abort', () => {
            const error = new Error('aborted');
            error.name = 'AbortError';
            rejectRequest(error);
          }, { once: true });
          return request;
        };
        return request;
      }
      controls.commandReceipts = controls.commandReceipts || new Map();
      const prior = controls.commandReceipts.get(args.p_operation_id);
      if (prior) return { data: prior, error: null };
      const revision = Number(controls.commandRevision || 0);
      if (Number(args.p_expected_revision) !== revision) {
        return {
          data: null,
          error: {
            code: '40001',
            message: 'ATSRS_STALE_REVISION',
            details: JSON.stringify({ current_revision: revision })
          }
        };
      }
      let changed = 0;
      for (const operation of args.p_operations) {
        const row = rows.find(item =>
          item.user_id === 'user-1'
          && item.account_type === args.p_account_type
          && item.data_key === operation.data_key
        );
        if (operation.deleted) {
          if (row && row.payload?.deleted !== true) {
            row.payload = { deleted: true };
            row.updated_at = `rpc-${revision + 1}`;
            changed++;
          }
          continue;
        }
        const serialized = JSON.stringify(operation.value);
        if (row && row.payload?.value === serialized) continue;
        if (row) {
          row.payload = { value: serialized };
          row.updated_at = `rpc-${revision + 1}`;
        } else {
          rows.push({
            user_id: 'user-1',
            account_type: args.p_account_type,
            data_key: operation.data_key,
            payload: { value: serialized },
            updated_at: `rpc-${revision + 1}`
          });
        }
        changed++;
      }
      if (changed) controls.commandRevision = revision + 1;
      const result = {
        status: changed ? 'committed' : 'no_op',
        operation_id: args.p_operation_id,
        committed_revision: Number(controls.commandRevision || 0),
        changed_keys: changed
      };
      controls.commandReceipts.set(args.p_operation_id, result);
      if (controls.failAfterCommitOnce) {
        controls.failAfterCommitOnce = false;
        return {
          data: null,
          error: { code: 'PGRST000', message: 'simulated response loss' }
        };
      }
      return { data: result, error: null };
    },
    from() {
      const builder = {
        operation: '',
        value: null,
        filters: [],
        select() {
          if (!this.operation) this.operation = 'select';
          return this;
        },
        update(value) {
          this.operation = 'update';
          this.value = value;
          return this;
        },
        insert(value) {
          this.operation = 'insert';
          this.value = value;
          return this;
        },
        eq(key, value) {
          this.filters.push([key, value]);
          return this;
        },
        order() {
          return this;
        },
        maybeSingle() {
          this.returnSingle = true;
          return this;
        },
        single() {
          this.returnSingle = true;
          return this;
        },
        then(resolve, reject) {
          return execute(this).then(resolve, reject);
        }
      };
      return builder;
    }
  };
}

function boot(rows, controls = {}, mode = 'personal') {
  const loggedErrors = [];
  const loggedWarnings = [];
  const dispatchedEvents = [];
  const eventHandlers = new Map();
  const localStorage = new FakeStorage();
  localStorage.setItem('atsrs_use_mode', mode);
  const document = {
    readyState: 'loading',
    documentElement: { dataset: { atsrsBuild: controls.clientBuild || 'V405' } },
    body: { appendChild() {} },
    addEventListener() {},
    dispatchEvent() {},
    getElementById() {
      return null;
    },
    createElement() {
      return {
        style: {},
        setAttribute() {},
        addEventListener() {}
      };
    },
    querySelectorAll() {
      return [];
    }
  };
  const window = {
    currentUser: { id: 'user-1' },
    supabaseClient: fakeClient(rows, controls),
    location: {
      search: [
        controls.normalizedWrite ? 'atsrsNormalizedWrite=canary' : '',
        controls.compatibilityCanary ? 'atsrsStableCompatibility=canary' : ''
      ].filter(Boolean).length
        ? `?${[
          controls.normalizedWrite ? 'atsrsNormalizedWrite=canary' : '',
          controls.compatibilityCanary ? 'atsrsStableCompatibility=canary' : ''
        ].filter(Boolean).join('&')}`
        : ''
    },
    __ATSRS_NORMALIZED_WRITE_CANARY__: controls.normalizedWrite ? {
      enabled: true,
      primaryWrite: false,
      allowAllScopes: false,
      requestTimeoutMs: controls.requestTimeoutMs || 12000,
      transientRetries: controls.transientRetries === undefined
        ? 2 : controls.transientRetries,
      circuitFailureThreshold: controls.circuitFailureThreshold || 2,
      circuitTransientOpenMs: 15000,
      circuitStaleOpenMs: 120000,
      circuitBusyOpenMs: 5000,
      circuitRateLimitOpenMs: 30000,
      scopeHashes: [
        '13243347bab9453c39c1eff996e490bda0085810d40df123f9ece922a7360932',
        'bf1b1f7b4785f78b0ce888526c028e1f4bb0206502df8df562b255b511978b7e'
      ]
    } : undefined,
    __ATSRS_STABLE_ID_COMPATIBILITY__:
      controls.compatibilityEnabled || controls.compatibilityCanary ? {
      enabled: Boolean(controls.compatibilityEnabled),
      clientBuild: controls.clientBuild || 'V405',
      cacheMs: 60000,
      canaryQueryKey: 'atsrsStableCompatibility',
      scopeHashes: controls.compatibilityScopeHashes || [
        '13243347bab9453c39c1eff996e490bda0085810d40df123f9ece922a7360932'
      ]
    } : undefined,
    ATSRS_CLIENT_BUILD: controls.clientBuild || 'V405',
    addEventListener(type, handler) {
      if (!eventHandlers.has(type)) eventHandlers.set(type, []);
      eventHandlers.get(type).push(handler);
    },
    dispatchEvent(event) {
      dispatchedEvents.push(event);
      for (const handler of eventHandlers.get(event.type) || []) handler(event);
      return true;
    },
    setTimeout,
    clearTimeout
  };
  const context = {
    window,
    currentUser: window.currentUser,
    document,
    localStorage,
    Storage: FakeStorage,
    CustomEvent: class CustomEvent {
      constructor(type, init) {
        this.type = type;
        this.detail = init?.detail;
      }
    },
    crypto,
    TextEncoder,
    URL,
    URLSearchParams,
    Blob,
    console: {
      log: console.log,
      warn(...args) {
        loggedWarnings.push(args.map(String).join(' '));
      },
      error(...args) {
        loggedErrors.push(args.map(String).join(' '));
      }
    },
    setTimeout,
    clearTimeout
  };
  vm.runInNewContext(source, context, { filename: 'server-data.js' });
  return {
    api: window.atsrsCloudData,
    localStorage,
    rows,
    controls,
    loggedErrors,
    loggedWarnings,
    dispatchedEvents,
    emit(type) {
      for (const handler of eventHandlers.get(type) || []) handler({ type });
    }
  };
}

function markers(mode) {
  return [
    {
      user_id: 'user-1',
      account_type: mode,
      data_key: '__cloud_data_migration_v2',
      payload: { completed_at: 'test' },
      updated_at: `${mode}-migration`
    },
    {
      user_id: 'user-1',
      account_type: mode,
      data_key: '__cloud_file_migration_v2',
      payload: { completed_at: 'test' },
      updated_at: `${mode}-files`
    }
  ];
}

async function testHydrationAndStaleWrite() {
  const key = 'atsrs_user-1_personal_profile';
  const rows = [
    ...markers('personal'),
    {
      user_id: 'user-1',
      account_type: 'personal',
      data_key: key,
      payload: { value: JSON.stringify({ name: 'Test' }) },
      updated_at: 'v1'
    }
  ];
  const app = boot(rows);
  await app.api.ensureLoaded();
  const hydrated = JSON.parse(app.api.read(key));
  assert.match(hydrated.atsrsId, /^[0-9a-f-]{36}$/);

  hydrated.position = 'First';
  app.api.write(key, JSON.stringify(hydrated));
  assert.equal(await app.api.flush(), true);
  assert.equal(JSON.parse(rows[2].payload.value).position, 'First');

  rows[2].payload.value = JSON.stringify({ name: 'External' });
  rows[2].updated_at = 'external-v2';
  hydrated.position = 'Stale';
  app.api.write(key, JSON.stringify(hydrated));
  assert.equal(await app.api.flush(), false);
  assert.equal(JSON.parse(rows[2].payload.value).name, 'External');
  assert.equal(app.loggedErrors.length, 0);
  assert.ok(app.loggedWarnings.some(message => message.includes('newer server data was preserved')));
}

async function testOfflineRetry() {
  const key = 'atsrs_user-1_personal_profile';
  const controls = { failNextUpdate: true };
  const rows = [
    ...markers('personal'),
    {
      user_id: 'user-1',
      account_type: 'personal',
      data_key: key,
      payload: { value: JSON.stringify({ name: 'Before' }) },
      updated_at: 'retry-v1'
    }
  ];
  const app = boot(rows, controls);
  await app.api.ensureLoaded();
  const value = JSON.parse(app.api.read(key));
  value.name = 'After reconnect';
  app.api.write(key, JSON.stringify(value));
  assert.equal(await app.api.flush(), true);
  assert.equal(JSON.parse(rows[2].payload.value).name, 'After reconnect');
  assert.equal(app.loggedErrors.length, 0);
  assert.ok(app.loggedWarnings.some(message => message.includes('pending user change')));
}

async function testAccountSwitchOrdering() {
  const personalKey = 'atsrs_user-1_personal_profile';
  const companyKey = 'atsrs_user-1_company_profile';
  const rows = [
    ...markers('personal'),
    ...markers('company'),
    {
      user_id: 'user-1',
      account_type: 'personal',
      data_key: personalKey,
      payload: { value: JSON.stringify({ name: 'Personal' }) },
      updated_at: 'personal-v1'
    },
    {
      user_id: 'user-1',
      account_type: 'company',
      data_key: companyKey,
      payload: { value: JSON.stringify({ name: 'Company' }) },
      updated_at: 'company-v1'
    }
  ];
  const app = boot(rows, { selectDelay: { personal: 30, company: 0 } });
  const personalLoad = app.api.ensureLoaded();
  app.localStorage.setItem('atsrs_use_mode', 'company');
  const companyLoad = app.api.ensureLoaded();
  await Promise.all([personalLoad, companyLoad]);
  assert.equal(JSON.parse(app.api.read(companyKey)).name, 'Company');
  assert.equal(app.api.read(personalKey), null);
}

async function testDeterministicRenameReorderAndRelations() {
  const key = 'atsrs_user-1_company_personnel';
  const projectId = '132fd59a-6389-4fe2-8499-040c20966f01';
  const rows = [
    ...markers('company'),
    {
      user_id: 'user-1',
      account_type: 'company',
      data_key: key,
      payload: {
        value: JSON.stringify([
          { name: 'First', atsrsProjectIds: [projectId, 'invalid'] },
          { name: 'Second', atsrsProjectIds: [] }
        ])
      },
      updated_at: 'company-v1'
    }
  ];
  const app = boot(rows, {}, 'company');
  await app.api.ensureLoaded();
  const hydrated = JSON.parse(app.api.read(key));
  const firstId = hydrated[0].atsrsId;
  const secondId = hydrated[1].atsrsId;
  assert.match(firstId, /^[0-9a-f-]{36}$/);
  assert.match(secondId, /^[0-9a-f-]{36}$/);
  assert.notEqual(firstId, secondId);
  assert.deepEqual(Array.from(hydrated[0].atsrsProjectIds), [projectId]);

  hydrated[0].name = 'Renamed';
  hydrated.reverse();
  app.api.write(key, JSON.stringify(hydrated));
  assert.equal(await app.api.flush(), true);
  const saved = JSON.parse(rows[2].payload.value);
  assert.equal(saved[0].atsrsId, secondId);
  assert.equal(saved[1].atsrsId, firstId);
  assert.equal(saved[1].name, 'Renamed');

  const reloaded = boot(rows, {}, 'company');
  await reloaded.api.ensureLoaded();
  const afterReconnect = JSON.parse(reloaded.api.read(key));
  assert.equal(afterReconnect[0].atsrsId, secondId);
  assert.equal(afterReconnect[1].atsrsId, firstId);
}

async function testCrossWorkspaceIsolation() {
  const key = 'atsrs_user-1_company_personnel';
  const rows = [
    ...markers('personal'),
    ...markers('company'),
    {
      user_id: 'user-1',
      account_type: 'personal',
      data_key: key,
      payload: { value: JSON.stringify([{ name: 'Wrong workspace' }]) },
      updated_at: 'personal-v1'
    },
    {
      user_id: 'user-1',
      account_type: 'company',
      data_key: key,
      payload: { value: JSON.stringify([{ name: 'Correct workspace' }]) },
      updated_at: 'company-v1'
    }
  ];
  const app = boot(rows, {}, 'company');
  await app.api.ensureLoaded();
  assert.equal(JSON.parse(app.api.read(key))[0].name, 'Correct workspace');
}

async function testLatestQueuedWriteWins() {
  const key = 'atsrs_user-1_personal_profile';
  const rows = [
    ...markers('personal'),
    {
      user_id: 'user-1',
      account_type: 'personal',
      data_key: key,
      payload: { value: JSON.stringify({ name: 'Before' }) },
      updated_at: 'queue-v1'
    }
  ];
  const app = boot(rows);
  await app.api.ensureLoaded();
  const first = JSON.parse(app.api.read(key));
  first.name = 'First queued value';
  app.api.write(key, JSON.stringify(first));
  const second = { ...first, name: 'Latest queued value' };
  app.api.write(key, JSON.stringify(second));
  assert.equal(await app.api.flush(), true);
  assert.equal(JSON.parse(rows[2].payload.value).name, 'Latest queued value');
}

async function testFlushWaitsForWritesQueuedWhileFlushing() {
  const key = 'atsrs_user-1_personal_profile';
  const rows = [
    ...markers('personal'),
    {
      user_id: 'user-1',
      account_type: 'personal',
      data_key: key,
      payload: { value: JSON.stringify({ name: 'Before' }) },
      updated_at: 'flush-v1'
    }
  ];
  const controls = { updateDelay: 25 };
  const app = boot(rows, controls);
  await app.api.ensureLoaded();
  const first = JSON.parse(app.api.read(key));
  first.name = 'First';
  app.api.write(key, JSON.stringify(first));
  const flushing = app.api.flush();

  await new Promise(resolve => setTimeout(resolve, 5));
  app.api.write(key, JSON.stringify({ ...first, name: 'Queued during flush' }));

  assert.equal(await flushing, true);
  assert.equal(app.api.isSynced(), true);
  assert.equal(JSON.parse(rows[2].payload.value).name, 'Queued during flush');
}

async function testNoOpWriteIsDeduplicated() {
  const key = 'atsrs_user-1_personal_profile';
  const value = JSON.stringify({ name: 'Unchanged', phoneVerified: false });
  const rows = [
    ...markers('personal'),
    {
      user_id: 'user-1',
      account_type: 'personal',
      data_key: key,
      payload: { value },
      updated_at: 'dedupe-v1'
    }
  ];
  const controls = {};
  const app = boot(rows, controls);
  await app.api.ensureLoaded();
  assert.equal(app.api.write(key, app.api.read(key)), true);
  assert.equal(await app.api.flush(), true);
  assert.equal(controls.updateCount || 0, 0);
}

async function testTwoTabsMergeDifferentFieldsOnSameKey() {
  const key = 'atsrs_user-1_personal_profile';
  const rows = [
    ...markers('personal'),
    {
      user_id: 'user-1',
      account_type: 'personal',
      data_key: key,
      payload: { value: JSON.stringify({ name: 'Original', position: 'Original', country: 'AZ' }) },
      updated_at: 'shared-v1'
    }
  ];
  const tabA = boot(rows);
  const tabB = boot(rows);
  await Promise.all([tabA.api.ensureLoaded(), tabB.api.ensureLoaded()]);

  const valueA = JSON.parse(tabA.api.read(key));
  valueA.position = 'Tab A position';
  tabA.api.write(key, JSON.stringify(valueA));
  assert.equal(await tabA.api.flush(), true);

  const valueB = JSON.parse(tabB.api.read(key));
  valueB.country = 'NO';
  tabB.api.write(key, JSON.stringify(valueB));
  assert.equal(await tabB.api.flush(), true);

  const saved = JSON.parse(rows[2].payload.value);
  assert.equal(saved.position, 'Tab A position');
  assert.equal(saved.country, 'NO');
  assert.equal(saved.name, 'Original');
  assert.equal(tabA.loggedErrors.length + tabB.loggedErrors.length, 0);
}

async function testTwoTabsDifferentKeysDoNotConflict() {
  const profileKey = 'atsrs_user-1_personal_profile';
  const certsKey = 'atsrs_user-1_personal_certs';
  const rows = [
    ...markers('personal'),
    {
      user_id: 'user-1',
      account_type: 'personal',
      data_key: profileKey,
      payload: { value: JSON.stringify({ name: 'Original' }) },
      updated_at: 'profile-v1'
    },
    {
      user_id: 'user-1',
      account_type: 'personal',
      data_key: certsKey,
      payload: { value: JSON.stringify([]) },
      updated_at: 'certs-v1'
    }
  ];
  const tabA = boot(rows);
  const tabB = boot(rows);
  await Promise.all([tabA.api.ensureLoaded(), tabB.api.ensureLoaded()]);

  const profile = JSON.parse(tabA.api.read(profileKey));
  profile.position = 'Updated';
  tabA.api.write(profileKey, JSON.stringify(profile));
  const certs = JSON.parse(tabB.api.read(certsKey));
  certs.push({ type: 'Synthetic contract row' });
  tabB.api.write(certsKey, JSON.stringify(certs));
  assert.equal(await tabA.api.flush(), true);
  assert.equal(await tabB.api.flush(), true);
  assert.equal(JSON.parse(rows[2].payload.value).position, 'Updated');
  assert.equal(JSON.parse(rows[3].payload.value).length, 1);
  assert.equal(tabA.loggedErrors.length + tabB.loggedErrors.length, 0);
}

async function testMissingRowInsertRaceRebasesInsteadOfLooping() {
  const key = 'atsrs_user-1_personal_profile';
  const rows = [...markers('personal')];
  const tabA = boot(rows);
  const tabB = boot(rows);
  await Promise.all([tabA.api.ensureLoaded(), tabB.api.ensureLoaded()]);

  const stableId = '11111111-1111-5111-8111-111111111111';
  tabA.api.write(key, JSON.stringify({ atsrsId: stableId, name: 'Synthetic', position: 'A' }));
  tabB.api.write(key, JSON.stringify({ atsrsId: stableId, name: 'Synthetic', country: 'B' }));
  const flushResults = await Promise.all([tabA.api.flush(), tabB.api.flush()]);
  assert.deepEqual(flushResults, [true, true], JSON.stringify({
    tabAErrors: tabA.loggedErrors,
    tabBErrors: tabB.loggedErrors,
    tabAWarnings: tabA.loggedWarnings,
    tabBWarnings: tabB.loggedWarnings,
    tabBPending: tabB.api.pendingState()
  }));

  const saved = JSON.parse(rows.find(row => row.data_key === key).payload.value);
  assert.equal(saved.position, 'A');
  assert.equal(saved.country, 'B');
  assert.equal(tabA.loggedErrors.length + tabB.loggedErrors.length, 0);
}

async function testThreeTabsPreserveDifferentFields() {
  const key = 'atsrs_user-1_personal_profile';
  const rows = [
    ...markers('personal'),
    {
      user_id: 'user-1',
      account_type: 'personal',
      data_key: key,
      payload: { value: JSON.stringify({ name: 'Original', position: '', country: '' }) },
      updated_at: 'three-tab-v1'
    }
  ];
  const tabA = boot(rows);
  const tabB = boot(rows);
  const tabC = boot(rows);
  await Promise.all([tabA.api.ensureLoaded(), tabB.api.ensureLoaded(), tabC.api.ensureLoaded()]);

  const a = JSON.parse(tabA.api.read(key));
  const b = JSON.parse(tabB.api.read(key));
  const c = JSON.parse(tabC.api.read(key));
  a.position = 'A';
  b.country = 'B';
  c.company = 'C';
  tabA.api.write(key, JSON.stringify(a));
  tabB.api.write(key, JSON.stringify(b));
  tabC.api.write(key, JSON.stringify(c));
  assert.deepEqual(await Promise.all([tabA.api.flush(), tabB.api.flush(), tabC.api.flush()]), [true, true, true]);

  const saved = JSON.parse(rows[2].payload.value);
  assert.equal(saved.position, 'A');
  assert.equal(saved.country, 'B');
  assert.equal(saved.company, 'C');
  assert.equal(tabA.loggedErrors.length + tabB.loggedErrors.length + tabC.loggedErrors.length, 0);
}

async function testOverlappingStaleFieldPreservesServerAndAllowsRetry() {
  const key = 'atsrs_user-1_personal_profile';
  const rows = [
    ...markers('personal'),
    {
      user_id: 'user-1',
      account_type: 'personal',
      data_key: key,
      payload: { value: JSON.stringify({ name: 'Original', position: 'Original' }) },
      updated_at: 'conflict-v1'
    }
  ];
  const tabA = boot(rows);
  const tabB = boot(rows);
  await Promise.all([tabA.api.ensureLoaded(), tabB.api.ensureLoaded()]);

  const valueA = JSON.parse(tabA.api.read(key));
  valueA.name = 'Newer server name';
  tabA.api.write(key, JSON.stringify(valueA));
  assert.equal(await tabA.api.flush(), true);

  const stale = JSON.parse(tabB.api.read(key));
  stale.name = 'Stale tab name';
  tabB.api.write(key, JSON.stringify(stale));
  assert.equal(await tabB.api.flush(), false);
  assert.equal(JSON.parse(rows[2].payload.value).name, 'Newer server name');
  assert.equal(tabB.loggedErrors.length, 0);
  assert.ok(tabB.loggedWarnings.some(message => message.includes('newer server data was preserved')));

  const retry = JSON.parse(tabB.api.read(key));
  retry.position = 'Safe retry';
  tabB.api.write(key, JSON.stringify(retry));
  assert.equal(await tabB.api.flush(), true);
  const saved = JSON.parse(rows[2].payload.value);
  assert.equal(saved.name, 'Newer server name');
  assert.equal(saved.position, 'Safe retry');
}

async function testBoundedStaleRetryStopsWithoutOverwrite() {
  const key = 'atsrs_user-1_personal_profile';
  const rows = [
    ...markers('personal'),
    {
      user_id: 'user-1',
      account_type: 'personal',
      data_key: key,
      payload: { value: JSON.stringify({ name: 'Original' }) },
      updated_at: 'bounded-v1'
    }
  ];
  const controls = { forceStaleUpdates: true };
  const app = boot(rows, controls);
  await app.api.ensureLoaded();
  const value = JSON.parse(app.api.read(key));
  value.position = 'Never persisted';
  app.api.write(key, JSON.stringify(value));
  assert.equal(await app.api.flush(), false);
  assert.equal(controls.updateCount, 3);
  assert.equal(JSON.parse(rows[2].payload.value).position, undefined);
  assert.equal(app.loggedErrors.length, 0);
}

async function testTriggerFailureRollsBackClientAndSource() {
  const key = 'atsrs_user-1_personal_profile';
  const rows = [
    ...markers('personal'),
    {
      user_id: 'user-1',
      account_type: 'personal',
      data_key: key,
      payload: { value: JSON.stringify({ name: 'Before' }) },
      updated_at: 'trigger-v1'
    }
  ];
  const controls = { rejectUpdates: true };
  const app = boot(rows, controls);
  await app.api.ensureLoaded();
  const changed = JSON.parse(app.api.read(key));
  changed.name = 'Must roll back';
  app.api.write(key, JSON.stringify(changed));
  assert.equal(await app.api.flush(), false);
  assert.equal(JSON.parse(rows[2].payload.value).name, 'Before');
  assert.equal(JSON.parse(app.api.read(key)).name, 'Before');
  assert.ok(app.loggedErrors.some(message => message.includes('cloud save was rejected')));
}

async function testNormalizedCommandFreshBootstrapAndIdempotentResponseLoss() {
  const key = 'atsrs_user-1_personal_profile';
  const rows = [
    ...markers('personal'),
    {
      user_id: 'user-1',
      account_type: 'personal',
      data_key: key,
      payload: {
        value: JSON.stringify({
          atsrsId: '11111111-1111-4111-8111-111111111111',
          name: 'Test',
          position: 'Before'
        })
      },
      updated_at: 'rpc-v4'
    }
  ];
  const controls = {
    normalizedWrite: true,
    commandRevision: 4,
    failAfterCommitOnce: true
  };
  const app = boot(rows, controls);
  await app.api.ensureLoaded();
  const changed = JSON.parse(app.api.read(key));
  changed.position = 'After';
  app.api.write(key, JSON.stringify(changed));
  assert.equal(await app.api.flush(), true);
  assert.equal(JSON.parse(rows[2].payload.value).position, 'After');
  assert.equal(controls.commandRevision, 5);
  assert.equal(controls.rpcCalls.length, 2);
  assert.equal(controls.rpcCalls[0].p_expected_revision, 4);
  assert.equal(
    controls.rpcCalls[1].p_operation_id,
    controls.rpcCalls[0].p_operation_id,
  );
  assert.equal(controls.commandReceipts.size, 1);
  assert.equal(app.loggedErrors.length, 0);
}

async function testNormalizedCommandPreservesOverlappingServerField() {
  const key = 'atsrs_user-1_personal_profile';
  const rows = [
    ...markers('personal'),
    {
      user_id: 'user-1',
      account_type: 'personal',
      data_key: key,
      payload: {
        value: JSON.stringify({
          atsrsId: '11111111-1111-4111-8111-111111111111',
          name: 'Before'
        })
      },
      updated_at: 'rpc-v1'
    }
  ];
  const controls = { normalizedWrite: true, commandRevision: 1 };
  const app = boot(rows, controls);
  await app.api.ensureLoaded();
  const stale = JSON.parse(app.api.read(key));
  rows[2].payload.value = JSON.stringify({
    atsrsId: stale.atsrsId,
    name: 'Newer server value'
  });
  rows[2].updated_at = 'rpc-v2';
  controls.commandRevision = 2;
  stale.name = 'Stale client value';
  app.api.write(key, JSON.stringify(stale));
  assert.equal(await app.api.flush(), false);
  assert.equal(JSON.parse(rows[2].payload.value).name, 'Newer server value');
  assert.ok(app.loggedWarnings.some(message =>
    message.includes('newer server data was preserved')
  ));
}

async function testNormalizedNoOpCreatesNoCommand() {
  const key = 'atsrs_user-1_personal_profile';
  const value = JSON.stringify({
    atsrsId: '11111111-1111-4111-8111-111111111111',
    name: 'No-op'
  });
  const rows = [
    ...markers('personal'),
    {
      user_id: 'user-1',
      account_type: 'personal',
      data_key: key,
      payload: { value },
      updated_at: 'rpc-noop'
    }
  ];
  const controls = { normalizedWrite: true, commandRevision: 7 };
  const app = boot(rows, controls);
  await app.api.ensureLoaded();
  app.api.write(key, value);
  assert.equal(await app.api.flush(), true);
  assert.equal((controls.rpcCalls || []).length, 0);
  assert.equal(controls.commandRevision, 7);
}

async function testNormalizedSemanticNoOpCreatesNoCommand() {
  const key = 'atsrs_user-1_company_certs';
  const personId = '11111111-1111-4111-8111-111111111111';
  const certificateId = '22222222-2222-4222-8222-222222222222';
  const baseValue = JSON.stringify([{
    atsrsId: certificateId,
    atsrsPersonnelId: personId,
    person: 'Synthetic Person',
    type: 'Synthetic Safety',
    provider: 'Synthetic Provider',
    docNo: 'SYNTHETIC-1',
    country: 'TEST',
    issue: '',
    expiry: 'N/A'
  }]);
  const rows = [
    ...markers('company'),
    {
      user_id: 'user-1',
      account_type: 'company',
      data_key: key,
      payload: { value: baseValue },
      updated_at: 'rpc-semantic-noop'
    }
  ];
  const controls = { normalizedWrite: true, commandRevision: 9 };
  const app = boot(rows, controls, 'company');
  await app.api.ensureLoaded();
  const overlayValue = JSON.stringify([{
    type: 'Synthetic Safety',
    person: 'Renamed display label',
    provider: 'Synthetic Provider',
    country: 'TEST',
    docNo: 'SYNTHETIC-1',
    expiry: '',
    issue: 'NA',
    atsrsPersonnelId: personId,
    atsrsId: certificateId,
    cloudFileId: '',
    fileName: '',
    mimeType: '',
    fileSize: 0,
    uploadedAt: '',
    capturedAt: 'technical-only'
  }]);
  app.api.write(key, overlayValue);
  assert.equal(await app.api.flush(), true);
  assert.equal((controls.rpcCalls || []).length, 0);
  assert.equal(controls.commandRevision, 9);
  assert.equal(rows[2].payload.value, baseValue);
}

async function testNormalizedSemanticComparatorKeepsRealChanges() {
  const key = 'atsrs_user-1_company_certs';
  const value = [{
    atsrsId: '22222222-2222-4222-8222-222222222222',
    atsrsPersonnelId: '11111111-1111-4111-8111-111111111111',
    person: 'Synthetic Person',
    type: 'Synthetic Safety',
    provider: 'Before'
  }];
  const rows = [
    ...markers('company'),
    {
      user_id: 'user-1',
      account_type: 'company',
      data_key: key,
      payload: { value: JSON.stringify(value) },
      updated_at: 'rpc-semantic-change'
    }
  ];
  const controls = { normalizedWrite: true, commandRevision: 11 };
  const app = boot(rows, controls, 'company');
  await app.api.ensureLoaded();
  value[0].provider = 'After';
  app.api.write(key, JSON.stringify(value));
  assert.equal(await app.api.flush(), true);
  assert.equal(controls.rpcCalls.length, 1);
  assert.equal(controls.commandRevision, 12);
  assert.equal(JSON.parse(rows[2].payload.value)[0].provider, 'After');
}

async function testNormalizedTransportTimeoutCleansUpFlush() {
  const key = 'atsrs_user-1_personal_profile';
  const rows = [
    ...markers('personal'),
    {
      user_id: 'user-1',
      account_type: 'personal',
      data_key: key,
      payload: {
        value: JSON.stringify({
          atsrsId: '11111111-1111-4111-8111-111111111111',
          name: 'Before'
        })
      },
      updated_at: 'rpc-timeout-v1'
    }
  ];
  const controls = {
    normalizedWrite: true,
    commandRevision: 1,
    hangRpc: true,
    requestTimeoutMs: 1000,
    transientRetries: 0
  };
  const app = boot(rows, controls);
  await app.api.ensureLoaded();
  const changed = JSON.parse(app.api.read(key));
  changed.name = 'After';
  app.api.write(key, JSON.stringify(changed));
  const started = Date.now();
  assert.equal(await app.api.flush(), false);
  assert.ok(Date.now() - started < 6000);
  assert.equal(JSON.parse(rows[2].payload.value).name, 'Before');
  assert.ok(app.loggedWarnings.some(message =>
    message.includes('cloud save delayed')
  ));
}

async function testNormalizedStaleRevisionFailsFastAndOpensCircuit() {
  const key = 'atsrs_user-1_personal_profile';
  const rows = [
    ...markers('personal'),
    {
      user_id: 'user-1',
      account_type: 'personal',
      data_key: key,
      payload: {
        value: JSON.stringify({
          atsrsId: '11111111-1111-4111-8111-111111111111',
          name: 'Before'
        })
      },
      updated_at: 'stale-v1'
    }
  ];
  const controls = {
    normalizedWrite: true,
    commandRevision: 7,
    advanceRevisionAfterReadOnce: true
  };
  const app = boot(rows, controls);
  await app.api.ensureLoaded();
  for (let attempt = 0; attempt < 50; attempt++) {
    const changed = JSON.parse(app.api.read(key));
    changed.position = `Attempt ${attempt}`;
    app.api.write(key, JSON.stringify(changed));
    assert.equal(await app.api.flush(), false);
  }
  assert.equal(controls.rpcCalls.length, 1);
  assert.equal(controls.revisionReads, 1);
  assert.equal(controls.commandRevision, 8);
  assert.equal(JSON.parse(rows[2].payload.value).position, undefined);
  assert.ok(app.api.pendingState().circuits.some(entry =>
    entry.code === '40001' && entry.openUntil > Date.now()
  ));
}

async function testNormalizedTransientRetryIsBoundedAndIdempotent() {
  const key = 'atsrs_user-1_personal_profile';
  const rows = [
    ...markers('personal'),
    {
      user_id: 'user-1',
      account_type: 'personal',
      data_key: key,
      payload: {
        value: JSON.stringify({
          atsrsId: '11111111-1111-4111-8111-111111111111',
          name: 'Before'
        })
      },
      updated_at: 'transient-v1'
    }
  ];
  const controls = {
    normalizedWrite: true,
    commandRevision: 3,
    transientFailuresRemaining: 2,
    transientRetries: 2
  };
  const app = boot(rows, controls);
  await app.api.ensureLoaded();
  const changed = JSON.parse(app.api.read(key));
  changed.position = 'After bounded retry';
  app.api.write(key, JSON.stringify(changed));
  const firstFlush = app.api.flush();
  const secondFlush = app.api.flush();
  assert.equal(firstFlush, secondFlush);
  assert.equal(await firstFlush, true);
  assert.equal(controls.rpcCalls.length, 3);
  assert.equal(new Set(controls.rpcCalls.map(call =>
    call.p_operation_id
  )).size, 1);
  assert.equal(controls.commandRevision, 4);
  assert.equal(JSON.parse(rows[2].payload.value).position, 'After bounded retry');
}

async function testNormalizedRateLimitFailsWithoutRetryAndOpensCircuit() {
  const key = 'atsrs_user-1_personal_profile';
  const rows = [
    ...markers('personal'),
    {
      user_id: 'user-1',
      account_type: 'personal',
      data_key: key,
      payload: {
        value: JSON.stringify({
          atsrsId: '11111111-1111-4111-8111-111111111111',
          name: 'Before'
        })
      },
      updated_at: 'rate-limit-v1'
    }
  ];
  const controls = {
    normalizedWrite: true,
    commandRevision: 2,
    rateLimitFailuresRemaining: 1
  };
  const app = boot(rows, controls);
  await app.api.ensureLoaded();
  const changed = JSON.parse(app.api.read(key));
  changed.position = 'Rate limited';
  app.api.write(key, JSON.stringify(changed));
  assert.equal(await app.api.flush(), false);
  assert.equal(controls.rpcCalls.length, 1);
  assert.equal(controls.commandRevision, 2);
  assert.equal(JSON.parse(rows[2].payload.value).position, undefined);
  assert.ok(app.api.pendingState().circuits.some(entry =>
    entry.code === 'ATSRS_RATE_LIMITED' && entry.openUntil > Date.now()
  ));
}

async function testCompatibilityOldClientRejectsBeforeAnyWrite() {
  const key = 'atsrs_user-1_personal_profile';
  const original = JSON.stringify({
    atsrsId: '11111111-1111-4111-8111-111111111111',
    name: 'Protected'
  });
  const rows = [
    ...markers('personal'),
    {
      user_id: 'user-1',
      account_type: 'personal',
      data_key: key,
      payload: { value: original },
      updated_at: 'compat-old-v1'
    }
  ];
  const controls = {
    compatibilityEnabled: true,
    clientBuild: 'V404',
    compatibilityState: {
      strict_required: true,
      client_compatible: false,
      refresh_required: true,
      minimum_client_build: 'V405',
      kill_switch: false
    }
  };
  const app = boot(rows, controls);
  await app.api.ensureLoaded();
  const changed = JSON.parse(app.api.read(key));
  changed.position = 'must not persist';
  app.api.write(key, JSON.stringify(changed));
  assert.equal(await app.api.flush(), false);
  assert.equal(controls.compatibilityCalls, 1);
  assert.equal(controls.updateCount || 0, 0);
  assert.equal(controls.rpcCalls?.length || 0, 0);
  assert.equal(rows[2].payload.value, original);
  assert.equal(app.api.pendingState().failedOperations[0].retryable, false);
  const refresh = app.dispatchedEvents.find(event =>
    event.type === 'atsrs:stable-id-refresh-required'
  );
  assert.equal(refresh.detail.minimumClientBuild, 'V405');
}

async function testCompatibilityCanaryIsDefaultOffAndAllowlisted() {
  const key = 'atsrs_user-1_personal_profile';
  const makeRows = () => [
    ...markers('personal'),
    {
      user_id: 'user-1',
      account_type: 'personal',
      data_key: key,
      payload: {
        value: JSON.stringify({
          atsrsId: '11111111-1111-4111-8111-111111111111',
          name: 'Canary'
        })
      },
      updated_at: 'compat-canary-v1'
    }
  ];
  const state = {
    strict_required: true,
    client_compatible: true,
    refresh_required: false,
    minimum_client_build: 'V405',
    kill_switch: false
  };

  const normal = boot(makeRows(), { compatibilityState: state });
  await normal.api.ensureLoaded();
  normal.api.write(key, JSON.stringify({
    ...JSON.parse(normal.api.read(key)),
    position: 'normal path'
  }));
  assert.equal(await normal.api.flush(), true);
  assert.equal(normal.controls.compatibilityCalls || 0, 0);

  const allowlisted = boot(makeRows(), {
    compatibilityCanary: true,
    compatibilityState: state
  });
  await allowlisted.api.ensureLoaded();
  allowlisted.api.write(key, JSON.stringify({
    ...JSON.parse(allowlisted.api.read(key)),
    position: 'allowlisted path'
  }));
  assert.equal(await allowlisted.api.flush(), true);
  assert.equal(allowlisted.controls.compatibilityCalls, 1);

  const denied = boot(makeRows(), {
    compatibilityCanary: true,
    compatibilityState: state,
    compatibilityScopeHashes: [
      'ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff'
    ]
  });
  await denied.api.ensureLoaded();
  denied.api.write(key, JSON.stringify({
    ...JSON.parse(denied.api.read(key)),
    position: 'denied path'
  }));
  assert.equal(await denied.api.flush(), true);
  assert.equal(denied.controls.compatibilityCalls || 0, 0);
}

async function testCompatibilityOfflineReconnectIsBoundedAndSafe() {
  const key = 'atsrs_user-1_personal_profile';
  const rows = [
    ...markers('personal'),
    {
      user_id: 'user-1',
      account_type: 'personal',
      data_key: key,
      payload: {
        value: JSON.stringify({
          atsrsId: '11111111-1111-4111-8111-111111111111',
          name: 'Before'
        })
      },
      updated_at: 'compat-offline-v1'
    }
  ];
  const controls = {
    compatibilityEnabled: true,
    normalizedWrite: true,
    circuitFailureThreshold: 5,
    compatibilityOfflineFailures: 20,
    compatibilityState: {
      strict_required: true,
      client_compatible: true,
      refresh_required: false,
      minimum_client_build: 'V405',
      kill_switch: false
    }
  };
  const app = boot(rows, controls);
  await app.api.ensureLoaded();
  const changed = JSON.parse(app.api.read(key));
  changed.position = 'after reconnect';
  app.api.write(key, JSON.stringify(changed));
  assert.equal(await app.api.flush(), false);
  const offlineCalls = controls.compatibilityCalls;
  assert.ok(offlineCalls >= 3 && offlineCalls <= 6);
  assert.equal(controls.updateCount || 0, 0);
  assert.equal(JSON.parse(rows[2].payload.value).position, undefined);

  controls.compatibilityOfflineFailures = 0;
  await new Promise(resolve => setTimeout(resolve, 2300));
  app.emit('online');
  await new Promise(resolve => setTimeout(resolve, 100));
  assert.equal(await app.api.flush(), true);
  assert.equal(controls.compatibilityCalls, offlineCalls + 1);
  assert.equal(JSON.parse(rows[2].payload.value).position, 'after reconnect');
}

async function testCompatibilityConcurrentWritesUseOneGateRead() {
  const profileKey = 'atsrs_user-1_personal_profile';
  const certsKey = 'atsrs_user-1_personal_certs';
  const rows = [
    ...markers('personal'),
    {
      user_id: 'user-1',
      account_type: 'personal',
      data_key: profileKey,
      payload: {
        value: JSON.stringify({
          atsrsId: '11111111-1111-4111-8111-111111111111',
          name: 'Before'
        })
      },
      updated_at: 'compat-concurrent-profile-v1'
    },
    {
      user_id: 'user-1',
      account_type: 'personal',
      data_key: certsKey,
      payload: { value: '[]' },
      updated_at: 'compat-concurrent-certs-v1'
    }
  ];
  const controls = {
    compatibilityEnabled: true,
    compatibilityDelay: 20,
    compatibilityState: {
      strict_required: true,
      client_compatible: true,
      refresh_required: false,
      minimum_client_build: 'V405',
      kill_switch: false
    }
  };
  const app = boot(rows, controls);
  await app.api.ensureLoaded();
  const profile = JSON.parse(app.api.read(profileKey));
  profile.position = 'Queued profile';
  app.api.write(profileKey, JSON.stringify(profile));
  app.api.write(certsKey, JSON.stringify([{
    atsrsId: '22222222-2222-4222-8222-222222222222',
    atsrsPersonnelId: '11111111-1111-4111-8111-111111111111',
    type: 'Synthetic'
  }]));
  assert.equal(await app.api.flush(), true);
  assert.equal(controls.compatibilityCalls, 1);
  assert.equal(JSON.parse(rows[2].payload.value).position, 'Queued profile');
  assert.equal(JSON.parse(rows[3].payload.value).length, 1);
}

async function testCompatibilityAcrossTabsPreservesDifferentFields() {
  const key = 'atsrs_user-1_personal_profile';
  const rows = [
    ...markers('personal'),
    {
      user_id: 'user-1',
      account_type: 'personal',
      data_key: key,
      payload: {
        value: JSON.stringify({
          atsrsId: '11111111-1111-4111-8111-111111111111',
          name: 'Original',
          position: '',
          country: ''
        })
      },
      updated_at: 'compat-tabs-v1'
    }
  ];
  const common = {
    compatibilityEnabled: true,
    compatibilityState: {
      strict_required: true,
      client_compatible: true,
      refresh_required: false,
      minimum_client_build: 'V405',
      kill_switch: false
    }
  };
  const tabA = boot(rows, { ...common });
  const tabB = boot(rows, { ...common });
  await Promise.all([tabA.api.ensureLoaded(), tabB.api.ensureLoaded()]);
  const a = JSON.parse(tabA.api.read(key));
  const b = JSON.parse(tabB.api.read(key));
  a.position = 'Tab A';
  b.country = 'Tab B';
  tabA.api.write(key, JSON.stringify(a));
  assert.equal(await tabA.api.flush(), true);
  tabB.api.write(key, JSON.stringify(b));
  assert.equal(await tabB.api.flush(), true);
  const saved = JSON.parse(rows[2].payload.value);
  assert.equal(saved.position, 'Tab A');
  assert.equal(saved.country, 'Tab B');
  assert.equal(saved.name, 'Original');
  assert.equal(tabA.controls.compatibilityCalls, 1);
  assert.equal(tabB.controls.compatibilityCalls, 1);
}

(async () => {
  await testHydrationAndStaleWrite();
  await testOfflineRetry();
  await testAccountSwitchOrdering();
  await testDeterministicRenameReorderAndRelations();
  await testCrossWorkspaceIsolation();
  await testLatestQueuedWriteWins();
  await testFlushWaitsForWritesQueuedWhileFlushing();
  await testNoOpWriteIsDeduplicated();
  await testTwoTabsMergeDifferentFieldsOnSameKey();
  await testTwoTabsDifferentKeysDoNotConflict();
  await testMissingRowInsertRaceRebasesInsteadOfLooping();
  await testThreeTabsPreserveDifferentFields();
  await testOverlappingStaleFieldPreservesServerAndAllowsRetry();
  await testBoundedStaleRetryStopsWithoutOverwrite();
  await testTriggerFailureRollsBackClientAndSource();
  await testNormalizedCommandFreshBootstrapAndIdempotentResponseLoss();
  await testNormalizedCommandPreservesOverlappingServerField();
  await testNormalizedNoOpCreatesNoCommand();
  await testNormalizedSemanticNoOpCreatesNoCommand();
  await testNormalizedSemanticComparatorKeepsRealChanges();
  await testNormalizedTransportTimeoutCleansUpFlush();
  await testNormalizedStaleRevisionFailsFastAndOpensCircuit();
  await testNormalizedTransientRetryIsBoundedAndIdempotent();
  await testNormalizedRateLimitFailsWithoutRetryAndOpensCircuit();
  await testCompatibilityCanaryIsDefaultOffAndAllowlisted();
  await testCompatibilityOldClientRejectsBeforeAnyWrite();
  await testCompatibilityOfflineReconnectIsBoundedAndSafe();
  await testCompatibilityConcurrentWritesUseOneGateRead();
  await testCompatibilityAcrossTabsPreservesDifferentFields();
  console.log('stable-id activation client tests passed');
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
