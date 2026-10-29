import assert from 'node:assert/strict';
import {
  normalizePashaResult,
  pashaAmountMinor,
  pashaClientRedirectUrl,
  pashaCurrencyCode,
  pashaLanguage,
} from '../supabase/functions/_shared/pasha-ecomm-protocol.mjs';

assert.equal(pashaCurrencyCode('AZN'), '944');
assert.equal(pashaCurrencyCode('usd'), '840');
assert.equal(pashaCurrencyCode('EUR'), '978');
assert.throws(() => pashaCurrencyCode('GBP'), /PASHA_CURRENCY_UNSUPPORTED/);

assert.equal(pashaAmountMinor(700), '700');
assert.throws(() => pashaAmountMinor(0), /PASHA_AMOUNT_INVALID/);
assert.throws(() => pashaAmountMinor(1.5), /PASHA_AMOUNT_INVALID/);
assert.throws(() => pashaAmountMinor(1_000_000_000_000), /PASHA_AMOUNT_TOO_LARGE/);

assert.equal(pashaLanguage('az'), 'az');
assert.equal(pashaLanguage('ru'), 'ru');
assert.equal(pashaLanguage('de'), 'en');

const redirect = new URL(pashaClientRedirectUrl(
  'https://ecomm.pashabank.az:8463/ecomm2/ClientHandler',
  'ABCDEFGH12345678',
));
assert.equal(redirect.protocol, 'https:');
assert.equal(redirect.hostname, 'ecomm.pashabank.az');
assert.equal(redirect.searchParams.get('trans_id'), 'ABCDEFGH12345678');
assert.throws(
  () => pashaClientRedirectUrl('http://ecomm.pashabank.az/ClientHandler', 'ABCDEFGH12345678'),
  /PASHA_CLIENT_HANDLER_INVALID/,
);
assert.throws(
  () => pashaClientRedirectUrl('https://evil.example/ecomm2/ClientHandler', 'ABCDEFGH12345678'),
  /PASHA_CLIENT_HANDLER_NOT_ALLOWED/,
);
assert.throws(
  () => pashaClientRedirectUrl('https://ecomm.pashabank.az:8463/ecomm2/ClientHandler?next=evil', 'ABCDEFGH12345678'),
  /PASHA_CLIENT_HANDLER_INVALID/,
);

assert.deepEqual(normalizePashaResult('OK', '000'), {
  paymentStatus: 'paid',
  safeFailureCode: undefined,
});
assert.deepEqual(normalizePashaResult('PENDING', ''), {
  paymentStatus: 'pending',
  safeFailureCode: undefined,
});
assert.deepEqual(normalizePashaResult('AUTOREVERSED', '000'), {
  paymentStatus: 'canceled',
  safeFailureCode: 'PASHA_AUTOREVERSED',
});
assert.deepEqual(normalizePashaResult('DECLINED', '116'), {
  paymentStatus: 'failed',
  safeFailureCode: 'PASHA_DECLINED_116',
});
assert.throws(() => normalizePashaResult('UNKNOWN', ''), /PASHA_RESULT_UNKNOWN/);

console.log('PAŞA Bank e-commerce protocol contract passed.');
