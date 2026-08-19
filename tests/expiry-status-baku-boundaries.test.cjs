const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const storage = fs.readFileSync(path.resolve(__dirname, '..', 'js', 'storage.js'), 'utf8');
const helper = storage.match(/function atsrsBakuCalendarDate\(now\)\{[\s\S]*?\n\}/);
assert.ok(helper, 'Baku calendar-day helper must remain available');

const context = { Date, Intl, Number };
vm.createContext(context);
vm.runInContext(helper[0], context);

const afterBakuMidnight = vm.runInContext(
  "atsrsBakuCalendarDate(new Date('2026-08-19T20:00:01Z')).toISOString()",
  context
);
assert.equal(afterBakuMidnight, '2026-08-20T00:00:00.000Z');

const beforeBakuMidnight = vm.runInContext(
  "atsrsBakuCalendarDate(new Date('2026-08-19T19:59:59Z')).toISOString()",
  context
);
assert.equal(beforeBakuMidnight, '2026-08-19T00:00:00.000Z');

const asOf = Date.parse(afterBakuMidnight);
for (const [expiry, expected] of [
  ['2026-11-18', 90],
  ['2026-10-19', 60],
  ['2026-09-19', 30],
  ['2026-08-27', 7],
  ['2026-08-13', -7]
]) {
  const days = Math.round((Date.parse(`${expiry}T00:00:00Z`) - asOf) / 86400000);
  assert.equal(days, expected, `${expiry} Baku boundary`);
}

console.log('Baku expiry boundary contract: ok');
