const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.join(__dirname, '..');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');
const migration = read('supabase/migrations/20260827222000_registration_overview_windows.sql');
const browserSource = read('js/admin-overview.js');
const index = read('index.html');

assert.match(index, /<script src="js\/admin-overview\.js\?v=5901"><\/script>/);
assert.match(index, /css\/executive-dashboard-v5858\.css\?v=5875/);
const developerStart = index.indexOf('<section id="developerPage"');
const developerEnd = index.indexOf('</section>', developerStart);
const adminPanel = index.indexOf('id="adminOverviewPanel"');
assert.ok(developerStart >= 0 && adminPanel > developerStart && adminPanel < developerEnd,
  'The owner-only registration overview must live on Developer.');
assert.match(index, /id="navDeveloper"[^>]+hidden/);
assert.equal(index.indexOf('id="adminOverviewPanel"', adminPanel + 1), -1,
  'There must be exactly one owner-only registration overview.');

assert.match(migration, /^--[\s\S]*\nbegin;/);
assert.match(migration, /from auth\.users as auth_user/);
assert.match(migration, /auth_user\.deleted_at is null/);
assert.match(migration, /not coalesce\(auth_user\.is_anonymous, false\)/);
assert.match(migration, /email_confirmed_at is not null[\s\S]*phone_confirmed_at is not null/);
assert.match(migration, /from auth\.identities as identity[\s\S]*identity\.user_id = auth_user\.id/);
assert.match(migration, /atsrs_metrics_excluded/);
assert.match(migration, /created_at >= now\(\) - interval '7 days'/);
assert.match(migration, /created_at >= now\(\) - interval '14 days'/);
assert.match(migration, /created_at >= now\(\) - interval '30 days'/);
assert.doesNotMatch(migration, /atsrs_workspaces/);
assert.doesNotMatch(migration, /credit|billing|spend|atsrs_ai_usage/i);
assert.match(migration, /set search_path = ''/);
assert.match(migration, /revoke all on function public\.atsrs_get_registration_overview\(\) from public, anon/);
assert.match(migration, /grant execute on function public\.atsrs_get_registration_overview\(\) to authenticated/);
assert.match(migration, /to_regprocedure\('atsrs_private\.atsrs_request_has_aal2\(\)'\)/);
assert.match(migration, /commit;\s*$/);

function element(hidden = false) {
  const classes = new Set(hidden ? ['hidden'] : []);
  return {
    textContent: '',
    disabled: false,
    attributes: {},
    listeners: {},
    classList: {
      add: (name) => classes.add(name),
      remove: (name) => classes.delete(name),
      contains: (name) => classes.has(name),
    },
    setAttribute(name, value) { this.attributes[name] = value; },
    addEventListener(name, handler) { this.listeners[name] = handler; },
  };
}

const elements = {
  adminOverviewPanel: element(true),
  adminOverviewRefresh: element(),
  adminRegisteredUsers: element(),
  adminNewUsers7d: element(),
  adminNewUsers14d: element(),
  adminNewUsers30d: element(),
  adminAiUsageNote: element(),
  navDeveloper: element(true),
  developerRegistrationsPanel: element(true),
  developerRegistrationRows: Object.assign(element(), { innerHTML: '', appendChild() {} }),
  developerRegistrationCount: element(),
  developerPage: element(),
  navDashboard: element(),
};
let domReady;
let authStateHandler;
let routedPage = '';
let rpc = async () => ({ data: [{
  is_admin: true,
  registered_users: 6,
  new_users_7d: 1,
  new_users_14d: 2,
  new_users_30d: 3,
}], error: null });
let detailRpc = async () => ({ data: [], error: null });

const context = {
  console: { warn() {} },
  setTimeout() {},
  URLSearchParams,
  document: {
    getElementById: (id) => elements[id] || null,
    createElement: () => Object.assign(element(), { append() {}, appendChild() {} }),
    addEventListener(name, handler) { if (name === 'DOMContentLoaded') domReady = handler; },
  },
  window: {
    location: { search: '' },
    showPage(page) { routedPage = page; },
    addEventListener() {},
    supabaseClient: {
      auth: {
        getSession: async () => ({ data: { session: { user: { id: 'admin-user' } } } }),
        onAuthStateChange(handler) { authStateHandler = handler; },
      },
      rpc: (name, ...args) => name === 'atsrs_get_developer_registrations' ? detailRpc(...args) : rpc(name, ...args),
    },
  },
};
vm.runInNewContext(browserSource, context);

(async () => {
  domReady();
  await new Promise((resolve) => setImmediate(resolve));

  assert.equal(elements.adminOverviewPanel.classList.contains('hidden'), false);
  assert.equal(elements.navDeveloper.classList.contains('hidden'), false);
  assert.equal(elements.adminRegisteredUsers.textContent, '6');
  assert.equal(elements.adminNewUsers7d.textContent, '1');
  assert.equal(elements.adminNewUsers14d.textContent, '2');
  assert.equal(elements.adminNewUsers30d.textContent, '3');
  assert.equal(elements.adminAiUsageNote.textContent, 'Confirmed registrations only');
  assert.equal(elements.adminAiUsageNote.attributes.role, 'status');
  assert.equal(elements.adminAiUsageNote.attributes['aria-live'], 'polite');

  let releaseRpc;
  rpc = () => new Promise((resolve) => { releaseRpc = resolve; });
  const refreshPromise = context.window.atsrsAdminOverview.refresh();
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(elements.adminOverviewRefresh.disabled, true);
  assert.equal(elements.adminOverviewPanel.attributes['aria-busy'], 'true');
  assert.equal(elements.adminRegisteredUsers.textContent, '—');
  assert.equal(elements.adminAiUsageNote.textContent, 'Secure registration metrics are loading…');

  releaseRpc({ data: [{
    is_admin: true,
    registered_users: 7,
    new_users_7d: 2,
    new_users_14d: 3,
    new_users_30d: 4,
  }], error: null });
  await refreshPromise;
  assert.equal(elements.adminRegisteredUsers.textContent, '7');
  assert.equal(elements.adminNewUsers7d.textContent, '2');
  assert.equal(elements.adminNewUsers14d.textContent, '3');
  assert.equal(elements.adminNewUsers30d.textContent, '4');
  assert.equal(elements.adminOverviewRefresh.disabled, false);
  assert.equal(elements.adminOverviewPanel.attributes['aria-busy'], 'false');

  rpc = async () => ({ data: null, error: new Error('safe test failure') });
  await context.window.atsrsAdminOverview.refresh();
  assert.equal(elements.adminOverviewPanel.classList.contains('hidden'), false);
  assert.equal(elements.adminRegisteredUsers.textContent, '—');
  assert.equal(elements.adminAiUsageNote.textContent, 'Registration metrics could not be refreshed. Try again.');
  assert.equal(elements.adminOverviewRefresh.disabled, false);

  authStateHandler('SIGNED_IN', { user: { id: 'non-admin-user' } });
  assert.equal(context.window.__atsrsDeveloperAccess, false);
  assert.equal(elements.navDeveloper.classList.contains('hidden'), true);
  assert.equal(elements.developerRegistrationsPanel.classList.contains('hidden'), true);
  assert.equal(routedPage, 'dashboard');

  console.log('Admin overview data-correctness tests passed');
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
