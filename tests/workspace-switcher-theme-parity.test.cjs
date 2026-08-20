const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const theme = fs.readFileSync(path.join(root, 'css', 'theme.css'), 'utf8');
const switcher = fs.readFileSync(path.join(root, 'css', 'workspace-switcher.css'), 'utf8');
const harness = fs.readFileSync(path.join(root, 'tests', 'fixtures', 'shell-polish-harness.html'), 'utf8');

test('loads the account switcher theme parity fix through a fresh cache marker', () => {
  assert.match(index, /href="css\/theme\.css\?v=58161"/);
  assert.match(harness, /href="\.\.\/\.\.\/css\/theme\.css\?v=58161"/);
});

test('light account control uses the same 44px minimum as the dark control contract', () => {
  assert.match(
    theme,
    /html\[data-theme="light"\] \.workspace-switcher-button\s*\{\s*min-height:44px!important;\s*\}/
  );
  assert.match(switcher, /\.workspace-switcher-avatar\{[\s\S]*?width:38px;[\s\S]*?height:38px;/);
});

test('responsive account geometry remains unchanged', () => {
  assert.match(
    switcher,
    /@media\(max-width:800px\)[\s\S]*?\.workspace-switcher-button\{[^}]*min-height:44px!important\}/
  );
  assert.match(switcher, /@media\(max-width:800px\)[\s\S]*?\.workspace-switcher-avatar\{width:34px;height:34px\}/);
});
