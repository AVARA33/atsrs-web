const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'js', 'rotation-earnings.js'), 'utf8');
const window = {};
const document = { readyState: 'loading', addEventListener() {}, getElementById() { return null; } };
vm.runInNewContext(source, { window, document, URLSearchParams, location: { search: '' }, console, Date, Intl, setTimeout });
const math = window.atsrsRotationMath;

test('28/28 pattern changes from offshore to home on the exact inclusive boundary', () => {
  const settings = { first_offshore_date: '2027-01-10', pattern_work_days: 28, pattern_leave_days: 28 };
  assert.equal(math.cycleForDate(math.utcDate('2027-01-10'), settings), 'offshore');
  assert.equal(math.cycleForDate(math.utcDate('2027-02-06'), settings), 'offshore');
  assert.equal(math.cycleForDate(math.utcDate('2027-02-07'), settings), 'home');
  assert.equal(math.cycleForDate(math.utcDate('2027-03-06'), settings), 'home');
  assert.equal(math.cycleForDate(math.utcDate('2027-03-07'), settings), 'offshore');
});

test('UTC calendar math remains exact across leap day and year boundary', () => {
  assert.equal(math.daysBetween(math.utcDate('2028-02-28'), math.utcDate('2028-03-01')), 2);
  assert.equal(math.inclusiveDays(math.utcDate('2027-12-28'), math.utcDate('2028-01-04')), 8);
  assert.equal(math.addDays(math.utcDate('2027-12-31'), 1).toISOString().slice(0, 10), '2028-01-01');
});

test('exact minor-unit earnings include travel only when paid', () => {
  const counts = { worked: 10, planned: 5, travel: 2 };
  assert.equal(math.earningsMinor(counts, { day_rate_minor: 65000, travel_paid: false }), 975000);
  assert.equal(math.earningsMinor(counts, { day_rate_minor: 65000, travel_paid: true }), 1105000);
  assert.equal(math.parseMoney('650.25'), 65025);
});

test('salary calculator combines day rates, fixed pay, tax and deductions in minor units', () => {
  const result = math.salary(
    { offshore: 10, onshore: 2, travel: 2, home: 17 },
    {
      day_rate_minor: 65000,
      onshore_rate_minor: 30000,
      travel_rate_minor: 32500,
      base_salary_minor: 100000,
      per_diem_minor: 5000,
      bonus_minor: 25000,
      overtime_hours: 4,
      overtime_rate_minor: 5000,
      tax_allowance_minor: 50000,
      tax_rate: 10,
      deductions_minor: 20000
    }
  );
  assert.equal(result.gross, 990000);
  assert.equal(result.tax, 94000);
  assert.equal(result.net, 876000);
});

test('route, owner RLS, and responsive feature assets are wired', () => {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const storage = fs.readFileSync(path.join(root, 'js', 'storage.js'), 'utf8');
  const css = fs.readFileSync(path.join(root, 'css', 'rotation-earnings.css'), 'utf8');
  const migration = fs.readFileSync(path.join(root, 'supabase', 'migrations', '20261005123212_rotation_earnings_foundation.sql'), 'utf8');
  assert.match(html, /id="navRotation"[^>]*>[\s\S]*?ph-arrows-clockwise atsrs-nav-icon[\s\S]*?atsrs-nav-label">Rotation/);
  assert.match(html, /js\/shell-polish\.js\?v=6268/);
  assert.match(html, /css\/rotation-earnings\.css\?v=4/);
  assert.match(html, /js\/rotation-earnings\.js\?v=4/);
  assert.match(html, /id="rotationPage"/);
  assert.match(html, /option value="hotel">Hotel/);
  assert.match(storage, /rotation:navRotation/);
  assert.match(css, /@media\(max-width:540px\)/);
  assert.match(migration, /enable row level security/);
  assert.match(migration, /\(select auth\.uid\(\)\) = user_id/);
  assert.match(migration, /day_rate_minor bigint/);
});
