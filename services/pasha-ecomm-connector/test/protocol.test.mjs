import test from 'node:test';
import assert from 'node:assert/strict';
import {
  parseBankResponse,
  signConnectorRequest,
  validateConnectorKeyId,
  validateConnectorSecret,
  validateRegistration,
  verifyConnectorRequest,
} from '../protocol.mjs';

test('parses PAŞA Bank colon-delimited response', () => {
  assert.deepEqual(
    { ...parseBankResponse('RESULT: OK\nRESULT_CODE: 000\nRRN: 123456789012\n') },
    { RESULT: 'OK', RESULT_CODE: '000', RRN: '123456789012' },
  );
});

test('verifies signed connector requests and rejects tampering', () => {
  const secret = 'a-test-secret-that-is-long-enough';
  const timestamp = String(Math.floor(Date.now() / 1000));
  const nonce = '5aeb6522-e116-4ed4-9c18-f0b62f379095';
  const body = '{"safe":true}';
  const signature = `sha256=${signConnectorRequest(secret, timestamp, nonce, body)}`;
  assert.equal(verifyConnectorRequest({ secret, timestamp, nonce, body, signature }), true);
  assert.equal(verifyConnectorRequest({ secret, timestamp, nonce, body: `${body}x`, signature }), false);
});

test('requires rotation-safe key IDs and at least 32-byte HMAC secrets', () => {
  assert.equal(validateConnectorKeyId('2026-q4-primary'), '2026-q4-primary');
  assert.throws(() => validateConnectorKeyId('../wrong'), /CONNECTOR_KEY_ID_INVALID/);
  assert.equal(validateConnectorSecret('12345678901234567890123456789012').length, 32);
  assert.throws(() => validateConnectorSecret('too-short'), /CONNECTOR_SHARED_SECRET_WEAK/);
});

test('accepts only the documented hosted-card registration fields', () => {
  assert.doesNotThrow(() => validateRegistration({
    merchant_transaction_id: 'b289b14d-0521-46a1-9d67-0d2c8f99cb1d',
    idempotency_key: 'e24c78fb-f5af-4f12-9d36-2501bb22230f',
    amount_minor: '700',
    currency_numeric: '840',
    client_ip_addr: '192.0.2.10',
    description: 'ATSRS bronze monthly',
    language: 'en',
    msg_type: 'SMS',
  }));
  assert.throws(() => validateRegistration({ amount_minor: '7.00' }), /MERCHANT_TRANSACTION_ID_INVALID/);
});
