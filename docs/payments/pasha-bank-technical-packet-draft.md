# PAŞA Bank e-commerce technical packet — DRAFT, DO NOT SEND YET

Prepared: 29 October 2026

This packet is intentionally incomplete until a hardened connector host with a
fixed public IP has been provisioned. It contains no private key, shared secret,
terminal credential, card data, or production-enablement instruction.

## Merchant and integration references

- Legal merchant: `HBA MMC`
- Brand / website: `ATSRS` / `https://atsrs.com/`
- Merchant ID: `6000270`
- CSR Common Name: `6000270`
- Return / callback URL:
  `https://hwtjuqyxzivymofamwxl.supabase.co/functions/v1/billing-pasha-return`
- MerchantHandler supplied by the bank:
  `https://ecomm.pashabank.az:18443/ecomm2/MerchantHandler`
- ClientHandler supplied by the bank:
  `https://ecomm.pashabank.az:8463/ecomm2/ClientHandler`
- Connector fixed public IP: `PENDING — NO AUTHORIZED FIXED-IP HOST FOUND`

## CSR attachment reference

Attach only:

- `HBA_MMC_merchant_6000270_openssl.csr`
- SHA-256:
  `4750946ED9905CABF1E8C57A28CAF1F814D984EB3DE9A3E5BCE0AC9DD913D294`
- Verified subject fields include `CN=6000270`, `OU=atsrs.com`, `O=HBA MMC`.

Never attach, upload, copy into a ticket, or commit the corresponding private
key. The merchant private key is not part of this packet.

## Current merchant-side readiness

- The ATSRS Supabase project is active and healthy in `eu-west-1`.
- `billing-pasha-return` is deployed and reachable. A safe `GET` probe returns
  the expected `405 Method Not Allowed`; the bank callback is designed for a
  bounded form `POST`.
- The portable connector scaffold passes its local protocol tests and its
  loopback `/health` endpoint returns `{"ok":true}`.
- The connector validates timestamped HMAC requests, rejects nonce replay using
  restart-safe shared state, preserves registration idempotency across restarts,
  bounds request and bank-response sizes, requires TLS 1.2 or newer, and uses a
  client certificate for the bank connection.
- The public return redirect alone cannot mark a transaction as paid. ATSRS
  requires a server-to-server transaction-result check.
- Paid checkout remains fail-closed. Do not enable production billing until
  the connector, certificate exchange, allow-listing and certification matrix
  are complete.

## Items requested from PAŞA Bank

Please confirm or provide:

1. Test and production `terminal_id` values for Merchant ID `6000270`.
2. Exact `amount` representation for AZN, USD and EUR (major or minor units).
3. Registration of the callback URL above as `RETURN_OK_URL`.
4. The bank-signed merchant certificate and `PSRoot.PEM` CA chain after CSR
   review.
5. Allow-listing of the connector fixed public IP once supplied.
6. Test cards/scenarios and the formal technical acceptance procedure.
7. Whether recurring payments and refunds are enabled for this merchant and
   their exact commands/constraints.
8. Supported domestic/foreign cards, settlement currencies, settlement timing,
   fees and reconciliation format.
9. Timeout, reversal and duplicate-callback behavior expected during
   certification.

## Merchant gates before the fixed IP can be supplied

1. Provision an already-authorized or newly approved paid Linux host with one
   dedicated static public IPv4 address. No qualifying host was found in the
   current workstation, repository, SSH configuration or installed cloud CLI
   configuration.
2. Place the connector on loopback behind a hardened HTTPS reverse proxy.
3. Restrict inbound traffic to required origins/networks and expose only the
   connector API/health paths needed for operation.
4. Install secrets and mTLS material from a protected host secret location;
   never from the repository or a public web directory.
5. Complete Cyber Security Manager review before copying the merchant private
   key or opening production traffic.
6. Supply the resulting fixed public IP to PAŞA Bank and wait for written
   allow-list confirmation.

## Certification matrix required before activation

- Successful registration and hosted-card redirect.
- Confirmed successful payment through server-to-server result lookup.
- Decline, timeout, malformed response and bank-unavailable paths.
- Duplicate registration/callback and replayed nonce handling.
- Tampered HMAC, stale timestamp, wrong terminal and wrong certificate paths.
- Reversal and refund behavior confirmed with the bank.
- Reconciliation references and amount/currency accuracy.
- Certificate expiry/rotation and connector restart recovery.

`ATSRS_BILLING_ENABLED` must remain `false` until every applicable gate above
passes and the bank confirms certification.
