const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(
  path.join(__dirname, '..', 'js', 'stability-runtime.js'),
  'utf8',
);

const timers = [];
const listeners = new Map();
const observers = [];
class PerformanceObserver {
  observe(options) { this.options = options; }
  disconnect() { this.disconnected = true; }
}

const document = {
  visibilityState: 'visible',
  documentElement: { dataset: { atsrsBuild: 'VTEST', atsrsUpdate: 'test' } },
  getElementById() { return null; },
  addEventListener(type, callback) { listeners.set(`document:${type}`, callback); },
};
const window = {
  PerformanceObserver: class extends PerformanceObserver {
    constructor(callback) { super(); this.callback = callback; observers.push(this); }
  },
  performance: { getEntriesByType() { return []; } },
  addEventListener(type, callback) { listeners.set(`window:${type}`, callback); },
  dispatchEvent() {},
};

const context = {
  window,
  document,
  navigator: { onLine: true },
  MutationObserver: class { observe() {} },
  CustomEvent: class {},
  Map,
  Promise,
  Date,
  console,
  setTimeout(callback, delay) { timers.push({ callback, delay, cleared: false }); return timers.length; },
  clearTimeout(id) { if (timers[id - 1]) timers[id - 1].cleared = true; },
};

vm.runInNewContext(source, context);

assert.equal(observers.length, 0, 'authenticated shell installs no native performance observers');

listeners.get('window:pagehide')();
assert.equal(observers.length, 0, 'pagehide leaves no observer attached');

assert.match(
  fs.readFileSync(path.join(__dirname, '..', 'js', 'talent-directory.js'), 'utf8'),
  /atsrsStableInterval\(function\(\)\{if\(mode\(\)===\'personal\'\)return touchOwnProfile\(false\)\},300000\)/,
);

console.log('long-session observer and heartbeat lifecycle contracts passed');
