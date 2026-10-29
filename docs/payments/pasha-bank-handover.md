# PAŞA Bank e-commerce technical handover

Prepared: 23 September 2026

## Confirmed bank data

- Legal merchant: `HBA MMC` (brand: `ATSRS`)
- Website: `https://atsrs.com/`
- Merchant ID: `6000270`
- CSR Common Name: `6000270`
- Return/callback URL: `https://hwtjuqyxzivymofamwxl.supabase.co/functions/v1/billing-pasha-return`
- MerchantHandler: `https://ecomm.pashabank.az:18443/ecomm2/MerchantHandler`
- ClientHandler: `https://ecomm.pashabank.az:8463/ecomm2/ClientHandler`

The callback function is deployed and active. It is intentionally fail-closed:
until the fixed-IP connector and bank certificate are configured, it cannot
mark any payment as successful.

## CSR verification

The prepared CSR was checked locally:

- Subject: `CN=6000270, OU=atsrs.com, O=HBA MMC, L=Baku, ST=Baku, C=AZ`
- RSA key size: 2048 bits
- CSR signature: valid
- CSR public key matches the retained private key

Only `HBA_MMC_merchant_6000270_openssl.csr` may be emailed to the bank. The corresponding
private key must never be attached, uploaded to the bank, or committed to Git.

## Information still required from PAŞA Bank

- Test and production `terminal_id` values.
- Confirmation of the exact `amount` representation for AZN, USD and EUR
  (major units versus minor units).
- Confirmation that the callback URL has been registered as `RETURN_OK_URL`.
- Bank-signed merchant certificate and `PSRoot.PEM` CA certificate after CSR review.
- Confirmation that the connector's fixed public IP has been allow-listed.
- Test cards/scenarios and acceptance procedure.
- Whether recurring payments are enabled for this merchant and which domestic
  and foreign cards are supported.
- Whether refunds are enabled and the required command/process.
- Settlement currencies, timing, commissions and reconciliation format.

## Merchant work remaining before production

1. Provision a hardened HTTPS connector host with one fixed public IP.
2. Restrict inbound access, install the connector and configure secret values.
3. Send the public IP and CSR to PAŞA Bank.
4. Install the returned merchant certificate and Bank CA chain on the connector.
5. Configure the deployed `billing-pasha-return` function's server-side secrets.
6. Complete certified success, decline, timeout, reversal, duplicate callback,
   tampered request and refund tests.
7. Keep `ATSRS_BILLING_ENABLED=false` until all checks pass.

## Email draft

**Subject:** Merchant ID 6000270 — CSR and e-commerce integration details

Hörmətli Aydan xanım,

Məlumat və inteqrasiya təlimatı üçün təşəkkür edirik.

Merchant ID `6000270` üçün təlimatın 9.2-ci bölməsinə uyğun olaraq hazırlanmış
CSR faylını və tələb olunan imzalanmış sənədləri əlavə edirik.

Callback / RETURN_OK_URL:
`https://hwtjuqyxzivymofamwxl.supabase.co/functions/v1/billing-pasha-return`

İnteqrasiyanı tamamlamaq və test mühitini düzgün konfiqurasiya etmək üçün,
xahiş edirik aşağıdakı məlumatları da təqdim və ya təsdiq edəsiniz:

1. Test və production `terminal_id` dəyərləri.
2. AZN, USD və EUR üzrə `amount` parametrinin major unit, yoxsa minor unit
   formatında göndərilməsi.
3. Yuxarıdakı callback ünvanının `RETURN_OK_URL` kimi qeydiyyata alınması.
4. CSR imzalandıqdan sonra merchant sertifikatı və `PSRoot.PEM` CA faylı.
5. Statik IP ünvanının allow-list edilməsi qaydası.
6. Test kartları/senariləri və texniki qəbul proseduru.
7. Recurring payment və refund funksiyalarının Merchant ID `6000270` üçün
   aktiv olub-olmaması və tətbiq olunan məhdudiyyətlər.
8. Hesablaşma valyutaları, komissiyalar, köçürülmə müddəti və reconciliation
   hesabatının formatı.

Statik IP ünvanını connector server hazır olduqdan sonra bu yazışmaya əlavə
edəcəyik.

Hörmətlə,
HBA MMC / ATSRS
`contact@atsrs.com`

## Attachment checklist

- `HBA_MMC_merchant_6000270_openssl.csr`
- Bankın tələb etdiyi imzalanmış sənədlər
- Statik IP məlumatı (connector server hazır olduqda)

Never attach: `HBA_MMC_merchant_6000270_openssl_private.pem`.
