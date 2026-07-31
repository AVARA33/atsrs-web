const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const STAGING_REF = 'nsbmbbqgekcwmdqmqsao';
const PRODUCTION_REF = 'hwtjuqyxzivymofamwxl';
const TARGET_REF = process.env.ATSRS_STAGE19_TARGET_REF || STAGING_REF;
const productionConfirmation =
  process.env.ATSRS_ALLOW_PRODUCTION_SYNTHETIC_CANARY || '';
if (![STAGING_REF, PRODUCTION_REF].includes(TARGET_REF)) {
  throw new Error('Unknown project guard');
}
if (TARGET_REF === PRODUCTION_REF
  && productionConfirmation !== 'CONFIRMED_TARGETED_SYNTHETIC_CANARY') {
  throw new Error('Production canary confirmation missing');
}
const targetUrl = `https://${TARGET_REF}.supabase.co`;
const anonKey = process.env.ATSRS_STAGING_ANON_KEY || '';
const serviceKey = process.env.ATSRS_STAGING_SERVICE_ROLE_KEY || '';
const outputDirectory = process.env.ATSRS_STAGE19_OUTPUT_DIR || __dirname;
const resultPath = path.join(outputDirectory, 'stage19-containment-result.json');

if (!anonKey || !serviceKey) throw new Error('Missing staging credentials');
if (STAGING_REF === PRODUCTION_REF) throw new Error('Project guard failed');

let syntheticUserId = '';
let syntheticEmail = '';
let syntheticPassword = '';
let accessToken = '';
let cleanupStarted = false;
let currentStep = 'bootstrap';

function adminHeaders() {
  return {
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
    'Content-Type': 'application/json'
  };
}

function authenticatedHeaders() {
  return {
    apikey: anonKey,
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json'
  };
}

async function readJson(response) {
  try {
    return await response.json();
  } catch (_error) {
    return null;
  }
}

async function createSyntheticWorkspace() {
  syntheticEmail = `atsrs-stage19-${crypto.randomUUID()}@example.invalid`;
  syntheticPassword = crypto.randomBytes(36).toString('base64url');
  const userResponse = await fetch(`${targetUrl}/auth/v1/admin/users`, {
    method: 'POST',
    headers: adminHeaders(),
    body: JSON.stringify({
      email: syntheticEmail,
      password: syntheticPassword,
      email_confirm: true,
      app_metadata: {
        staging_only: true,
        test_scope: 'rpc_server_rehearsal'
      }
    })
  });
  if (!userResponse.ok) {
    throw new Error(`SYNTHETIC_USER_CREATE_${userResponse.status}`);
  }
  const user = await readJson(userResponse);
  syntheticUserId = String(user && user.id || '');
  if (!syntheticUserId) throw new Error('SYNTHETIC_USER_ID_MISSING');

  const sessionResponse = await fetch(
    `${targetUrl}/auth/v1/token?grant_type=password`,
    {
      method: 'POST',
      headers: {
        apikey: anonKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: syntheticEmail,
        password: syntheticPassword
      })
    }
  );
  if (!sessionResponse.ok) {
    throw new Error(`SYNTHETIC_SESSION_CREATE_${sessionResponse.status}`);
  }
  const session = await readJson(sessionResponse);
  accessToken = String(session && session.access_token || '');
  if (!accessToken) throw new Error('SYNTHETIC_SESSION_TOKEN_MISSING');

  const workspaceResponse = await fetch(`${targetUrl}/rest/v1/atsrs_workspaces`, {
    method: 'POST',
    headers: {
      ...authenticatedHeaders(),
      Prefer: 'return=minimal'
    },
    body: JSON.stringify({
      user_id: syntheticUserId,
      account_type: 'company'
    })
  });
  if (!workspaceResponse.ok) {
    throw new Error(`SYNTHETIC_WORKSPACE_CREATE_${workspaceResponse.status}`);
  }
}

async function cleanupSyntheticWorkspace() {
  if (cleanupStarted) return;
  cleanupStarted = true;
  try {
    if (syntheticUserId) {
      await fetch(`${targetUrl}/auth/v1/admin/users/${syntheticUserId}`, {
        method: 'DELETE',
        headers: adminHeaders()
      });
    }
  } finally {
    syntheticUserId = '';
    syntheticEmail = '';
    syntheticPassword = '';
    accessToken = '';
  }
}

async function rpc(functionName, body, timeoutMs = 20000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(
      `${targetUrl}/rest/v1/rpc/${functionName}`,
      {
        method: 'POST',
        headers: authenticatedHeaders(),
        body: JSON.stringify(body),
        signal: controller.signal
      }
    );
    return {
      status: response.status,
      body: await readJson(response)
    };
  } finally {
    clearTimeout(timer);
  }
}

async function revision() {
  const result = await rpc(
    'atsrs_get_workspace_command_revision',
    { p_account_type: 'company' }
  );
  if (result.status !== 200 || !Number.isSafeInteger(Number(result.body))) {
    throw new Error('REVISION_READ_FAILED');
  }
  return Number(result.body);
}

async function command(operationId, expectedRevision, operation) {
  const result = await rpc('atsrs_apply_workspace_command', {
    p_operation_id: operationId,
    p_expected_revision: expectedRevision,
    p_account_type: 'company',
    p_client_build: TARGET_REF === PRODUCTION_REF
      ? 'STAGE19_PROD_CANARY'
      : 'STAGE19_RPC_CONTAINMENT',
    p_operations: [operation],
    p_audit_metadata: {
      channel: 'node',
      rollout_stage: 'staging_containment',
      client_instance_hash: '0'.repeat(64)
    }
  });
  return {
    status: Number(result.status || 0),
    code: result.body && result.body.code || null,
    message: result.body && result.body.message || null,
    data: result.status === 200 ? result.body : null
  };
}

function isRejected(result) {
  return result.status >= 400 && (
    result.code === '55P03'
    || String(result.message || '').includes('ATSRS_STALE_REVISION')
    || String(result.message || '').includes('ATSRS_SESSION_BUSY')
    || String(result.message || '').includes('ATSRS_WORKSPACE_BUSY')
  );
}

async function runSuite() {
  const outcomes = [];
  // Both approved targets must expose the authenticated revision reader.
  // Never substitute a guessed revision in production: a missing RPC is a
  // hard canary failure, because CAS safety depends on this fresh read.
  const revisionRpcAvailable = true;
  const dataKey = `atsrs_${syntheticUserId}_company_personnel`;
  const stableId = '00000000-0000-4000-8000-000000000001';
  const initialValue = [{
    atsrsId: stableId,
    name: 'Synthetic 1',
    atsrsProjectIds: []
  }];
  const updatedValue = [{
    atsrsId: stableId,
    name: 'Synthetic 1',
    position: 'Updated',
    atsrsProjectIds: []
  }];

  currentStep = 'initial_revision';
  const r0 = revisionRpcAvailable ? await revision() : 0;
  const createOperationId = crypto.randomUUID();
  const createOperation = { data_key: dataKey, value: initialValue };
  currentStep = 'create';
  const created = await command(createOperationId, r0, createOperation);
  if (created.status !== 200 || created.data.status !== 'committed') {
    throw new Error('CREATE_FAILED');
  }
  outcomes.push({ step: 'create', status: 'pass' });
  const createdRevision = Number(created.data.committed_revision);

  currentStep = 'replay';
  const replayed = await command(createOperationId, r0, createOperation);
  if (replayed.status !== 200
    || replayed.data.committed_revision !== created.data.committed_revision) {
    throw new Error('REPLAY_FAILED');
  }
  outcomes.push({ step: 'replay', status: 'pass' });

  currentStep = 'no_op_revision';
  const noOpRevision = revisionRpcAvailable
    ? await revision()
    : createdRevision;
  currentStep = 'no_op';
  const noOp = await command(crypto.randomUUID(), noOpRevision, createOperation);
  if (noOp.status !== 200 || noOp.data.status !== 'no_op'
    || noOp.data.committed_revision !== noOpRevision) {
    throw new Error('NO_OP_FAILED');
  }
  outcomes.push({ step: 'no_op', status: 'pass' });

  currentStep = 'update_revision';
  const updateRevision = revisionRpcAvailable
    ? await revision()
    : createdRevision;
  currentStep = 'update';
  const updated = await command(crypto.randomUUID(), updateRevision, {
    data_key: dataKey,
    value: updatedValue
  });
  if (updated.status !== 200 || updated.data.status !== 'committed') {
    throw new Error('UPDATE_FAILED');
  }
  outcomes.push({ step: 'update', status: 'pass' });
  const updatedRevision = Number(updated.data.committed_revision);

  currentStep = 'stale_revision';
  const stale = await command(crypto.randomUUID(), r0, createOperation);
  if (!isRejected(stale)
    || !String(stale.message || '').includes('ATSRS_STALE_REVISION')) {
    throw new Error('STALE_REVISION_FAILED');
  }
  outcomes.push({ step: 'stale_revision', status: 'pass' });

  currentStep = 'concurrency_revision';
  const concurrencyRevision = revisionRpcAvailable
    ? await revision()
    : updatedRevision;
  currentStep = 'concurrency';
  const concurrentValues = [1, 2, 3].map(index => [{
    atsrsId: stableId,
    name: 'Synthetic 1',
    position: `Concurrent ${index}`,
    atsrsProjectIds: []
  }]);
  const concurrentResults = await Promise.all(concurrentValues.map(value =>
    command(crypto.randomUUID(), concurrencyRevision, {
      data_key: dataKey,
      value
    })
  ));
  const committed = concurrentResults.filter(result =>
    result.status === 200 && result.data && result.data.status === 'committed'
  );
  const rejected = concurrentResults.filter(isRejected);
  if (committed.length !== 1 || rejected.length !== 2) {
    throw new Error('CONCURRENCY_GUARD_FAILED');
  }
  const committedIndex = concurrentResults.findIndex(result =>
    result.status === 200 && result.data && result.data.status === 'committed'
  );
  const concurrencyCommittedRevision = Number(
    concurrentResults[committedIndex].data.committed_revision
  );
  outcomes.push({ step: 'concurrency_guard', committed: 1, rejected: 2 });

  currentStep = 'stale_rate_guard';
  const staleBatchStarted = Date.now();
  const staleBatch = [];
  for (let index = 0; index < 12; index += 1) {
    staleBatch.push(await command(
      crypto.randomUUID(),
      concurrencyRevision,
      createOperation
    ));
  }
  if (staleBatch.some(result =>
    !isRejected(result)
    || !String(result.message || '').includes('ATSRS_STALE_REVISION')
  )) {
    throw new Error('STALE_RATE_GUARD_FAILED');
  }
  outcomes.push({
    step: 'stale_rate_guard',
    rejected: staleBatch.length,
    duration_ms: Date.now() - staleBatchStarted
  });

  currentStep = 'offline_probe';
  let offlineFailureObserved = false;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 250);
    try {
      await fetch('http://127.0.0.1:1/atsrs-offline-probe', {
        method: 'POST',
        signal: controller.signal
      });
    } finally {
      clearTimeout(timer);
    }
  } catch (_error) {
    offlineFailureObserved = true;
  }
  currentStep = 'reconnect_revision';
  const reconnectRevision = revisionRpcAvailable
    ? await revision()
    : concurrencyCommittedRevision;
  if (!offlineFailureObserved || reconnectRevision <= concurrencyRevision) {
    throw new Error('OFFLINE_RECONNECT_FAILED');
  }
  outcomes.push({ step: 'offline_reconnect', status: 'pass' });

  currentStep = 'atomic_failure_revision';
  const beforeFailure = revisionRpcAvailable
    ? await revision()
    : concurrencyCommittedRevision;
  currentStep = 'atomic_failure';
  const failed = await command(crypto.randomUUID(), beforeFailure, {
    data_key: 'atsrs_00000000-0000-4000-8000-000000000000_company_personnel',
    value: initialValue
  });
  currentStep = 'atomic_failure_revision_after';
  const afterFailure = revisionRpcAvailable
    ? await revision()
    : await command(crypto.randomUUID(), beforeFailure, {
        data_key: dataKey,
        value: concurrentValues[committedIndex]
      });
  const afterFailureRevision = revisionRpcAvailable
    ? afterFailure
    : Number(afterFailure.data && afterFailure.data.committed_revision);
  if (failed.status < 400 || afterFailureRevision !== beforeFailure
    || (!revisionRpcAvailable && afterFailure.data.status !== 'no_op')) {
    throw new Error('ATOMIC_FAILURE_FAILED');
  }
  outcomes.push({ step: 'atomic_failure', status: 'pass' });

  currentStep = 'delete_revision';
  const deleteRevision = revisionRpcAvailable
    ? await revision()
    : beforeFailure;
  currentStep = 'delete';
  const deleted = await command(crypto.randomUUID(), deleteRevision, {
    data_key: dataKey,
    deleted: true
  });
  if (deleted.status !== 200 || deleted.data.status !== 'committed') {
    throw new Error('DELETE_FAILED');
  }
  outcomes.push({ step: 'delete', status: 'pass' });

  return outcomes;
}

function writeSafeReport(report) {
  const serialized = JSON.stringify(report, null, 2);
  if (/token|email|password|authorization|apikey|payload/i.test(serialized)) {
    throw new Error('UNSAFE_REPORT');
  }
  fs.mkdirSync(outputDirectory, { recursive: true });
  fs.writeFileSync(resultPath, serialized, { encoding: 'utf8', mode: 0o600 });
}

async function main() {
  const startedAt = new Date().toISOString();
  try {
    currentStep = 'create_synthetic_workspace';
    await createSyntheticWorkspace();
    currentStep = 'suite';
    const outcomes = await runSuite();
    currentStep = 'cleanup';
    await cleanupSyntheticWorkspace();
    const report = {
      result: 'pass',
      project_ref: TARGET_REF,
      started_at: startedAt,
      finished_at: new Date().toISOString(),
      outcomes,
      cleanup: 'complete'
    };
    writeSafeReport(report);
    console.log(JSON.stringify({
      result: report.result,
      project_ref: report.project_ref,
      outcomes: outcomes.length,
      cleanup: report.cleanup,
      report_path: resultPath
    }));
  } catch (error) {
    await cleanupSyntheticWorkspace().catch(() => {});
    const report = {
      result: 'failed',
      project_ref: TARGET_REF,
      started_at: startedAt,
      finished_at: new Date().toISOString(),
      code: String(error && error.message || 'UNCAUGHT'),
      failed_step: currentStep,
      cleanup: 'attempted'
    };
    writeSafeReport(report);
    console.error(JSON.stringify({
      result: report.result,
      project_ref: report.project_ref,
      code: report.code,
      failed_step: report.failed_step,
      cleanup: report.cleanup,
      report_path: resultPath
    }));
    process.exitCode = 1;
  }
}

main();
