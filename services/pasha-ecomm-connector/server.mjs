import { createServer } from 'node:http';
import { request as httpsRequest } from 'node:https';
import { readFileSync } from 'node:fs';
import {
  parseBankResponse,
  validateRegistration,
  validateResultRequest,
  validateConnectorKeyId,
  validateConnectorSecret,
  verifyConnectorRequest,
} from './protocol.mjs';
import { runConnectorPreflight } from './preflight.mjs';
import { DurableStateStore } from './state-store.mjs';

const MAX_BODY_BYTES = 16_384;
const DEFAULT_MERCHANT_HANDLER_URL = 'https://ecomm.pashabank.az:18443/ecomm2/MerchantHandler';
runConnectorPreflight();
const stateStore = new DurableStateStore(required('CONNECTOR_STATE_PATH'));

function required(name) {
  const value = String(process.env[name] ?? '').trim();
  if (!value) throw new Error(`${name}_MISSING`);
  return value;
}

function connectorSecret(keyIdValue) {
  const keyId = validateConnectorKeyId(keyIdValue);
  const keyring = String(process.env.CONNECTOR_SHARED_SECRETS_JSON ?? "").trim();
  if (keyring) {
    let parsed;
    try { parsed = JSON.parse(keyring); } catch { throw new Error("CONNECTOR_KEYRING_INVALID"); }
    if (!parsed || Array.isArray(parsed) || typeof parsed !== "object" ||
        !Object.prototype.hasOwnProperty.call(parsed, keyId)) throw new Error("CONNECTOR_KEY_ID_UNKNOWN");
    return validateConnectorSecret(parsed[keyId]);
  }
  if (keyId !== "legacy") throw new Error("CONNECTOR_KEY_ID_UNKNOWN");
  return validateConnectorSecret(required("CONNECTOR_SHARED_SECRET"));
}

function json(response, status, body) {
  response.writeHead(status, {
    'Cache-Control': 'no-store',
    'Content-Type': 'application/json; charset=utf-8',
    'X-Content-Type-Options': 'nosniff',
  });
  response.end(JSON.stringify(body));
}

function collectBody(request) {
  return new Promise((resolve, reject) => {
    let body = '';
    request.setEncoding('utf8');
    request.on('data', (chunk) => {
      body += chunk;
      if (Buffer.byteLength(body) > MAX_BODY_BYTES) {
        request.pause();
        request.destroy();
        reject(new Error('REQUEST_TOO_LARGE'));
      }
    });
    request.on('end', () => resolve(body));
    request.on('error', reject);
  });
}

function merchantHandlerUrl() {
  const configured = String(process.env.PASHA_MERCHANT_HANDLER_URL ?? DEFAULT_MERCHANT_HANDLER_URL).trim();
  const allowed = new Set(
    String(process.env.PASHA_ALLOWED_MERCHANT_HANDLER_URLS ?? DEFAULT_MERCHANT_HANDLER_URL)
      .split(',').map((value) => value.trim()).filter(Boolean),
  );
  if (!allowed.has(configured)) throw new Error('MERCHANT_HANDLER_NOT_ALLOWED');
  const target = new URL(configured);
  if (target.protocol !== 'https:' || target.username || target.password || target.search || target.hash) {
    throw new Error('MERCHANT_HANDLER_INVALID');
  }
  return target;
}

function bankPost(params) {
  const body = new URLSearchParams(params).toString();
  const target = merchantHandlerUrl();
  const options = {
    method: 'POST',
    cert: readFileSync(required('PASHA_CLIENT_CERT_PATH')),
    key: readFileSync(required('PASHA_CLIENT_KEY_PATH')),
    ca: readFileSync(required('PASHA_CA_CERT_PATH')),
    minVersion: 'TLSv1.2',
    rejectUnauthorized: true,
    servername: target.hostname,
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': Buffer.byteLength(body),
    },
  };
  return new Promise((resolve, reject) => {
    const outbound = httpsRequest(target, options, (bankResponse) => {
      let responseBody = '';
      bankResponse.setEncoding('utf8');
      bankResponse.on('data', (chunk) => {
        responseBody += chunk;
        if (Buffer.byteLength(responseBody) > MAX_BODY_BYTES) outbound.destroy(new Error('BANK_RESPONSE_TOO_LARGE'));
      });
      bankResponse.on('end', () => {
        if ((bankResponse.statusCode ?? 500) < 200 || (bankResponse.statusCode ?? 500) >= 300) {
          reject(new Error(`BANK_HTTP_${bankResponse.statusCode ?? 500}`));
          return;
        }
        resolve(parseBankResponse(responseBody));
      });
    });
    outbound.setTimeout(15_000, () => outbound.destroy(new Error('BANK_TIMEOUT')));
    outbound.on('error', reject);
    outbound.end(body);
  });
}

async function registerPayment(input) {
  validateRegistration(input);
  if (required('PASHA_AMOUNT_FORMAT') !== 'minor-units-confirmed') {
    throw new Error('PASHA_AMOUNT_FORMAT_NOT_CONFIRMED');
  }
  if (String(input.terminal_id) !== required('PASHA_TERMINAL_ID')) throw new Error('TERMINAL_ID_MISMATCH');
  const idempotencyKey = String(input.idempotency_key);
  const claim = await stateStore.beginRegistration(idempotencyKey);
  if (claim.kind === 'completed') return { transaction_id: claim.transactionId };
  if (claim.kind !== 'new') throw new Error('REGISTRATION_RECONCILIATION_REQUIRED');
  try {
    const bank = await bankPost({
      command: 'V',
      amount: String(input.amount_minor),
      currency: String(input.currency_numeric),
      client_ip_addr: String(input.client_ip_addr),
      msg_type: 'SMS',
      description: String(input.description),
      terminal_id: required('PASHA_TERMINAL_ID'),
      language: String(input.language),
    });
    const transactionId = String(bank.TRANSACTION_ID ?? '');
    if (!/^[A-Za-z0-9+/=_-]{8,512}$/.test(transactionId)) throw new Error('BANK_TRANSACTION_ID_INVALID');
    await stateStore.completeRegistration(idempotencyKey, transactionId);
    return { transaction_id: transactionId };
  } catch (error) {
    await stateStore.requireReconciliation(idempotencyKey);
    throw error;
  }
}

async function paymentResult(input) {
  validateResultRequest(input);
  const bank = await bankPost({
    command: 'C',
    trans_id: String(input.transaction_id),
    client_ip_addr: String(input.client_ip_addr),
  });
  const transactionId = String(input.transaction_id);
  return {
    transaction_id: transactionId,
    result: String(bank.RESULT ?? ''),
    result_code: String(bank.RESULT_CODE ?? ''),
    ...(typeof bank.RRN === 'string' ? { rrn: bank.RRN } : {}),
  };
}

const server = createServer(async (request, response) => {
  if (request.method === 'GET' && request.url === '/health') return json(response, 200, { ok: true });
  if (request.method !== 'POST' || !['/v1/payments/register', '/v1/payments/result'].includes(request.url ?? '')) {
    return json(response, 404, { error: 'NOT_FOUND' });
  }
  if (!String(request.headers['content-type'] ?? '').toLowerCase().startsWith('application/json')) {
    return json(response, 415, { error: 'CONTENT_TYPE_UNSUPPORTED' });
  }
  try {
    const body = await collectBody(request);
    const timestamp = String(request.headers['x-atsrs-timestamp'] ?? '');
    const nonce = String(request.headers['x-atsrs-nonce'] ?? '');
    const signature = String(request.headers['x-atsrs-signature'] ?? '');
    const keyId = String(request.headers['x-atsrs-key-id'] ?? '');
    let authenticated = false;
    try {
      authenticated = verifyConnectorRequest({
        secret: connectorSecret(keyId), timestamp, nonce, body, signature,
      });
    } catch {
      authenticated = false;
    }
    if (!authenticated || !await stateStore.consumeNonce(nonce)) {
      return json(response, 401, { error: 'AUTHENTICATION_FAILED' });
    }
    const input = JSON.parse(body);
    const result = request.url === '/v1/payments/register'
      ? await registerPayment(input)
      : await paymentResult(input);
    return json(response, 200, result);
  } catch (error) {
    const code = error instanceof Error ? error.message : 'CONNECTOR_FAILURE';
    console.error('Connector request failed', code);
    const status = code === 'REQUEST_TOO_LARGE' ? 413
      : code.endsWith('_INVALID') ? 400
      : code === 'REGISTRATION_RECONCILIATION_REQUIRED' ? 409
      : 502;
    return json(response, status, { error: code });
  }
});

server.listen(
  Number(process.env.PORT ?? 8080),
  String(process.env.BIND_HOST ?? '127.0.0.1'),
  () => console.log('PAŞA Bank connector is ready'),
);
