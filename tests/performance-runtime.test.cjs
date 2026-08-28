const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(
  path.join(__dirname, '..', 'js', 'stability-runtime.js'),
  'utf8',
);

assert.match(source, /largest-contentful-paint/);
assert.match(source, /layout-shift/);
assert.doesNotMatch(source, /observePerformance\('event'/);
assert.doesNotMatch(source, /observePerformance\('longtask'/);
assert.match(source, /atsrsPerformanceSnapshot/);
assert.match(source, /performanceObserverTimer=setTimeout\(stopPerformanceMetrics,10000\)/);
assert.match(source, /observer\.disconnect\(\)/);
assert.match(source, /pagehide[^\n]+stopPerformanceMetrics/);
assert.match(source, /dataset\.atsrsLcp/);
assert.match(source, /dataset\.atsrsCls/);
assert.match(source, /dataset\.atsrsInp/);
assert.match(source, /dataset\.atsrsLongTaskCount/);
assert.match(source, /dataset\.atsrsNavigationMs/);
assert.doesNotMatch(source, /\bfetch\s*\(/);
assert.doesNotMatch(source, /supabaseClient\.(?:from|rpc)\s*\(/);

console.log('privacy-safe performance runtime contracts passed');
