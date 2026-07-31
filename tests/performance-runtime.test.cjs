const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(
  path.join(__dirname, '..', 'js', 'stability-runtime.js'),
  'utf8',
);

assert.match(source, /largest-contentful-paint/);
assert.match(source, /layout-shift/);
assert.match(source, /durationThreshold:40/);
assert.match(source, /longtask/);
assert.match(source, /atsrsPerformanceSnapshot/);
assert.match(source, /dataset\.atsrsLcp/);
assert.match(source, /dataset\.atsrsCls/);
assert.match(source, /dataset\.atsrsInp/);
assert.match(source, /dataset\.atsrsLongTaskCount/);
assert.match(source, /dataset\.atsrsNavigationMs/);
assert.doesNotMatch(source, /\bfetch\s*\(/);
assert.doesNotMatch(source, /supabaseClient\.(?:from|rpc)\s*\(/);

console.log('privacy-safe performance runtime contracts passed');
