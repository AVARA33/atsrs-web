const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '..', 'js', 'stability-runtime.js'), 'utf8');
const timers = [];
let now = 1000;
class FakeDate extends Date {
  static now() { return now; }
}
const document = {
  visibilityState: 'visible',
  documentElement: { dataset: {} },
  getElementById() { return null; },
  addEventListener() {},
};
const window = {
  performance: { getEntriesByType() { return []; } },
  addEventListener() {},
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
  Date: FakeDate,
  console,
  setTimeout(callback, delay) { timers.push({ callback, delay, cleared: false }); return timers.length; },
  clearTimeout(id) { if (timers[id - 1]) timers[id - 1].cleared = true; },
};

vm.runInNewContext(source, context);
let calls = 0;
window.atsrsStableInterval(() => { calls += 1; }, 5000);
window.atsrsStableInterval(() => { calls += 1; }, 5000);

const firstWake = timers.filter((timer) => !timer.cleared && timer.delay === 5000).at(-1);
assert.ok(firstWake, 'scheduler arms a five-second wake');
now += 5000;
firstWake.callback();
assert.equal(calls, 1, 'only one due reconciler runs in a renderer turn');

const followUp = timers.filter((timer) => !timer.cleared && timer.delay === 80).at(-1);
assert.ok(followUp, 'the remaining due reconciler is deferred to a later turn');
followUp.callback();
assert.equal(calls, 2, 'the deferred reconciler still runs');

console.log('stability scheduler burst budget passed');
