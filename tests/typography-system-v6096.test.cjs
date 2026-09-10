const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const cssDir = path.join(root, 'css');
const base = fs.readFileSync(path.join(cssDir, 'base.css'), 'utf8');

for (const token of [
  '--atsrs-font-sans', '--atsrs-font-display', '--atsrs-font-mono',
  '--atsrs-type-xs', '--atsrs-type-sm', '--atsrs-type-body', '--atsrs-type-lg',
  '--atsrs-leading-tight', '--atsrs-leading-body'
]) assert.match(base, new RegExp(`${token}:`), `missing ${token}`);

assert.match(base, /-webkit-text-size-adjust:100%/);
assert.match(base, /text-size-adjust:100%/);
assert.match(base, /button,input,select,textarea\{font-family:inherit\}/);

const cssFiles = fs.readdirSync(cssDir).filter((name) => name.endsWith('.css'));
for (const name of cssFiles) {
  const source = fs.readFileSync(path.join(cssDir, name), 'utf8');
  assert.doesNotMatch(source, /font-weight\s*:\s*(?:550|650|750|850)\b/, `${name} uses a synthetic font weight`);
  if (name !== 'base.css') {
    assert.doesNotMatch(source, /font-family\s*:\s*(?:Arial|Inter|Georgia|"Courier New")\b/i, `${name} bypasses typography family tokens`);
    assert.doesNotMatch(source, /font\s*:[^;]*(?:Arial|Inter|Georgia|"Courier New")\b/i, `${name} bypasses typography family tokens`);
  }
}

const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
for (const name of cssFiles.filter((name) => {
  return fs.readFileSync(path.join(cssDir, name), 'utf8').includes('var(--atsrs-font-');
})) {
  if (html.includes(`css/${name}?v=`)) assert.match(html, new RegExp(`css/${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\?v=6096`), `${name} cache key is stale`);
}

console.log('typography-system-v6096: PASS');
