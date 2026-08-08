const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const script = fs.readFileSync(path.join(root, 'js', 'sage-ledger.js'), 'utf8');
const styles = fs.readFileSync(path.join(root, 'css', 'sage-ledger.css'), 'utf8');

assert.match(script, /bell\.classList\.remove\('hidden'\)/, 'notification bell must be visible in Personal and Corporate accounts');
assert.doesNotMatch(script, /bell\.classList\.toggle\('hidden',!companyMode\(\)\)/, 'notification bell must not be restricted to Corporate accounts');
assert.match(styles, /@media\(max-width:800px\)[\s\S]*?\.sage-header-icon-button\{display:grid!important\}/, 'mobile header must retain the notification control');

console.log('Header controls shared-account contracts passed');
