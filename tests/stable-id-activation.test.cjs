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
        return Promise.resolve({ data: null, error: new Error('trigger rejected write') });
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
      if (duplicate) return Promise.resolve({ data: null, error: new Error('duplicate') });
      rows.push({ ...builder.value });
      return Promise.resolve({
        data: { updated_at: builder.value.updated_at },
        error: null
      });
    }
    return Promise.resolve({ data: null, error: null });
  }

  return {
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
  const localStorage = new FakeStorage();
  localStorage.setItem('atsrs_use_mode', mode);
  const document = {
    readyState: 'loading',
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
    addEventListener() {},
    dispatchEvent() {},
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
  return { api: window.atsrsCloudData, localStorage, rows, controls, loggedErrors, loggedWarnings };
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
  assert.ok(app.loggedWarnings.some(message => message.includes('bounded retry')));
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
  assert.ok(app.loggedErrors.some(message => message.includes('trigger rejected write')));
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
  await testOverlappingStaleFieldPreservesServerAndAllowsRetry();
  await testBoundedStaleRetryStopsWithoutOverwrite();
  await testTriggerFailureRollsBackClientAndSource();
  console.log('stable-id activation client tests passed');
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
