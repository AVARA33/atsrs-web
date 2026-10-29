import {
  mkdir,
  open,
  readFile,
  rename,
  rm,
  stat,
} from 'node:fs/promises';
import { dirname } from 'node:path';
import { randomUUID } from 'node:crypto';

const STATE_VERSION = 1;
const MAX_STATE_BYTES = 4 * 1024 * 1024;
const LOCK_RETRY_MS = 25;
const LOCK_TIMEOUT_MS = 5_000;
const STALE_LOCK_MS = 30_000;
const COMPLETED_RETENTION_MS = 30 * 24 * 60 * 60_000;

const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

function emptyState() {
  return { version: STATE_VERSION, nonces: {}, registrations: {} };
}

function validateState(value) {
  if (!value || value.version !== STATE_VERSION || typeof value.nonces !== 'object' ||
      typeof value.registrations !== 'object' || Array.isArray(value.nonces) ||
      Array.isArray(value.registrations)) {
    throw new Error('CONNECTOR_STATE_INVALID');
  }
  return value;
}

export class DurableStateStore {
  constructor(path, { now = () => Date.now() } = {}) {
    if (!path) throw new Error('CONNECTOR_STATE_PATH_MISSING');
    this.path = path;
    this.lockPath = `${path}.lock`;
    this.now = now;
  }

  async acquireLock() {
    const started = this.now();
    await mkdir(dirname(this.path), { recursive: true, mode: 0o700 });
    while (this.now() - started <= LOCK_TIMEOUT_MS) {
      try {
        await mkdir(this.lockPath, { mode: 0o700 });
        return;
      } catch (error) {
        if (error?.code !== 'EEXIST') throw error;
        try {
          const lock = await stat(this.lockPath);
          if (this.now() - lock.mtimeMs > STALE_LOCK_MS) {
            await rm(this.lockPath, { recursive: true, force: true });
            continue;
          }
        } catch (lockError) {
          if (lockError?.code !== 'ENOENT') throw lockError;
          continue;
        }
        await wait(LOCK_RETRY_MS);
      }
    }
    throw new Error('CONNECTOR_STATE_LOCK_TIMEOUT');
  }

  async readState() {
    try {
      const raw = await readFile(this.path);
      if (raw.length > MAX_STATE_BYTES) throw new Error('CONNECTOR_STATE_TOO_LARGE');
      return validateState(JSON.parse(raw.toString('utf8')));
    } catch (error) {
      if (error?.code === 'ENOENT') return emptyState();
      throw error;
    }
  }

  prune(state) {
    const now = this.now();
    for (const [nonce, expiry] of Object.entries(state.nonces)) {
      if (!Number.isFinite(expiry) || expiry <= now) delete state.nonces[nonce];
    }
    for (const [key, entry] of Object.entries(state.registrations)) {
      if (entry?.status === 'completed' && now - Number(entry.updated_at ?? 0) > COMPLETED_RETENTION_MS) {
        delete state.registrations[key];
      }
    }
  }

  async writeState(state) {
    const serialized = `${JSON.stringify(state)}\n`;
    if (Buffer.byteLength(serialized) > MAX_STATE_BYTES) throw new Error('CONNECTOR_STATE_TOO_LARGE');
    const temporary = `${this.path}.${process.pid}.${randomUUID()}.tmp`;
    const handle = await open(temporary, 'wx', 0o600);
    try {
      await handle.writeFile(serialized, 'utf8');
      await handle.sync();
    } finally {
      await handle.close();
    }
    await rename(temporary, this.path);
  }

  async update(mutator) {
    await this.acquireLock();
    try {
      const state = await this.readState();
      this.prune(state);
      const result = await mutator(state);
      await this.writeState(state);
      return result;
    } finally {
      await rm(this.lockPath, { recursive: true, force: true });
    }
  }

  async consumeNonce(nonce, ttlMs = 5 * 60_000) {
    return this.update((state) => {
      if (state.nonces[nonce] > this.now()) return false;
      state.nonces[nonce] = this.now() + ttlMs;
      return true;
    });
  }

  async beginRegistration(idempotencyKey) {
    return this.update((state) => {
      const existing = state.registrations[idempotencyKey];
      if (existing?.status === 'completed' && existing.transaction_id) {
        return { kind: 'completed', transactionId: existing.transaction_id };
      }
      if (existing) return { kind: 'reconciliation_required' };
      state.registrations[idempotencyKey] = {
        status: 'in_progress',
        updated_at: this.now(),
      };
      return { kind: 'new' };
    });
  }

  async completeRegistration(idempotencyKey, transactionId) {
    return this.update((state) => {
      const existing = state.registrations[idempotencyKey];
      if (!existing) throw new Error('IDEMPOTENCY_STATE_MISSING');
      if (existing.status === 'completed' && existing.transaction_id !== transactionId) {
        throw new Error('IDEMPOTENCY_TRANSACTION_MISMATCH');
      }
      state.registrations[idempotencyKey] = {
        status: 'completed',
        transaction_id: transactionId,
        updated_at: this.now(),
      };
    });
  }

  async requireReconciliation(idempotencyKey) {
    return this.update((state) => {
      const existing = state.registrations[idempotencyKey];
      if (!existing || existing.status === 'completed') return;
      state.registrations[idempotencyKey] = {
        status: 'reconciliation_required',
        updated_at: this.now(),
      };
    });
  }
}
