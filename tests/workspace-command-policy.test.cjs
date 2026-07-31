const assert = require('node:assert/strict');
const policy = require('../js/workspace-command-policy.js');

assert.equal(policy.errorCode({ code: 'pgrst001' }), 'PGRST001');
assert.equal(policy.errorCode({ status: 503 }), '503');
assert.equal(policy.isWriteConflict({ code: 'ATSRS_WRITE_CONFLICT' }), true);
assert.equal(policy.isStaleRevision({ code: '40001' }), true);
assert.equal(policy.isStaleRevision({ message: 'ATSRS_STALE_REVISION' }), true);
assert.equal(policy.isStableCompatibilityRefresh({
  message: 'ATSRS_STABLE_ID_REFRESH_REQUIRED',
}), true);
assert.equal(policy.isDuplicateInsert({ code: '23505' }), true);
assert.equal(policy.isWorkspaceBusy({ code: '55P03' }), true);
assert.equal(policy.isWorkspaceBusy({ message: 'ATSRS_WORKSPACE_BUSY' }), true);
assert.equal(policy.isRateLimited({ status: 429 }), true);
assert.equal(policy.isRateLimited({ code: 'ATSRS_RATE_LIMITED' }), true);

for (const error of [
  { code: 'ATSRS_WRITE_CONFLICT' },
  { code: '40001' },
  { message: 'ATSRS_STABLE_ID_REFRESH_REQUIRED' },
  { code: '55P03' },
  { status: 429 },
]) {
  assert.equal(policy.isRetryable(error), false);
}

for (const error of [
  { code: 'ATSRS_TRANSPORT_TIMEOUT' },
  { code: 'ATSRS_REVISION_TIMEOUT' },
  { code: '08006' },
  { code: 'PGRST003' },
  { status: 408 },
  { status: 502 },
  { status: 503 },
  { status: 504 },
  { status: 520 },
  { status: 0, message: 'network connection failed' },
]) {
  assert.equal(policy.isRetryable(error), true);
}
assert.equal(policy.isRetryable({
  status: 400,
  message: 'validation failed',
}), false);

assert.equal(policy.requestTimeoutMs({ requestTimeoutMs: 999 }), 12000);
assert.equal(policy.requestTimeoutMs({ requestTimeoutMs: 1000 }), 1000);
assert.equal(policy.requestTimeoutMs({ requestTimeoutMs: 60000 }), 60000);
assert.equal(policy.requestTimeoutMs({ requestTimeoutMs: 60001 }), 12000);

assert.deepEqual(policy.circuitConfig({}), {
  transientRetries: 2,
  failureThreshold: 2,
  transientOpenMs: 15000,
  staleOpenMs: 120000,
  busyOpenMs: 5000,
  rateLimitOpenMs: 30000,
});
assert.deepEqual(policy.circuitConfig({
  transientRetries: 99,
  circuitFailureThreshold: 0,
  circuitTransientOpenMs: 1,
  circuitStaleOpenMs: 9999999,
  circuitBusyOpenMs: 999999,
  circuitRateLimitOpenMs: 1,
}), {
  transientRetries: 2,
  failureThreshold: 1,
  transientOpenMs: 1000,
  staleOpenMs: 600000,
  busyOpenMs: 30000,
  rateLimitOpenMs: 1000,
});

assert.equal(policy.transientRetryDelay(0, () => 0), 250);
assert.equal(policy.transientRetryDelay(0, () => 0.999999), 311);
assert.equal(policy.transientRetryDelay(4, () => 0), 4000);
assert.equal(policy.transientRetryDelay(20, () => 1), 4999);
assert.equal(policy.transientRetryDelay(-1, () => Number.NaN), 250);

assert.equal(Object.isFrozen(policy), true);
console.log('workspace command policy tests passed');
