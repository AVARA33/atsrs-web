# PAŞA Bank e-commerce adapter

Status: application approved; ATSRS integration prepared but not enabled.

Source reviewed: `ecomm_solution-1.0.76-eng`, version 1.0.76 dated 12 March 2020.

## Approved architecture

```text
ATSRS browser
  -> Supabase billing-checkout
  -> ATSRS payment connector (fixed public IP)
  -> PAŞA Bank MerchantHandler (TLS 1.2 + merchant mTLS certificate)
  -> PAŞA Bank ClientHandler hosted card page
  -> billing-pasha-return
  -> connector transaction-result check
  -> ATSRS payment status
```

The connector boundary is mandatory because hosted Supabase Edge Functions do
not provide a stable outbound IP. The PAŞA Bank connection requirements demand
a static IP and certificate-authenticated connection.

The portable Node.js connector scaffold is in
`services/pasha-ecomm-connector`. It binds to localhost by default and is meant
to sit behind a hardened HTTPS reverse proxy on the fixed-IP host.

## Implemented ATSRS responsibilities

- `pasha-ecomm` is an available server-side provider, but billing remains gated.
- Checkout registers an SMS transaction without card data.
- Currency is restricted to ISO-4217 numeric codes 944 (AZN), 840 (USD) and 978 (EUR).
- The customer is redirected only to the configured HTTPS ClientHandler URL.
- The public return endpoint accepts only a bounded form post containing `trans_id`.
- A browser redirect never marks a payment successful. ATSRS asks the connector
  to run the PAŞA Bank transaction-result command before saving payment state.
- ATSRS never requests or stores PAN, CVV or card expiry.
- Supabase-to-connector requests use a timestamp, nonce, key ID and HMAC-SHA256
  signature. Every HMAC secret must contain at least 32 random bytes.

## Connector API contract

The connector must reject stale timestamps, replayed nonces, invalid HMAC
signatures, unexpected content types and oversized bodies. It must never log
the client certificate private key, complete bank responses or card data.
HMAC rotation uses an overlap keyring: add the new key ID and secret on the
connector, switch Supabase to that ID/secret, verify traffic, then remove the
old key. A key ID must never be reused for different secret bytes.

### `POST /v1/payments/register`

Receives the ATSRS transaction/idempotency references, amount in ATSRS minor
units, alpha and numeric currency, client IP, description, language, terminal
ID and `msg_type=SMS`. It sends PAŞA Bank `command=v` over mTLS and returns only:

```json
{"transaction_id":"BANK_TRANSACTION_ID"}
```

The connector must not translate `amount_minor` into the bank `amount` field
until PAŞA Bank confirms the amount representation in writing or in certified
test cases. The supplied document states a 12-character maximum but does not
explicitly define decimal/minor-unit conversion.

### `POST /v1/payments/result`

Receives `transaction_id` and `client_ip_addr`, sends `command=c` over mTLS and
returns a strict allow-listed result object:

```json
{
  "transaction_id":"BANK_TRANSACTION_ID",
  "result":"OK",
  "result_code":"000",
  "rrn":"OPTIONAL_SAFE_REFERENCE"
}
```

Do not forward masked card numbers or other unnecessary bank fields to ATSRS.

## CSR and certificate handover

1. Choose and deploy the connector host with a fixed public IP.
2. Generate its private key and CSR on that host using OpenSSL.
3. Send only the `.csr` file and fixed public IP to PAŞA Bank.
4. Keep the private key in the host's secret store; never email or commit it.
5. Install the bank-signed client certificate and CA chain on the connector.
6. Record certificate expiry and rehearse rotation before production activation.

## Required Supabase secrets/configuration

- `ATSRS_BILLING_ENABLED=false` until certification completes.
- `ATSRS_PAYMENT_PROVIDER=pasha-ecomm` only in the controlled test environment.
- `PASHA_CONNECTOR_URL`
- `PASHA_CONNECTOR_SHARED_SECRET`
- `PASHA_CONNECTOR_HMAC_KEY_ID`
- `PASHA_ECOMM_MERCHANT_ID` (provided by the bank; keep in deployment configuration)
- `PASHA_ECOMM_TERMINAL_ID`
- `PASHA_ECOMM_CLIENT_HANDLER_URL`
- `PASHA_ECOMM_CALLBACK_URL`

The PAŞA Bank client certificate and private key belong only on the connector;
they are not Supabase secrets and must never be placed in browser code.

## Bank confirmations still required

- Fixed IP allow-listing and MerchantHandler test/production URLs.
- Test and production terminal IDs.
- Bank `amount` representation for AZN, USD and EUR.
- Registered `RETURN_OK_URL` for `billing-pasha-return`.
- Recurring-payment activation and domestic/foreign-card limitations.
- Refund enablement, settlement timing, fees and reconciliation format.

## Production activation gate

Do not set `ATSRS_BILLING_ENABLED=true` or enable any plan until connector
deployment, CSR/certificate exchange, bank certification, database migration,
security advisors and the full success/failure/reversal/refund test matrix pass.
