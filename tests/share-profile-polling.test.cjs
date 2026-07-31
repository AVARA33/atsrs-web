const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(
  path.join(__dirname, '..', 'js', 'share-profile.js'),
  'utf8',
);

function classList(initial = []) {
  const values = new Set(initial);
  return {
    contains: (value) => values.has(value),
    add: (...items) => items.forEach((item) => values.add(item)),
    remove: (...items) => items.forEach((item) => values.delete(item)),
    toggle(value, force) {
      if (force === true) values.add(value);
      else if (force === false) values.delete(value);
      else if (values.has(value)) values.delete(value);
      else values.add(value);
    },
  };
}

const elements = {
  shareProfilePanel: { classList: classList() },
  dashboardPage: { classList: classList(['hidden']) },
  accountSharingTab: { classList: classList() },
  shareAccessBox: { classList: classList(['hidden']) },
};
const documentListeners = new Map();
const windowListeners = new Map();
let intervalCallback = null;
let fetchCount = 0;

const document = {
  hidden: false,
  readyState: 'loading',
  getElementById: (id) => elements[id] || null,
  querySelectorAll: () => [],
  addEventListener(type, callback) {
    documentListeners.set(type, callback);
  },
};
const localStorage = {
  getItem(key) {
    return key === 'atsrs_use_mode' ? 'company' : '';
  },
  setItem() {},
  removeItem() {},
};
const sessionStorage = {
  getItem: () => '',
  setItem() {},
  removeItem() {},
};
const window = {
  useMode: 'company',
  supabaseClient: {
    auth: {
      async getSession() {
        return { data: { session: { access_token: 'test-token' } } };
      },
      onAuthStateChange() {},
    },
  },
  showAccountTab() {},
  showPage() {},
  addEventListener(type, callback) {
    windowListeners.set(type, callback);
  },
};

const pendingTimeouts = [];
const context = {
  window,
  document,
  localStorage,
  sessionStorage,
  location: { search: '' },
  SUPABASE_URL: 'https://example.supabase.co',
  SUPABASE_KEY: 'publishable-test-key',
  URLSearchParams,
  URL,
  Intl,
  Date,
  Promise,
  Set,
  Array,
  Object,
  Number,
  String,
  Boolean,
  encodeURIComponent,
  console: { error() {} },
  fetch: async () => {
    fetchCount += 1;
    await new Promise((resolve) => setImmediate(resolve));
    return {
      ok: true,
      async json() {
        return { requests: [] };
      },
    };
  },
  setTimeout(callback) {
    pendingTimeouts.push(callback);
    return pendingTimeouts.length;
  },
  clearTimeout() {},
  atsrsStableInterval(callback) {
    intervalCallback = callback;
    return 1;
  },
};

vm.runInNewContext(source, context, { filename: 'share-profile.js' });
documentListeners.get('DOMContentLoaded')();

async function run() {
  assert.equal(typeof intervalCallback, 'function');

  await intervalCallback();
  assert.equal(fetchCount, 0, 'unrelated hidden page must not poll');

  elements.dashboardPage.classList.remove('hidden');
  document.hidden = true;
  await intervalCallback();
  assert.equal(fetchCount, 0, 'background tab must not poll');

  document.hidden = false;
  await Promise.all([intervalCallback(), intervalCallback(), intervalCallback()]);
  assert.equal(fetchCount, 1, 'concurrent refreshes must share one request');

  elements.dashboardPage.classList.add('hidden');
  await window.refreshShareRequests();
  assert.equal(fetchCount, 2, 'explicit public refresh must remain immediate');

  assert.equal(typeof window.showPage, 'function');
  assert.equal(typeof window.showAccountTab, 'function');
  assert.equal(typeof documentListeners.get('visibilitychange'), 'function');
  assert.equal(typeof windowListeners.get('atsrs:resume'), 'function');
}

run().then(() => {
  console.log('share profile polling tests passed');
}).catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
