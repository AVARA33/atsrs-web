const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.join(__dirname, '..');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');
const migration = read('supabase/migrations/20260817215213_admin_overview_data_correctness.sql');
const browserSource = read('js/admin-overview.js');
const index = read('index.html');

assert.match(index, /<script src="js\/admin-overview\.js\?v=582"><\/script>/);
assert.match(index, /css\/executive-dashboard-v5858\.css\?v=5874/);
const dashboardStart = index.indexOf('<section id="dashboardPage"');
const dashboardEnd = index.indexOf('</section>', dashboardStart);
const adminPanel = index.indexOf('id="adminOverviewPanel"');
assert.ok(dashboardStart >= 0 && adminPanel > dashboardStart && adminPanel < dashboardEnd,
  'The owner-only registration overview must live on Dashboard.');
assert.equal(index.indexOf('id="adminOverviewPanel"', adminPanel + 1), -1,
  'There must be exactly one owner-only registration overview.');

assert.match(migration, /^--[\s\S]*\nbegin;/);
assert.match(migration, /from auth\.users as auth_user/);
assert.match(migration, /auth_user\.deleted_at is null/);
assert.match(migration, /not coalesce\(auth_user\.is_anonymous, false\)/);
assert.match(migration, /email_confirmed_at is not null[\s\S]*phone_confirmed_at is not null/);
assert.match(migration, /from auth\.identities as identity[\s\S]*identity\.user_id = auth_user\.id/);
assert.match(migration, /atsrs_metrics_excluded/);
assert.match(migration, /created_at >= now\(\) - interval '30 days'/);
assert.doesNotMatch(migration, /atsrs_workspaces/);
assert.match(migration, /count\(\*\) filter \(where usage\.event_type = 'scan_document'\)/);
assert.match(migration, /usage\.estimated_cost_usd = 0[\s\S]*usage\.input_tokens \+ usage\.output_tokens > 0/);
assert.match(migration, /v_unpriced_usage = 0/);
assert.match(migration, /metrics_verified_at is not null[\s\S]*metrics_verification_source/);
assert.match(migration, /else null::numeric/);
assert.match(migration, /set search_path = ''/);
assert.match(migration, /revoke all on function public\.atsrs_get_admin_overview\(\) from public, anon/);
assert.match(migration, /grant execute on function public\.atsrs_get_admin_overview\(\) to authenticated/);
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
  adminNewUsers: element(),
  adminAiCredit: element(),
  adminAiUsageNote: element(),
};
let domReady;
let rpc = async () => ({ data: [{
  is_admin: true,
  registered_users: 6,
  new_users_30d: 3,
  estimated_credit_usd: null,
  estimated_spend_usd: null,
  tracked_scans: 0,
}], error: null });

const context = {
  console: { warn() {} },
  setTimeout() {},
  document: {
    getElementById: (id) => elements[id] || null,
    addEventListener(name, handler) { if (name === 'DOMContentLoaded') domReady = handler; },
  },
  window: {
    addEventListener() {},
    supabaseClient: {
      auth: { getSession: async () => ({ data: { session: { user: { id: 'admin-user' } } } }) },
      rpc: (...args) => rpc(...args),
    },
  },
};
vm.runInNewContext(browserSource, context);

(async () => {
  domReady();
  await new Promise((resolve) => setImmediate(resolve));

  assert.equal(elements.adminOverviewPanel.classList.contains('hidden'), false);
  assert.equal(elements.adminRegisteredUsers.textContent, '6');
  assert.equal(elements.adminNewUsers.textContent, '3');
  assert.equal(elements.adminAiCredit.textContent, '—');
  assert.equal(elements.adminAiUsageNote.textContent, '— estimated spend · 0 scans tracked after setup');
  assert.equal(elements.adminAiUsageNote.attributes.role, 'status');
  assert.equal(elements.adminAiUsageNote.attributes['aria-live'], 'polite');

  let releaseRpc;
  rpc = () => new Promise((resolve) => { releaseRpc = resolve; });
  const refreshPromise = context.window.atsrsAdminOverview.refresh();
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(elements.adminOverviewRefresh.disabled, true);
  assert.equal(elements.adminOverviewPanel.attributes['aria-busy'], 'true');
  assert.equal(elements.adminRegisteredUsers.textContent, '—');
  assert.equal(elements.adminAiUsageNote.textContent, 'Secure metrics are loading…');

  releaseRpc({ data: [{
    is_admin: true,
    registered_users: 7,
    new_users_30d: 4,
    estimated_credit_usd: 4.5,
    estimated_spend_usd: 0.5,
    tracked_scans: 2,
  }], error: null });
  await refreshPromise;
  assert.equal(elements.adminRegisteredUsers.textContent, '7');
  assert.equal(elements.adminNewUsers.textContent, '4');
  assert.equal(elements.adminAiCredit.textContent, '$4.50');
  assert.equal(elements.adminOverviewRefresh.disabled, false);
  assert.equal(elements.adminOverviewPanel.attributes['aria-busy'], 'false');

  rpc = async () => ({ data: null, error: new Error('safe test failure') });
  await context.window.atsrsAdminOverview.refresh();
  assert.equal(elements.adminOverviewPanel.classList.contains('hidden'), false);
  assert.equal(elements.adminRegisteredUsers.textContent, '—');
  assert.equal(elements.adminAiUsageNote.textContent, 'Metrics could not be refreshed. Try again.');
  assert.equal(elements.adminOverviewRefresh.disabled, false);

  console.log('Admin overview data-correctness tests passed');
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
