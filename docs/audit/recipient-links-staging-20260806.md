# Dedicated Recipient Links staging rehearsal

- Staging project: `nsbmbbqgekcwmdqmqsao`
- Production project: `hwtjuqyxzivymofamwxl` (read-only during rehearsal)
- Edge Function: `recipient-share`, staging version 6
- Edge SHA-256:
  `8AEA772A510438D774C622F031F170E59FB7B5872F0420A4F4553BEC73649168`
- Result artifact:
  `C:\Users\user\Documents\GitHub\output\atsrs-recipient-links-staging-20260806-rate-expiry\recipient-links-staging-result.json`
- Result SHA-256:
  `EE66FD6AD7AEEEA5C584B0D66269184A990D52B31D234B0DCFEC5CF587614802`

## Gates

- Create and idempotent replay: PASS
- Forwarded URL stays generic until exact-email OTP verification: PASS
- OTP request rate limit (five accepted challenges, next request rejected): PASS
- OTP verification and preview: PASS
- `allow_download=false` enforcement: PASS
- Owner-approved download and request-status isolation: PASS
- Concurrent same-operation create: PASS
- Email rotation and stale-version rejection: PASS
- Independent revoke: PASS
- Independent expiry: PASS
- Cross-owner, cross-share, REST/RLS isolation: PASS
- Short-lived signed URL byte access: PASS
- Synthetic cleanup: PASS (`0` residue)
- Normalized baseline counts: `17/4/25/0/0`
- Direct `anon` / `authenticated` write grants: `0`
- Recipient public tables with RLS: `6/6`
- New critical Security/Performance Advisor notice: `0`
- Edge result status distribution included expected negative-test `400/401/403/404/409/429` responses and `0` `5xx` responses.
- Edge execution proxy: `p50=359ms`, `p95=521ms`, `max=596ms` across the latest 100 log samples.
- Recipient-share SQL fingerprints: highest repeated mean `2.88ms`; highest observed single-statement max `71.45ms`.
- Waiting locks / idle-in-transaction sessions after cleanup: `0 / 0`.
- General Share counts before and after the extended rehearsal: `2 / 4 / 103`; the runner never writes General Share tables.

## Browser and responsive contract

- Desktop `1366x900`: overflow `0`, modal open/close PASS.
- Mobile `390x844`: `innerWidth=390`, overflow `0`, ordinary action
  controls `44px`, modal open/close PASS.
- Local browser warning/error count: `0`.

## Entitlement decision

The existing production subscription source still uses `free`, `pro` and
`business`. It cannot safely enforce the proposed paid-plan limits. The
feature therefore remains server-side default-off and may only be enabled for
an explicit owner canary with a server-set active-link limit.

## Rollback

Disable the canary entitlement, roll back the frontend/Edge version, and leave
the additive tables intact. General Share is not altered or backfilled.
