const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const STAGING_REF = 'nsbmbbqgekcwmdqmqsao';
const PRODUCTION_REF = 'hwtjuqyxzivymofamwxl';
if (STAGING_REF === PRODUCTION_REF) throw new Error('PROJECT_GUARD_FAILED');
const BASE = `https://${STAGING_REF}.supabase.co`;
const EDGE = `${BASE}/functions/v1/recipient-share`;
const BUCKET = 'atsrs-user-files';
const anonKey = process.env.ATSRS_RECIPIENT_STAGING_ANON_KEY || '';
const serviceKey = process.env.ATSRS_RECIPIENT_STAGING_SERVICE_ROLE_KEY || '';
const output = process.env.ATSRS_RECIPIENT_STAGING_OUTPUT || __dirname;
if (!anonKey || !serviceKey) throw new Error('STAGING_CREDENTIALS_MISSING');

let userId = '', email = '', password = '', accessToken = '';
const objectPaths = [];
let bucketCreated = false;
const result = { project_ref: STAGING_REF, started_at: new Date().toISOString(), gates: {}, residue: null };
function adminHeaders(extra = {}) { return { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, 'Content-Type': 'application/json', ...extra }; }
function authHeaders() { return { apikey: anonKey, Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' }; }
async function body(response) { try { return await response.json(); } catch { return null; } }
async function request(url, options = {}, expected) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20000);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    const data = await body(response);
    if (expected && !expected.includes(response.status)) {
      throw new Error(`HTTP_${response.status}_${url.split('/').slice(-1)[0]}`);
    }
    return { status: response.status, data };
  } finally { clearTimeout(timer); }
}
async function edge(payload, owner = false, extraHeaders = {}) {
  return request(EDGE, {
    method: 'POST',
    headers: { ...(owner ? authHeaders() : { apikey: anonKey, 'Content-Type': 'application/json' }), ...extraHeaders },
    body: JSON.stringify(payload)
  });
}
function operation() { return crypto.randomUUID(); }
function assert(condition, code) { if (!condition) throw new Error(code); }

async function setup() {
  const suffix = crypto.randomUUID();
  email = `atsrs-recipient-${suffix}@example.invalid`;
  password = crypto.randomBytes(32).toString('base64url') + 'aA!9';
  const created = await request(`${BASE}/auth/v1/admin/users`, {
    method: 'POST', headers: adminHeaders(),
    body: JSON.stringify({ email, password, email_confirm: true, app_metadata: { staging_only: true, scope: 'recipient_links' } })
  }, [200]);
  userId = created.data && created.data.id;
  assert(userId, 'SYNTHETIC_USER_MISSING');
  const signedIn = await request(`${BASE}/auth/v1/token?grant_type=password`, {
    method: 'POST', headers: { apikey: anonKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  }, [200]);
  accessToken = signedIn.data && signedIn.data.access_token;
  assert(accessToken, 'SYNTHETIC_SESSION_MISSING');
  await request(`${BASE}/rest/v1/atsrs_workspaces`, {
    method: 'POST', headers: { ...authHeaders(), Prefer: 'return=minimal' },
    body: JSON.stringify({ user_id: userId, account_type: 'personal' })
  }, [201]);
  const entitled = await edge({ action: 'owner_staging_entitle' }, true);
  assert(entitled.status === 200 && entitled.data.enabled === true, 'STAGING_ENTITLEMENT_FAILED');
  const bucket = await request(`${BASE}/storage/v1/bucket`, {
    method: 'POST',
    headers: adminHeaders(),
    body: JSON.stringify({ id: BUCKET, name: BUCKET, public: false })
  });
  assert([200, 409].includes(bucket.status), 'SYNTHETIC_BUCKET_FAILED');
  bucketCreated = bucket.status === 200;
  const fileRows = [];
  for (let index = 0; index < 2; index += 1) {
    const fileId = crypto.randomUUID();
    const storagePath = `${userId}/recipient-link-${suffix}-${index}.txt`;
    objectPaths.push(storagePath);
    const bytes = Buffer.from(`ATSRS synthetic recipient document ${index + 1}`, 'utf8');
    await request(`${BASE}/storage/v1/object/${BUCKET}/${storagePath}`, {
      method: 'POST',
      headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, 'Content-Type': 'text/plain', 'x-upsert': 'false' },
      body: bytes
    }, [200]);
    fileRows.push({ id: fileId, user_id: userId, account_type: 'personal', category: 'document', file_name: `Synthetic ${index + 1}.txt`, mime_type: 'text/plain', size_bytes: bytes.length, storage_path: storagePath, metadata: { staging_only: true } });
  }
  await request(`${BASE}/rest/v1/atsrs_files`, {
    method: 'POST', headers: { ...authHeaders(), Prefer: 'return=representation' },
    body: JSON.stringify(fileRows)
  }, [201]);
  return fileRows;
}

async function verifyLink(token, recipientEmail) {
  const probe = await edge({ action: 'probe', token });
  assert(probe.status === 200 && !JSON.stringify(probe.data).includes('Synthetic'), 'PRE_OTP_DISCLOSURE');
  const started = await edge({ action: 'start_otp', token, email: recipientEmail }, true);
  assert(started.status === 202 && started.data.challenge_id, 'OTP_START_FAILED');
  const otpResult = await edge({ action: 'owner_staging_otp', challenge_id: started.data.challenge_id }, true);
  assert(otpResult.status === 200 && /^\d{6}$/.test(otpResult.data.otp), 'STAGING_OTP_FAILED');
  const wrong = await edge({ action: 'verify_otp', token, email: recipientEmail, challenge_id: started.data.challenge_id, otp: '000000' });
  assert(wrong.status === 400, 'WRONG_OTP_ACCEPTED');
  const verified = await edge({ action: 'verify_otp', token, email: recipientEmail, challenge_id: started.data.challenge_id, otp: otpResult.data.otp });
  assert(verified.status === 200 && verified.data.session_token, 'OTP_VERIFY_FAILED');
  const replay = await edge({ action: 'verify_otp', token, email: recipientEmail, challenge_id: started.data.challenge_id, otp: otpResult.data.otp });
  assert(replay.status === 400, 'OTP_REPLAY_ACCEPTED');
  return verified.data.session_token;
}

async function run() {
  const files = await setup();
  const recipientA = `recipient-a-${crypto.randomUUID()}@example.invalid`;
  const recipientB = `recipient-b-${crypto.randomUUID()}@example.invalid`;
  const opA = operation();
  const createA = await edge({ action: 'owner_create', operation_id: opA, recipient_type: 'person', recipient_label: 'Synthetic Person A', recipient_email: recipientA, document_ids: [files[0].id], expires_at: new Date(Date.now() + 86400000).toISOString(), allow_preview: true, allow_download: false }, true);
  assert(
    createA.status === 200 && createA.data.token && createA.data.share,
    `CREATE_A_FAILED_${createA.status}_${createA.data && (createA.data.code || createA.data.error) || 'UNKNOWN'}`
  );
  const replayA = await edge({ action: 'owner_create', operation_id: opA, recipient_type: 'person', recipient_label: 'Synthetic Person A', recipient_email: recipientA, document_ids: [files[0].id], expires_at: new Date(Date.now() + 86400000).toISOString(), allow_preview: true, allow_download: false }, true);
  assert(replayA.status === 200 && replayA.data.share.id === createA.data.share.id && replayA.data.token === createA.data.token, 'CREATE_IDEMPOTENCY_FAILED');
  const createB = await edge({ action: 'owner_create', operation_id: operation(), recipient_type: 'company', recipient_label: 'Synthetic Company B', recipient_email: recipientB, document_ids: [files[1].id], expires_at: new Date(Date.now() + 7 * 86400000).toISOString(), allow_preview: true, allow_download: true }, true);
  assert(createB.status === 200 && createB.data.token, 'CREATE_B_FAILED');
  const ownerStatus = await edge({ action: 'owner_status' }, true);
  assert(ownerStatus.status === 200 && ownerStatus.data.entitlement.enabled === true && ownerStatus.data.shares.length === 2, 'OWNER_STATUS_FAILED');
  result.gates.create_and_idempotency = 'PASS';

  const sessionA = await verifyLink(createA.data.token, recipientA);
  const profileA = await edge({ action: 'profile', token: createA.data.token, session_token: sessionA });
  assert(profileA.status === 200 && profileA.data.documents.length === 1 && profileA.data.documents[0].id === files[0].id, 'PROFILE_A_SCOPE_FAILED');
  const previewA = await edge({ action: 'preview', token: createA.data.token, session_token: sessionA, document_id: files[0].id });
  assert(previewA.status === 200 && /^https:/.test(previewA.data.preview_url), 'PREVIEW_A_FAILED');
  const previewFetch = await request(previewA.data.preview_url, {}, [200]);
  const deniedA = await edge({ action: 'request_download', token: createA.data.token, session_token: sessionA, operation_id: operation(), document_ids: [files[0].id] });
  assert(deniedA.status === 403, 'DOWNLOAD_FALSE_BYPASS');
  result.gates.otp_preview_download_false = 'PASS';

  const sessionB = await verifyLink(createB.data.token, recipientB);
  const requestB = await edge({ action: 'request_download', token: createB.data.token, session_token: sessionB, operation_id: operation(), document_ids: [files[1].id] });
  assert(requestB.status === 200 && requestB.data.request.id, 'DOWNLOAD_REQUEST_FAILED');
  const pendingB = await edge({ action: 'request_status', token: createB.data.token, session_token: sessionB, request_id: requestB.data.request.id });
  assert(pendingB.status === 200 && pendingB.data.request.status === 'pending', 'DOWNLOAD_PENDING_STATUS_FAILED');
  const crossSessionStatus = await edge({ action: 'request_status', token: createA.data.token, session_token: sessionA, request_id: requestB.data.request.id });
  assert(crossSessionStatus.status === 404, 'DOWNLOAD_STATUS_SESSION_BYPASS');
  const approveB = await edge({ action: 'owner_decide', request_id: requestB.data.request.id, operation_id: operation(), decision: 'approve' }, true);
  assert(approveB.status === 200 && approveB.data.request.status === 'approved', 'DOWNLOAD_APPROVAL_FAILED');
  const approvedB = await edge({ action: 'request_status', token: createB.data.token, session_token: sessionB, request_id: requestB.data.request.id });
  assert(approvedB.status === 200 && approvedB.data.request.status === 'approved', 'DOWNLOAD_APPROVED_STATUS_FAILED');
  const downloadB = await edge({ action: 'download', token: createB.data.token, session_token: sessionB, request_id: requestB.data.request.id, document_id: files[1].id });
  assert(downloadB.status === 200 && /^https:/.test(downloadB.data.download_url), 'DOWNLOAD_AUTH_FAILED');
  await request(downloadB.data.download_url, {}, [200]);
  result.gates.owner_approved_download = 'PASS';

  const concurrentOperation = operation();
  const concurrentPayload = { action: 'owner_create', operation_id: concurrentOperation, recipient_type: 'person', recipient_label: 'Synthetic Concurrent', recipient_email: `concurrent-${crypto.randomUUID()}@example.invalid`, document_ids: [files[0].id], expires_at: new Date(Date.now() + 2 * 86400000).toISOString(), allow_preview: true, allow_download: false };
  const concurrent = await Promise.all([
    edge(concurrentPayload, true),
    edge(concurrentPayload, true),
    edge(concurrentPayload, true)
  ]);
  assert(concurrent.every(item => item.status === 200), 'CONCURRENT_CREATE_FAILED');
  const concurrentIds = new Set(concurrent.map(item => item.data.share.id));
  assert(concurrentIds.size === 1, 'CONCURRENT_CREATE_DUPLICATED');
  await edge({ action: 'owner_revoke', share_id: concurrent[0].data.share.id, operation_id: operation() }, true);
  result.gates.concurrent_create = 'PASS';

  const rotatedEmail = `recipient-b-rotated-${crypto.randomUUID()}@example.invalid`;
  const rotated = await edge({ action: 'owner_update', share_id: createB.data.share.id, expected_version: createB.data.share.version, operation_id: operation(), recipient_type: 'company', recipient_label: 'Synthetic Company B', recipient_email: rotatedEmail, document_ids: [files[1].id], expires_at: createB.data.share.expires_at, allow_preview: true, allow_download: true }, true);
  assert(rotated.status === 200 && rotated.data.rotated === true && rotated.data.token, 'EMAIL_ROTATION_FAILED');
  const oldToken = await edge({ action: 'probe', token: createB.data.token });
  assert(oldToken.status === 200 && JSON.stringify(oldToken.data).includes('Enter the recipient email'), 'OLD_TOKEN_RESPONSE_NOT_GENERIC');
  const oldSession = await edge({ action: 'profile', token: createB.data.token, session_token: sessionB });
  assert(oldSession.status === 401, 'ROTATED_SESSION_STILL_ACTIVE');
  const rotatedSession = await verifyLink(rotated.data.token, rotatedEmail);
  const rotatedProfile = await edge({ action: 'profile', token: rotated.data.token, session_token: rotatedSession });
  assert(rotatedProfile.status === 200 && rotatedProfile.data.documents.length === 1, 'ROTATED_TOKEN_FAILED');
  const staleUpdate = await edge({ action: 'owner_update', share_id: createB.data.share.id, expected_version: createB.data.share.version, operation_id: operation(), recipient_type: 'company', recipient_label: 'Synthetic Company B', recipient_email: rotatedEmail, document_ids: [files[1].id], expires_at: createB.data.share.expires_at, allow_preview: true, allow_download: true }, true);
  assert(staleUpdate.status === 409, 'STALE_VERSION_ACCEPTED');
  result.gates.rotation_and_stale_version = 'PASS';

  const revokeA = await edge({ action: 'owner_revoke', share_id: createA.data.share.id, operation_id: operation() }, true);
  assert(revokeA.status === 200 && revokeA.data.share.status === 'revoked', 'REVOKE_A_FAILED');
  const closedA = await edge({ action: 'profile', token: createA.data.token, session_token: sessionA });
  assert(closedA.status === 401, 'REVOKED_A_STILL_OPEN');
  const liveB = await edge({ action: 'profile', token: rotated.data.token, session_token: rotatedSession });
  assert(liveB.status === 200 && liveB.data.documents.length === 1, 'REVOKE_ISOLATION_FAILED');
  result.gates.independent_revoke = 'PASS';

  const crossDocument = await edge({ action: 'preview', token: rotated.data.token, session_token: rotatedSession, document_id: files[0].id });
  assert(crossDocument.status === 403, 'CROSS_SHARE_DOCUMENT_BYPASS');
  const anonRead = await request(`${BASE}/rest/v1/atsrs_recipient_shares?select=id`, { headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` } });
  const anonDenied = [401, 403, 404].includes(anonRead.status);
  const anonEmpty = anonRead.status === 200 && Array.isArray(anonRead.data) && anonRead.data.length === 0;
  assert(anonDenied || anonEmpty, 'ANON_RLS_FAILED');
  result.gates.idor_and_rls = 'PASS';
  result.gates.signed_url_bytes = previewFetch.status === 200 ? 'PASS' : 'FAIL';
}

async function cleanup() {
  for (const storagePath of objectPaths) {
    await fetch(`${BASE}/storage/v1/object/${BUCKET}/${storagePath}`, { method: 'DELETE', headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } }).catch(() => null);
  }
  if (bucketCreated) {
    await fetch(`${BASE}/storage/v1/bucket/${BUCKET}`, {
      method: 'DELETE',
      headers: adminHeaders()
    }).catch(() => null);
    bucketCreated = false;
  }
  if (userId) await fetch(`${BASE}/auth/v1/admin/users/${userId}`, { method: 'DELETE', headers: adminHeaders() }).catch(() => null);
  const residue = await request(`${BASE}/rest/v1/atsrs_recipient_shares?owner_user_id=eq.${userId}&select=id`, { headers: adminHeaders() });
  result.residue = Array.isArray(residue.data) ? residue.data.length : -1;
  userId = ''; email = ''; password = ''; accessToken = '';
}

(async () => {
  try {
    await run();
    result.status = 'PASS';
  } catch (error) {
    result.status = 'FAIL';
    result.error = error instanceof Error ? error.message : 'UNKNOWN';
    process.exitCode = 1;
  } finally {
    await cleanup();
    result.finished_at = new Date().toISOString();
    fs.mkdirSync(output, { recursive: true });
    fs.writeFileSync(path.join(output, 'recipient-links-staging-result.json'), JSON.stringify(result, null, 2));
    console.log(JSON.stringify({ status: result.status, gates: result.gates, residue: result.residue, error: result.error || null }));
  }
})();
