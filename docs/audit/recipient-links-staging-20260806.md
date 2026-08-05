# Dedicated Recipient Links staging rehearsal

- Staging project: `nsbmbbqgekcwmdqmqsao`
- Production project: `hwtjuqyxzivymofamwxl` (read-only during rehearsal)
- Edge Function: `recipient-share`, staging version 6
- Edge SHA-256:
  `8AEA772A510438D774C622F031F170E59FB7B5872F0420A4F4553BEC73649168`
- Result artifact:
  `C:\Users\user\Documents\GitHub\output\atsrs-recipient-links-staging-20260806-033500\recipient-links-staging-result.json`
- Result SHA-256:
  `E46F17CA9D43C20CDC4D95D13100042FE9062A76F3EE59C03FAB86103F6F1E25`

## Gates

- Create and idempotent replay: PASS
- OTP verification and preview: PASS
- `allow_download=false` enforcement: PASS
- Owner-approved download and request-status isolation: PASS
- Concurrent same-operation create: PASS
- Email rotation and stale-version rejection: PASS
- Independent revoke: PASS
- Cross-owner, cross-share, REST/RLS isolation: PASS
- Short-lived signed URL byte access: PASS
- Synthetic cleanup: PASS (`0` residue)
- Normalized baseline counts: `17/4/25/0/0`
- Direct `anon` / `authenticated` write grants: `0`
- Recipient public tables with RLS: `6/6`
- New critical Security/Performance Advisor notice: `0`

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
