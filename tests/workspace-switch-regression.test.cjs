const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(
  path.join(__dirname, '..', 'js', 'workspace-switcher.js'),
  'utf8'
);

class FakeClassList {
  constructor() {
    this.values = new Set();
  }
  add(value) {
    this.values.add(value);
  }
  remove(value) {
    this.values.delete(value);
  }
  contains(value) {
    return this.values.has(value);
  }
  toggle(value, force) {
    const enabled = force === undefined ? !this.values.has(value) : Boolean(force);
    if (enabled) this.values.add(value);
    else this.values.delete(value);
    return enabled;
  }
}

class FakeElement {
  constructor() {
    this.attributes = new Map();
    this.classList = new FakeClassList();
    this.dataset = {};
    this.disabled = false;
    this.hidden = false;
    this.textContent = '';
    this.innerHTML = '';
  }
  setAttribute(name, value) {
    this.attributes.set(name, String(value));
  }
  getAttribute(name) {
    return this.attributes.get(name) ?? null;
  }
  addEventListener() {}
  contains() {
    return false;
  }
  querySelector() {
    return null;
  }
}

class FakeStorage {
  constructor() {
    this.values = new Map([['atsrs_use_mode', 'personal']]);
  }
  getItem(key) {
    return this.values.has(String(key)) ? this.values.get(String(key)) : null;
  }
  setItem(key, value) {
    this.values.set(String(key), String(value));
  }
}

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

function boot(switchWorkspace) {
  const ids = [
    'workspaceSwitcher',
    'workspaceSwitcherMenu',
    'workspaceSwitcherButton',
    'workspaceSwitcherStatus',
    'workspaceSwitcherName',
    'workspaceSwitcherAvatar',
    'workspaceSwitcherLabel',
    'workspacePersonalOption',
    'workspaceCompanyOption',
    'workspaceLogoutBtn'
  ];
  const elements = Object.fromEntries(ids.map(id => [id, new FakeElement()]));
  const localStorage = new FakeStorage();
  const document = {
    readyState: 'loading',
    getElementById(id) {
      return elements[id] || null;
    },
    addEventListener() {}
  };
  const window = {
    currentUser: { email: 'test@example.invalid' },
    atsrsSwitchWorkspace: switchWorkspace,
    addEventListener() {}
  };
  vm.runInNewContext(source, {
    window,
    document,
    localStorage,
    Promise,
    console
  }, { filename: 'workspace-switcher.js' });
  return { window, localStorage, elements };
}

async function testSequentialSwitchesAndLoaderCompletion() {
  let calls = 0;
  const app = boot(async mode => {
    calls++;
    app.localStorage.setItem('atsrs_use_mode', mode);
    return true;
  });

  for (let index = 0; index < 10; index++) {
    const target = index % 2 === 0 ? 'company' : 'personal';
    assert.equal(await app.window.atsrsWorkspaceSwitcherChoose(target), true);
    assert.equal(app.localStorage.getItem('atsrs_use_mode'), target);
    assert.equal(app.elements.workspaceSwitcher.getAttribute('aria-busy'), 'false');
    assert.equal(app.elements.workspaceCompanyOption.disabled, false);
    assert.equal(app.elements.workspacePersonalOption.disabled, false);
  }
  assert.equal(calls, 10);
}

async function testParallelAttemptIsSingleFlightAndRenderCannotUnlockControls() {
  const pending = deferred();
  let calls = 0;
  const app = boot(() => {
    calls++;
    return pending.promise;
  });

  const first = app.window.atsrsWorkspaceSwitcherChoose('company');
  const duplicate = app.window.atsrsWorkspaceSwitcherChoose('company');
  const conflicting = app.window.atsrsWorkspaceSwitcherChoose('personal');
  await Promise.resolve();

  assert.equal(calls, 1);
  assert.equal(app.elements.workspaceSwitcher.getAttribute('aria-busy'), 'true');
  assert.equal(app.elements.workspaceCompanyOption.disabled, true);
  app.window.atsrsWorkspaceSwitcherUpdate({ personal: true, company: true });
  assert.equal(app.elements.workspaceCompanyOption.disabled, true);
  assert.equal(await conflicting, false);

  pending.resolve(true);
  assert.equal(await first, true);
  assert.equal(await duplicate, true);
  assert.equal(app.elements.workspaceSwitcher.getAttribute('aria-busy'), 'false');
}

async function testFailurePreservesStateAndRetryWorks() {
  let attempts = 0;
  const app = boot(async mode => {
    attempts++;
    if (attempts === 1) throw new Error('network');
    app.localStorage.setItem('atsrs_use_mode', mode);
    return true;
  });

  assert.equal(await app.window.atsrsWorkspaceSwitcherChoose('company'), false);
  assert.equal(app.localStorage.getItem('atsrs_use_mode'), 'personal');
  assert.equal(
    app.elements.workspaceSwitcherStatus.textContent,
    'Workspace could not be switched. Please try again.'
  );
  assert.equal(app.elements.workspaceSwitcher.getAttribute('aria-busy'), 'false');

  assert.equal(await app.window.atsrsWorkspaceSwitcherChoose('company'), true);
  assert.equal(app.localStorage.getItem('atsrs_use_mode'), 'company');
  assert.equal(attempts, 2);
}

function testStorageGuardsReloadAndRollbackContracts() {
  const storage = fs.readFileSync(path.join(__dirname, '..', 'js', 'storage.js'), 'utf8');
  assert.match(storage, /workspaceSwitchPromise/);
  assert.match(storage, /workspaceSwitchSequence/);
  assert.match(storage, /workspaceSwitchTarget===mode\?workspaceSwitchPromise/);
  assert.match(storage, /applyAccountType\(current\)/);
  assert.match(storage, /window\.location\.reload\(\)/);
}

(async () => {
  await testSequentialSwitchesAndLoaderCompletion();
  await testParallelAttemptIsSingleFlightAndRenderCannotUnlockControls();
  await testFailurePreservesStateAndRetryWorks();
  testStorageGuardsReloadAndRollbackContracts();
  console.log('workspace switch regression tests passed');
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
