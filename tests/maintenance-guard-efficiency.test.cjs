const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'js', 'maintenance-guard.js'), 'utf8');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

assert.match(source, /idleInterval=300000/);
assert.match(source, /activeInterval=30000/);
assert.match(source, /nextCheckInterval=idleInterval/);
assert.match(source, /if\(inFlight\)return inFlight/);
assert.match(source, /elapsed<nextCheckInterval/);
assert.match(source, /document\.hidden/);
assert.match(source, /visibilitychange/);
assert.doesNotMatch(source, /setInterval\(check,30000\)/);
assert.match(html, /js\/maintenance-guard\.js\?v=564/);

console.log('maintenance guard efficiency contracts passed');
