import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { DurableStateStore } from '../state-store.mjs';

test('nonce replay is rejected across store instances', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'atsrs-pasha-state-'));
  const path = join(directory, 'state.json');
  try {
    const first = new DurableStateStore(path);
    const second = new DurableStateStore(path);
    assert.equal(await first.consumeNonce('11111111-1111-4111-8111-111111111111'), true);
    assert.equal(await second.consumeNonce('11111111-1111-4111-8111-111111111111'), false);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('registration idempotency survives restart and uncertain work fails closed', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'atsrs-pasha-state-'));
  const path = join(directory, 'state.json');
  const key = '22222222-2222-4222-8222-222222222222';
  try {
    const first = new DurableStateStore(path);
    assert.deepEqual(await first.beginRegistration(key), { kind: 'new' });
    const restarted = new DurableStateStore(path);
    assert.deepEqual(await restarted.beginRegistration(key), { kind: 'reconciliation_required' });
    await restarted.requireReconciliation(key);
    assert.deepEqual(await first.beginRegistration(key), { kind: 'reconciliation_required' });
    const state = JSON.parse(await readFile(path, 'utf8'));
    assert.equal(state.registrations[key].status, 'reconciliation_required');
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('completed registration returns the original bank transaction', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'atsrs-pasha-state-'));
  const path = join(directory, 'state.json');
  const key = '33333333-3333-4333-8333-333333333333';
  try {
    const store = new DurableStateStore(path);
    assert.deepEqual(await store.beginRegistration(key), { kind: 'new' });
    await store.completeRegistration(key, 'bankTransaction123');
    assert.deepEqual(await new DurableStateStore(path).beginRegistration(key), {
      kind: 'completed', transactionId: 'bankTransaction123',
    });
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('concurrent registration claims have exactly one winner', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'atsrs-pasha-state-'));
  const path = join(directory, 'state.json');
  const key = '44444444-4444-4444-8444-444444444444';
  try {
    const results = await Promise.all(Array.from({ length: 8 }, () =>
      new DurableStateStore(path).beginRegistration(key)));
    assert.equal(results.filter((result) => result.kind === 'new').length, 1);
    assert.equal(results.filter((result) => result.kind === 'reconciliation_required').length, 7);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
