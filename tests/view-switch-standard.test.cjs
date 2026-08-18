const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'css', 'view-switch-standard-v58144.css'), 'utf8');
const fixture = fs.readFileSync(path.join(root, 'tests', 'fixtures', 'view-switch-standard-harness.html'), 'utf8');

test('Cards/List controls share the Jobs visual contract', () => {
  assert.match(html, /view-switch-standard-v58144\.css\?v=58144/);
  assert.equal((html.match(/class="talent-view-switch(?: jobs-view-switch)?"/g) || []).length, 4);
  for (const page of ['#jobsPage', '#candidatesPage', '#personnelPage', '#projectsPage']) {
    assert.ok(css.includes(page), `${page} is included in the shared selector`);
  }
  assert.match(css, /height:44px!important/);
  assert.match(css, /min-height:44px!important/);
  assert.match(css, /background:#050706!important/);
  assert.match(css, /background:#0c120f!important/);
  assert.match(css, /background:var\(--sidebar-accent\)/);
  assert.match(css, /background:var\(--atsrs-shell-accent\)/);
  assert.match(css, /button:is\(\[aria-pressed="true"\],\.active\)::after/);
  assert.equal((fixture.match(/class="talent-view-switch(?: jobs-view-switch)?"/g) || []).length, 4);
});
