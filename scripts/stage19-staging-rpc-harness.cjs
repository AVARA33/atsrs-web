const crypto = require('node:crypto');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');

const STAGING_REF = 'nsbmbbqgekcwmdqmqsao';
const PRODUCTION_REF = 'hwtjuqyxzivymofamwxl';
const TARGET_REF = process.env.ATSRS_STAGE19_TARGET_REF || STAGING_REF;
const productionConfirmation =
  process.env.ATSRS_ALLOW_PRODUCTION_SYNTHETIC_CANARY || '';
const PORT = Number(process.env.ATSRS_STAGE19_PORT || 4176);
const required = [
  'ATSRS_STAGING_ANON_KEY',
  'ATSRS_STAGING_SERVICE_ROLE_KEY'
];
for (const name of required) {
  if (!process.env[name]) throw new Error(`Missing ${name}`);
}
if (![STAGING_REF, PRODUCTION_REF].includes(TARGET_REF)) {
  throw new Error('Unknown project guard');
}
if (TARGET_REF === PRODUCTION_REF
  && productionConfirmation !== 'CONFIRMED_TARGETED_SYNTHETIC_CANARY') {
  throw new Error('Production canary confirmation missing');
}
if (STAGING_REF === PRODUCTION_REF) throw new Error('Project guard failed');

const targetUrl = `https://${TARGET_REF}.supabase.co`;
const serviceKey = process.env.ATSRS_STAGING_SERVICE_ROLE_KEY;
const anonKey = process.env.ATSRS_STAGING_ANON_KEY;
const sdk = fs.readFileSync(
  path.join(__dirname, '..', 'vendor', 'supabase-js-2.111.0.min.js'),
  'utf8'
);
const resultPath = path.join(
  process.env.ATSRS_STAGE19_OUTPUT_DIR || __dirname,
  `stage19-rpc-${PORT}-result.json`
);

let syntheticUserId = '';
let syntheticEmail = '';
let syntheticPassword = '';
let cleanupStarted = false;

function adminHeaders() {
  return {
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
    'Content-Type': 'application/json'
  };
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
  if (!userResponse.ok) throw new Error(`Synthetic user create failed: ${userResponse.status}`);
  const user = await userResponse.json();
  syntheticUserId = String(user.id || '');
  if (!syntheticUserId) throw new Error('Synthetic user id missing');

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
    await cleanupSyntheticWorkspace();
    throw new Error(`Synthetic session create failed: ${sessionResponse.status}`);
  }
  const session = await sessionResponse.json();
  const accessToken = String(session.access_token || '');
  if (!accessToken) {
    await cleanupSyntheticWorkspace();
    throw new Error('Synthetic session token missing');
  }

  const workspaceResponse = await fetch(`${targetUrl}/rest/v1/atsrs_workspaces`, {
    method: 'POST',
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal'
    },
    body: JSON.stringify({
      user_id: syntheticUserId,
      account_type: 'company'
    })
  });
  if (!workspaceResponse.ok) {
    await cleanupSyntheticWorkspace();
    throw new Error(`Synthetic workspace create failed: ${workspaceResponse.status}`);
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
    serviceKey.replace(/./g, '0');
  }
}

function safeReport(report) {
  const serialized = JSON.stringify(report, null, 2);
  if (/token|email|password|authorization|apikey|payload/i.test(serialized)) {
    throw new Error('Unsafe report');
  }
  fs.writeFileSync(resultPath, serialized, { encoding: 'utf8', mode: 0o600 });
}

function buildHtml() {
  const input = JSON.stringify({
    url: targetUrl,
    anonKey,
    email: syntheticEmail,
    password: syntheticPassword,
    userId: syntheticUserId
  }).replace(/</g, '\\u003c');
  return `<!doctype html>
<meta charset="utf-8">
<meta name="referrer" content="no-referrer">
<title>ATSRS Stage 19 RPC rehearsal</title>
<pre id="result">starting</pre>
<button id="finish" type="button" disabled>Finish</button>
<script src="/supabase.js"></script>
<script>
(async function () {
  const input = ${input};
  const selected = new URLSearchParams(location.search).get('path') || 'B';
  const scenario = new URLSearchParams(location.search).get('scenario') || 'single';
  const barrier = Number(new URLSearchParams(location.search).get('barrier') || 0);
  const variant = Number(new URLSearchParams(location.search).get('variant') || 0);
  const output = document.getElementById('result');
  const finish = document.getElementById('finish');
  const phases = [];
  const phase = (name, detail) => {
    phases.push(Object.assign({ phase: name, at_ms: Math.round(performance.now()) }, detail || {}));
    output.textContent = JSON.stringify({ state: 'running', selected, phases }, null, 2);
  };
  if (!['A', 'B', 'C'].includes(selected)) throw new Error('INVALID_PATH');
  const client = window.supabase.createClient(input.url, input.anonKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
  });
  const signIn = await client.auth.signInWithPassword({
    email: input.email,
    password: input.password
  });
  if (signIn.error || !signIn.data.session) throw new Error('SESSION_FAILED');
  const session = signIn.data.session;
  phase('session-ready');

  if (scenario === 'suite') {
    const dataKey = 'atsrs_' + input.userId + '_company_personnel';
    const value1 = [{
      atsrsId: '00000000-0000-4000-8000-000000000001',
      name: 'Synthetic 1',
      atsrsProjectIds: []
    }];
    const value2 = [{
      atsrsId: '00000000-0000-4000-8000-000000000001',
      name: 'Synthetic 1',
      position: 'Updated',
      atsrsProjectIds: []
    }];
    const rpcFetch = async (functionName, body) => {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 10000);
      try {
        const response = await fetch(
          input.url + '/rest/v1/rpc/' + functionName,
          {
            method: 'POST',
            headers: {
              apikey: input.anonKey,
              Authorization: 'Bearer ' + session.access_token,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(body),
            signal: controller.signal
          }
        );
        let responseBody = null;
        try { responseBody = await response.json(); } catch (_error) {}
        return { status: response.status, body: responseBody };
      } finally {
        clearTimeout(timer);
      }
    };
    const revision = async () => {
      const read = await rpcFetch(
        'atsrs_get_workspace_command_revision',
        { p_account_type: 'company' }
      );
      if (read.status !== 200) throw new Error('SUITE_REVISION_READ');
      return Number(read.body);
    };
    const command = async (operationId, expectedRevision, operation) => {
      const result = await rpcFetch('atsrs_apply_workspace_command', {
        p_operation_id: operationId,
        p_expected_revision: expectedRevision,
        p_account_type: 'company',
        p_client_build: 'STAGE19_RPC_SUITE',
        p_operations: [operation],
        p_audit_metadata: {
          channel: 'browser',
          rollout_stage: 'staging_rpc_suite',
          client_instance_hash: '0'.repeat(64)
        }
      });
      return {
        status: Number(result.status || 0),
        code: result.body && result.body.code || null,
        message: result.body && result.body.message || null,
        data: result.status === 200 ? result.body : null
      };
    };
    const outcomes = [];
    const r0 = await revision();
    const createId = crypto.randomUUID();
    const createArgs = {
      data_key: dataKey,
      value: value1
    };
    const created = await command(createId, r0, createArgs);
    if (created.status !== 200 || created.data.status !== 'committed') {
      throw new Error('SUITE_CREATE');
    }
    outcomes.push({ step: 'create', status: created.status });
    const replay = await command(createId, r0, createArgs);
    if (replay.status !== 200
      || replay.data.committed_revision !== created.data.committed_revision) {
      throw new Error('SUITE_REPLAY');
    }
    outcomes.push({ step: 'replay', status: replay.status });
    const noOpRevision = await revision();
    const noOp = await command(crypto.randomUUID(), noOpRevision, createArgs);
    if (noOp.status !== 200 || noOp.data.status !== 'no_op'
      || noOp.data.committed_revision !== noOpRevision) {
      throw new Error('SUITE_NO_OP');
    }
    outcomes.push({ step: 'no_op', status: noOp.status });
    const updateRevision = await revision();
    const updated = await command(crypto.randomUUID(), updateRevision, {
      data_key: dataKey,
      value: value2
    });
    if (updated.status !== 200 || updated.data.status !== 'committed') {
      throw new Error('SUITE_UPDATE');
    }
    outcomes.push({ step: 'update', status: updated.status });
    const stale = await command(crypto.randomUUID(), r0, {
      data_key: dataKey,
      value: value1
    });
    if (stale.status < 400
      || String(stale.message || '').indexOf('ATSRS_STALE_REVISION') < 0) {
      throw new Error('SUITE_STALE_REVISION');
    }
    outcomes.push({ step: 'stale_revision', status: stale.status });
    const concurrencyRevision = await revision();
    const concurrentIds = [
      crypto.randomUUID(),
      crypto.randomUUID(),
      crypto.randomUUID()
    ];
    const concurrentResults = await Promise.all(concurrentIds.map((id, index) =>
      command(id, concurrencyRevision, {
        data_key: dataKey,
        value: [{
          atsrsId: '00000000-0000-4000-8000-000000000001',
          name: 'Synthetic 1',
          position: 'Concurrent ' + (index + 1),
          atsrsProjectIds: []
        }]
      })
    ));
    const committedConcurrent = concurrentResults.filter(result =>
      result.status === 200 && result.data && result.data.status === 'committed'
    );
    const rejectedConcurrent = concurrentResults.filter(result =>
      result.status >= 400 && (
        result.code === '55P03'
        || String(result.message || '').indexOf('ATSRS_STALE_REVISION') >= 0
        || String(result.message || '').indexOf('ATSRS_SESSION_BUSY') >= 0
        || String(result.message || '').indexOf('ATSRS_WORKSPACE_BUSY') >= 0
      )
    );
    if (committedConcurrent.length !== 1 || rejectedConcurrent.length !== 2) {
      throw new Error('SUITE_CONCURRENCY_GUARD');
    }
    outcomes.push({
      step: 'concurrency_guard',
      committed: committedConcurrent.length,
      rejected: rejectedConcurrent.length
    });
    const staleBatchRevision = concurrencyRevision;
    const staleBatchStart = performance.now();
    const staleBatch = [];
    for (let index = 0; index < 12; index++) {
      staleBatch.push(await command(
        crypto.randomUUID(),
        staleBatchRevision,
        {
          data_key: dataKey,
          value: value1
        }
      ));
    }
    if (staleBatch.some(result =>
      result.status < 400
      || String(result.message || '').indexOf('ATSRS_STALE_REVISION') < 0
    )) {
      throw new Error('SUITE_STALE_RATE_GUARD');
    }
    outcomes.push({
      step: 'stale_rate_guard',
      rejected: staleBatch.length,
      duration_ms: Math.round(performance.now() - staleBatchStart)
    });
    let offlineFailed = false;
    try {
      await fetch('http://127.0.0.1:1/atsrs-offline-probe', {
        method: 'POST',
        cache: 'no-store'
      });
    } catch (_error) {
      offlineFailed = true;
    }
    const reconnectRevision = await revision();
    if (!offlineFailed || reconnectRevision <= concurrencyRevision) {
      throw new Error('SUITE_OFFLINE_RECONNECT');
    }
    outcomes.push({ step: 'offline_reconnect', failed_offline_probe: true });
    const beforeFailure = await revision();
    const failed = await command(crypto.randomUUID(), beforeFailure, {
      data_key: 'atsrs_00000000-0000-4000-8000-000000000000_company_personnel',
      value: value1
    });
    const afterFailure = await revision();
    if (failed.status < 400 || afterFailure !== beforeFailure) {
      throw new Error('SUITE_ATOMIC_FAILURE');
    }
    outcomes.push({ step: 'atomic_failure', status: failed.status });
    const deleteRevision = await revision();
    const deleted = await command(crypto.randomUUID(), deleteRevision, {
      data_key: dataKey,
      deleted: true
    });
    if (deleted.status !== 200 || deleted.data.status !== 'committed') {
      throw new Error('SUITE_DELETE');
    }
    outcomes.push({ step: 'delete', status: deleted.status });
    const suiteReport = {
      state: 'complete',
      selected,
      scenario,
      result: 'response',
      status: 200,
      code: null,
      outcomes
    };
    output.textContent = JSON.stringify(suiteReport, null, 2);
    await fetch('/report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(suiteReport)
    });
    finish.disabled = false;
    return;
  }

  const runCommand = async () => {
  phase('workspace-lock-acquired');
  phase('revision-fetch-start');
  const revisionResult = await client.rpc(
    'atsrs_get_workspace_command_revision',
    { p_account_type: 'company' }
  );
  if (revisionResult.error) throw new Error('REVISION_READ_FAILED');
  const freshRevision = Number(revisionResult.data);
  if (!Number.isSafeInteger(freshRevision) || freshRevision < 0) {
    throw new Error('REVISION_READ_INVALID');
  }
  phase('revision-fetch-complete', { revision: freshRevision });

  const operationId = crypto.randomUUID();
  const operationValue = Number.isInteger(variant) && variant >= 1 && variant <= 9
    ? [{
        atsrsId: '00000000-0000-4000-8000-00000000000' + variant,
        name: 'Synthetic ' + variant,
        atsrsProjectIds: []
      }]
    : [];
  const args = {
    p_operation_id: operationId,
    p_expected_revision: freshRevision,
    p_account_type: 'company',
    p_client_build: 'STAGE19_RPC_DIAG',
    p_operations: [{
      data_key: 'atsrs_' + input.userId + '_company_personnel',
      value: operationValue
    }],
    p_audit_metadata: {
      channel: 'browser',
      rollout_stage: 'staging_rpc',
      client_instance_hash: '0'.repeat(64)
    }
  };
  phase('fresh-baseline', { revision: freshRevision });
  phase('serialize-complete');
  if (Number.isFinite(barrier) && barrier > Date.now()) {
    phase('barrier-wait');
    await new Promise(resolve => setTimeout(resolve, barrier - Date.now()));
    phase('barrier-release');
  }
  const controller = new AbortController();
  const started = performance.now();
  let response;
  let status = 0;
  let code = null;
  phase('fetch-start');
  if (selected === 'B') {
    const pending = fetch(input.url + '/rest/v1/rpc/atsrs_apply_workspace_command', {
      method: 'POST',
      headers: {
        apikey: input.anonKey,
        Authorization: 'Bearer ' + session.access_token,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(args),
      signal: controller.signal
    });
    phase('request-sent');
    response = await Promise.race([
      pending.then(async value => {
        status = value.status;
        let body = {};
        try { body = await value.json(); } catch (_error) {}
        code = body && body.code || null;
        return { type: 'response' };
      }),
      new Promise(resolve => setTimeout(() => resolve({ type: 'timeout' }), 15000))
    ]);
  } else {
    const instrumentedFetch = async (resource, options) => {
      phase('request-sent');
      return fetch(resource, options);
    };
    const rpcClient = selected === 'C'
      ? window.supabase.createClient(input.url, input.anonKey, {
          auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
          global: { fetch: instrumentedFetch }
        })
      : client;
    if (selected === 'C') {
      await rpcClient.auth.setSession({
        access_token: session.access_token,
        refresh_token: session.refresh_token
      });
    }
    const pending = rpcClient.rpc('atsrs_apply_workspace_command', args)
      .abortSignal(controller.signal);
    response = await Promise.race([
      Promise.resolve(pending).then(value => {
        status = Number(value.status || 0);
        code = value.error && value.error.code || null;
        return { type: 'response' };
      }),
      new Promise(resolve => setTimeout(() => resolve({ type: 'timeout' }), 15000))
    ]);
  }
  if (response.type === 'timeout') {
    phase('timeout');
    controller.abort();
    phase('abort');
  } else {
    phase('response-status', { status });
    phase('parse-complete', { code });
  }
  return { response, status, code, started };
  };
  const commandRun = navigator.locks && typeof navigator.locks.request === 'function'
    ? await navigator.locks.request(
        'atsrs-stage19-workspace-command:' + input.userId + ':company',
        { mode: 'exclusive' },
        runCommand
      )
    : await runCommand();
  const { response, status, code, started } = commandRun;
  const report = {
    state: 'complete',
    selected,
    result: response.type === 'timeout' ? 'timeout' : 'response',
    status,
    code,
    duration_ms: Math.round(performance.now() - started),
    phases
  };
  output.textContent = JSON.stringify(report, null, 2);
  await fetch('/report', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(report)
  });
  finish.disabled = false;
})().catch(async error => {
  const report = { state: 'failed', code: String(error && error.message || 'UNCAUGHT') };
  document.getElementById('result').textContent = JSON.stringify(report, null, 2);
  await fetch('/report', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(report)
  }).catch(() => {});
  document.getElementById('finish').disabled = false;
});

document.getElementById('finish').addEventListener('click', async () => {
  await fetch('/finish', { method: 'POST' });
  document.getElementById('result').textContent = '{"state":"finished"}';
});
</script>`;
}

async function main() {
  await createSyntheticWorkspace();
  const server = http.createServer((request, response) => {
    if (request.url === '/supabase.js') {
      response.writeHead(200, {
        'Content-Type': 'text/javascript',
        'Cache-Control': 'no-store'
      });
      response.end(sdk);
      return;
    }
    if (request.url === '/report' && request.method === 'POST') {
      let body = '';
      request.on('data', chunk => {
        body += chunk;
        if (body.length > 65536) request.destroy();
      });
      request.on('end', () => {
        try {
          safeReport(JSON.parse(body));
          response.writeHead(204).end();
        } catch (_error) {
          response.writeHead(400).end();
        }
      });
      return;
    }
    if (request.url === '/finish' && request.method === 'POST') {
      void cleanupSyntheticWorkspace().then(() => {
        response.writeHead(200, { 'Content-Type': 'application/json' });
        response.end('{"cleaned":true}');
        server.close(() => process.exit(0));
      });
      return;
    }
    response.writeHead(200, {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
      'Referrer-Policy': 'no-referrer',
      'X-Content-Type-Options': 'nosniff'
    });
    response.end(buildHtml());
  });
  server.listen(PORT, '127.0.0.1', () => {
    console.log(JSON.stringify({ ready: true, port: PORT }));
  });
  const shutdown = async () => {
    await cleanupSyntheticWorkspace();
    server.close(() => process.exit(0));
  };
  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);
}

main().catch(async error => {
  await cleanupSyntheticWorkspace().catch(() => {});
  console.error(JSON.stringify({ ready: false, code: error.message }));
  process.exit(1);
});
