const assert = require('node:assert/strict');
const runtime = require('../js/stable-id-compatibility-runtime.js');

async function run() {
  assert.equal(runtime.cacheMs({ cacheMs: 10 }), 1000);
  assert.equal(runtime.cacheMs({ cacheMs: 999999 }), 300000);
  assert.equal(runtime.cacheMs({ cacheMs: 'invalid' }), 60000);
  assert.equal(runtime.refreshRequired({ refresh_required: true }), true);
  assert.equal(runtime.refreshRequired({ client_compatible: false }), true);
  assert.equal(runtime.refreshRequired({ client_compatible: true }), false);

  assert.equal(await runtime.requested({
    config: { enabled: true },
  }), true);

  let hashCalls = 0;
  const base = {
    config: {
      enabled: false,
      canaryQueryKey: 'compat',
      scopeHashes: ['allowed'],
    },
    context: { account_type: 'company' },
    getScopeHash: async () => {
      hashCalls += 1;
      return 'allowed';
    },
  };

  assert.equal(await runtime.requested({
    ...base,
    locationSearch: '?compat=off',
  }), false);
  assert.equal(hashCalls, 0);

  assert.equal(await runtime.requested({
    ...base,
    locationSearch: '?compat=canary',
  }), true);
  assert.equal(hashCalls, 1);

  assert.equal(await runtime.requested({
    ...base,
    config: { ...base.config, scopeHashes: ['different'] },
    locationSearch: '?compat=canary',
  }), false);

  assert.equal(await runtime.requested({
    ...base,
    context: null,
    locationSearch: '?compat=canary',
  }), false);
}

run().then(() => {
  console.log('stable-ID compatibility runtime tests passed');
}).catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
