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
        setTimeout(() => resolve({ data: found.map(row => ({ ...row })), error: null }), delay)
      );
    }
    if (builder.operation === 'update') {
      if (controls.rejectUpdates) {
        return Promise.resolve({ data: null, error: new Error('trigger rejected write') });
      }
      if (controls.failNextUpdate) {
        controls.failNextUpdate = false;
        return Promise.resolve({ data: null, error: new Error('offline') });
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
          return this;
        },
        single() {
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
      warn() {},
      error(...args) {
        loggedErrors.push(args.map(String).join(' '));
      }
    },
    setTimeout,
    clearTimeout
  };
  vm.runInNewContext(source, context, { filename: 'server-data.js' });
  return { api: window.atsrsCloudData, localStorage, rows, controls, loggedErrors };
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
  assert.ok(app.loggedErrors.some(message => message.includes('ATSRS_STALE_WRITE')));
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
  assert.ok(app.loggedErrors.some(message => message.includes('offline')));
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
  const app = boot(rows, { updateDelay: 25 });
  await app.api.ensureLoaded();

  const first = JSON.parse(app.api.read(key));
  first.name = 'First';
  app.api.write(key, JSON.stringify(first));
  const flushing = app.api.flush();

  await new Promise(resolve => setTimeout(resolve, 5));
  const second = { ...first, name: 'Queued during flush' };
  app.api.write(key, JSON.stringify(second));

  assert.equal(await flushing, true);
  assert.equal(app.api.isSynced(), true);
  assert.equal(JSON.parse(rows[2].payload.value).name, 'Queued during flush');
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
  await testTriggerFailureRollsBackClientAndSource();
  console.log('stable-id activation client tests passed');
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
