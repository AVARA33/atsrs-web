# ATSRS V534 dead-code and legacy-code cleanup

## Baseline

- Starting commit: `98b30fa11a058b4401501acbecb53028f653deb2`
- Branch: `maintenance/dead-code-zero-trace-v534`
- Starting working tree: clean
- Production and Pages preview baseline: V533 on 14 August 2026

## Runtime ownership map

| Feature | Frontend | Cloudflare | Supabase | External | Classification |
| --- | --- | --- | --- | --- | --- |
| Public landing, pricing and legal routes | Static HTML/CSS/JS | Pages hosting and CDN | None | None | ACTIVE |
| Authentication and session restore | Browser client and routing | Pages hosts client | Auth | OAuth provider callbacks where configured | ACTIVE |
| Personal and Corporate workspaces | Browser UI | Pages hosts client | Postgres, RLS and Edge Functions | None | ACTIVE |
| Documents and profile files | Browser UI and preview | Pages hosts client | Storage, database and signed URLs | PDF.js; Tesseract CDN fallback | ACTIVE |
| General profile sharing | `share-profile.js` | Pages hosts client | `share-profile` Edge Function, database and storage | Resend email | ACTIVE |
| Recipient links | `recipient-share.js` | Pages hosts client | `recipient-share` Edge Function | Resend email | ACTIVE |
| AI document scan and CV | Browser clients | Pages hosts client | `scan-document` and `generate-cv` Edge Functions | OpenAI Responses API | ACTIVE |
| Email expiry reminders | Notifications UI | Pages hosts client | `process-email-outbox` Edge Function and database cron | Resend email | ACTIVE |
| WhatsApp verification and webhook | Browser verification UI | Pages hosts client | `whatsapp-verification` and `whatsapp-webhook` Edge Functions | Meta Graph API and callback | ACTIVE |
| System/admin data | Browser UI | Pages hosts client | `system-status`, `talent-profile-actions`, `delete-account` and database RPCs | None | ACTIVE |
| Separate `atsrs-api` Worker | No proved caller in this branch | External account object is reported but has no repository route/config evidence | Unknown | Unknown | UNCERTAIN / OWNER REVIEW |

The repository has no Pages Functions, `_worker.js`, `_routes.json`, Wrangler configuration, service-worker registration, or repository-owned KV, R2, D1, Durable Object or Queue bindings.

## Endpoint inventory

Active Supabase Edge Function endpoints:

- `delete-account`
- `generate-cv`
- `process-email-outbox` (scheduled/database-driven)
- `recipient-share`
- `scan-document`
- `share-profile`
- `system-status`
- `talent-profile-actions`
- `whatsapp-verification`
- `whatsapp-webhook` (external Meta callback)

Active external endpoints/providers: OpenAI Responses API, Resend API, Meta Graph API, FlagCDN and the jsDelivr Tesseract fallback. No legacy endpoint was removed because no cross-platform replacement could be proved safely.

## Environment and binding audit

Referenced names only; no values are recorded:

- `ATSRS_EMAIL_FROM`
- `META_APP_SECRET`
- `OPENAI_API_KEY`
- `OPENAI_CV_MODEL`
- `RESEND_API_KEY`
- `SUPABASE_ANON_KEY`
- `SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_PUBLISHABLE_KEYS`
- `SUPABASE_SECRET_KEYS`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_URL`
- `WHATSAPP_ACCESS_TOKEN`
- `WHATSAPP_OTP_PEPPER`
- `WHATSAPP_PHONE_NUMBER_ID`
- `WHATSAPP_VERIFY_TOKEN`
- `WHATSAPP_WABA_ID`

The Supabase legacy/service-role key alternatives remain FALLBACK because deployment environment parity cannot be established from repository source alone.

## Removed high-confidence code

- V62 browser `Test Automation` panel, auto-fix handlers, DOM insertion and complete CSS chain: DEAD production debug code.
- V61 `Topbar Troubleshoot` panel, hard-fix handlers, DOM insertion, removal guard and complete CSS chain: DEAD production debug code with no reachable UI.
- V76 browser audit modal, report/copy helpers and complete CSS chain: DEAD production debug code with no caller.
- Duplicate Auth declarations in `storage.js`: exact duplicate declarations, one copy retained.
- Duplicate sharing helpers in `share-profile.js`: exact duplicate declarations, one copy retained.
- V49 single-file References handlers/renderers: LEGACY-SUPERSEDED by the later V54 multi-file implementation in the same script; cloud sessions are subsequently owned by `server-data.js`.
- Empty historical version comments in the executable tail of `index.html`: DEAD metadata with no runtime behavior.

## Removed files

- `assets/branding/atsrs-login-blue.png`: superseded by the transparent/current light lockup; zero repository references.
- `assets/branding/atsrs-login-green.png`: superseded by the transparent/current dark lockup; zero repository references.

## Preserved fallbacks and uncertain candidates

- Normalized read/write compatibility and stable-ID gates: FALLBACK / migration controls, retained.
- Supabase service-role and publishable-key compatibility paths: FALLBACK, retained.
- Root SQL setup files that overlap later migrations: UNCERTAIN; may be bootstrap or recovery artifacts, retained.
- External Cloudflare Worker `atsrs-api`, its routes, bindings and secrets: OWNER APPROVAL REQUIRED. No infrastructure was changed or deleted.
- Supabase tables, views, RPCs, policies, buckets, functions and production data: OWNER APPROVAL REQUIRED. No database resource was dropped or mutated.

## Safety boundary

This cleanup changes repository code and static assets only. It does not modify production user data, Cloudflare infrastructure, Supabase schema/resources, secrets, bindings, DNS or external provider configuration.

## Verification

- Frontend JavaScript syntax: all files in `js/` passed `node --check`.
- Local regression suite: 77 passed, 0 failed.
- Cloudflare Pages build: 107 public files generated; V534 marker present.
- Deleted branding files: absent from both source and `dist`.
- Headless Chrome smoke: desktop 1440×900 and mobile 390×844 passed Home → Login → Back to Home, landing scroll, no horizontal overflow and zero console/page errors with external requests isolated.
- Personal, Corporate, Documents, uploads, sharing, recipient-link, migration, security and workspace behavior remain covered by the passing contract suite. No live user account or production data was used.

## Final reverse-reference evidence

Repository-wide production-source searches return zero references for the removed V61, V62 and V76 debug identifiers and CSS selectors. The removed logo filenames appear only in this audit record and the negative cleanup contract test. All remaining assets under `assets/` have at least one source or metadata reference.

## Verdict

PARTIALLY CLEAN — REMAINING CANDIDATES REQUIRE OWNER REVIEW
