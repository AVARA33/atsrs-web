import { createHmac, timingSafeEqual } from 'node:crypto';

export function parseBankResponse(text) {
  const result = Object.create(null);
  for (const rawLine of String(text ?? '').split(/\r?\n/)) {
    const separator = rawLine.indexOf(':');
    if (separator < 1) continue;
    const key = rawLine.slice(0, separator).trim().toUpperCase();
    const value = rawLine.slice(separator + 1).trim();
    if (/^[A-Z0-9_]{1,40}$/.test(key) && value.length <= 1024) result[key] = value;
  }
  return result;
}

export function signConnectorRequest(secret, timestamp, nonce, body) {
  return createHmac('sha256', secret).update(`${timestamp}.${nonce}.${body}`).digest('hex');
}

export function validateConnectorKeyId(value) {
  const keyId = String(value ?? "");
  if (!/^[A-Za-z0-9._-]{1,64}$/.test(keyId)) throw new Error("CONNECTOR_KEY_ID_INVALID");
  return keyId;
}

export function validateConnectorSecret(value) {
  const secret = String(value ?? "");
  if (Buffer.byteLength(secret, "utf8") < 32) throw new Error("CONNECTOR_SHARED_SECRET_WEAK");
  return secret;
}

export function verifyConnectorRequest({ secret, timestamp, nonce, body, signature, now = Date.now() }) {
  if (!/^\d{10}$/.test(timestamp) || Math.abs(Math.floor(now / 1000) - Number(timestamp)) > 300) return false;
  if (!/^[0-9a-f-]{36}$/i.test(nonce)) return false;
  if (!/^sha256=[0-9a-f]{64}$/i.test(signature)) return false;
  const expected = Buffer.from(signConnectorRequest(secret, timestamp, nonce, body), 'hex');
  const received = Buffer.from(signature.slice(7), 'hex');
  return expected.length === received.length && timingSafeEqual(expected, received);
}

export function validateRegistration(input) {
  if (!input || typeof input !== 'object') throw new Error('REQUEST_INVALID');
  if (!/^[0-9a-f-]{36}$/i.test(String(input.merchant_transaction_id ?? ''))) throw new Error('MERCHANT_TRANSACTION_ID_INVALID');
  if (!/^[0-9a-f-]{36}$/i.test(String(input.idempotency_key ?? ''))) throw new Error('IDEMPOTENCY_KEY_INVALID');
  if (!/^\d{1,12}$/.test(String(input.amount_minor ?? ''))) throw new Error('AMOUNT_INVALID');
  if (!['944', '840', '978'].includes(String(input.currency_numeric ?? ''))) throw new Error('CURRENCY_INVALID');
  if (!/^[0-9a-f:.]{1,45}$/i.test(String(input.client_ip_addr ?? ''))) throw new Error('CLIENT_IP_INVALID');
  if (!['az', 'en', 'ru'].includes(String(input.language ?? ''))) throw new Error('LANGUAGE_INVALID');
  if (String(input.msg_type ?? '') !== 'SMS') throw new Error('MESSAGE_TYPE_INVALID');
  if (!/^.{1,125}$/s.test(String(input.description ?? ''))) throw new Error('DESCRIPTION_INVALID');
  return input;
}

export function validateResultRequest(input) {
  if (!input || typeof input !== 'object') throw new Error('REQUEST_INVALID');
  if (!/^[A-Za-z0-9+/=_-]{8,512}$/.test(String(input.transaction_id ?? ''))) throw new Error('TRANSACTION_ID_INVALID');
  if (!/^[0-9a-f:.]{1,45}$/i.test(String(input.client_ip_addr ?? ''))) throw new Error('CLIENT_IP_INVALID');
  return input;
}
