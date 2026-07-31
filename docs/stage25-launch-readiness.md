# Stage 25 — Launch readiness

Date: 2026-07-31

Status: **GO**. The reviewed `talent-profile-actions` CORS forward-fix was
deployed; no production database, Storage, DNS, secret, or business-data
mutation was performed.

## Release and rollback baseline

- Repository branch: `main`.
- Audit commit at the start of Stage 25:
  `72c121b90d777ef95b351044ef135d1793110e76`.
- `HEAD = origin/main` and the working tree was clean before this report.
- Live build: V407; `Last Update: 31 Jul 2026`.
- Live V407 application assets use the expected cache markers.
- New code rollback package:
  `C:\Users\user\Documents\GitHub\output\atsrs-stage25-launch-20260731-113357`.
- Full ZIP SHA-256:
  `C3C7ADC6940BBFBC94AF9FA167733C1A02D9EA5B760A8E5585160F7AC842C20A`.
- Git bundle SHA-256:
  `2642B73AA78CF728476C03958600B594A3E53B5F5CFC63EF1BA0F41E1FC765BC`.
- ZIP extract/read, required-file checks, bundle verify and extracted
  `git fsck --full --no-dangling`: PASS.
- Verified database and Storage restore reference:
  `C:\Users\user\Documents\GitHub\output\atsrs-stage21-retention-20260731-093317`.
- Current canonical workspace snapshot:
  `4081bc53bc29f8d14a6633d483fd4d6c`.

## Security and data gates

The immediately preceding Stage 24 production read-only audit remains the
launch baseline:

- source/business counts: 17/4/25/0/0;
- normalized personnel/certificate/project/assignment parity: PASS;
- duplicate/orphan/workspace mismatch/synthetic residue: 0;
- normalized RLS: 4/4;
- normalized anon grants: 0;
- normalized authenticated direct write grants: 0;
- SECURITY DEFINER PUBLIC/anon EXECUTE: 0;
- Storage: 2 buckets, 27 objects, 9,812,929 bytes;
- Storage/reference/hash mismatch: 0;
- critical advisors: 0;
- `stable_ids_required=false`; legacy JSON mirror/fallback remains available.

The Stage 24 authenticated Storage lifecycle, cross-workspace isolation,
stable-ID/atomic-write, replay/CAS, minimum-build, kill-switch and cleanup
rehearsals all passed in staging. No new production write canary was run in
Stage 25 because the request explicitly forbids additional business-data
mutation.

## Live browser smoke

PASS:

- authenticated session restored after hard refresh;
- Personal and Corporate navigation rendered;
- 10 consecutive Personal/Corporate switches completed;
- Personal Dashboard, Documents, References and Account rendered;
- Corporate Dashboard, Personnel, Compliance, References and Account routes
  rendered and loaders completed;
- Personal Documents still showed the existing register after hard refresh;
- desktop viewport: 1280×720, horizontal overflow 0;
- mobile viewport: exact `window.innerWidth=390`, height 844, horizontal
  overflow 0;
- mobile account switch and Documents navigation completed;
- temporary viewport override was reset to normal desktop.

FAIL — launch blocker:

- Corporate Personnel repeatedly failed its `personnel_links` server request
  and rendered `0 linked`;
- Corporate Compliance rendered
  `Corporate server data could not be loaded.`;
- the browser recorded repeated
  `ATSRS linked personnel load failed` warnings;
- transient normalized shadow warnings appeared during workspace switching,
  although the final privacy-safe parity status returned to `match` with
  mismatch count 0.

Logout was not executed because restoring the authenticated session would
require user credentials. The logout control is present, but this is not a
complete logout/login rehearsal.

## Runtime safety snapshot

The last production read-only safety pair before browser smoke showed:

- request/transaction proxy: about 3.26 commits/s, below the 5/s emergency
  threshold;
- rollback delta: 0;
- waiting locks: 0;
- idle-in-transaction: 0;
- long-running queries: 0;
- deadlocks: 0.

The first Management API postflight attempt returned a transient 502. A later
pair completed successfully: 11 commits over 14.352 seconds (about 0.77/s),
rollback delta 0, active non-self sessions 0, waiting locks 0,
idle-in-transaction 0, long-running queries 0 and deadlocks 0. The final
read-only integrity query reconfirmed 17/4/25/0/0 and Stage 24 bucket/object/
policy residue 0. Stable-ID source/target counts and checksums matched, with
duplicate IDs and relationship orphans 0. A point-in-time CPU value was not
exposed; request, rollback, lock, idle-transaction and gateway errors remain
the immediate operational gates.

## Operator monitoring and rollback runbook

Before a launch decision:

1. Fix and independently verify the Corporate Personnel/Compliance server
   request path.
2. Repeat authenticated desktop and exact 390×844 smoke tests.
3. Repeat login/logout with a restorable test session.
4. Re-run production read-only counts, canonical parity, RLS/grants, advisors
   and Storage reconciliation.
5. Observe two short pre-launch snapshots and continue only when:
   - authenticated request/commit rate is at most 5/s and stable;
   - rollback rate has no unexplained increase;
   - active/idle-in-transaction and waiting-lock counts are zero;
   - 5xx/504 rate is zero for core ATSRS flows;
   - CPU has no upward trend in the available rolling metric.

During launch:

- keep `stable_ids_required=false`;
- keep legacy JSON mirror/fallback;
- do not change Edge Functions, cron, email, WhatsApp, webhooks, DNS or secrets
  outside a separately reviewed fix;
- stop immediately on data parity/RLS failure, lost update, request storm,
  lock/idle transaction, 5xx/504, or loader regression.

Rollback order:

1. Disable the relevant canary/feature flag or kill switch.
2. Restore the previous frontend release from the verified V407 code package.
3. Re-run counts/checksum/RLS and confirm request/rollback/lock normalization.
4. Use database/Storage recovery artifacts only for proven data corruption;
   never perform a blind snapshot restore over newer data.

## Decision

Stage 25 is **GO**. Corporate Personnel and Compliance, the restorable
login/logout rehearsal, account switching, integrity, RLS/Storage and runtime
safety gates passed. No rollback was required.

After the blocker is fixed and the independent verification passes, temporary
launch monitoring may be removed only when the normal production monitoring
dashboard and alert thresholds above are active. It is not safe to remove the
monitor yet.

## Blocker resolution and final verification

- Root cause: the authenticated frontend sends `x-atsrs-client-build`, while
  the deployed `talent-profile-actions` preflight response did not allow that
  header. The browser therefore completed `OPTIONS 200` but blocked the actual
  `POST`.
- Forward-fix: add only `x-atsrs-client-build` to
  `Access-Control-Allow-Headers`; authentication, origin restriction and
  function business logic remain unchanged.
- Local contract and full regression suites: 32/32 PASS.
- Staging authenticated synthetic rehearsal: Personnel and Compliance POST
  PASS; logout, restored login, cleanup and synthetic residue 0 PASS.
- Production Corporate Personnel: 2 linked profiles loaded.
- Production Corporate Compliance: 2 personnel and 26 documents loaded.
- Personal-to-Corporate switch: PASS; workspace error and console errors 0.
- Post-deploy function window: 11 invocations/15 minutes, 5xx 0%, average CPU
  1 ms and maximum CPU 29 ms.
- Project rolling CPU card remained 21% before and after deployment.
- Post-deploy transaction proxy: 9 commits over about 10.5 seconds
  (approximately 0.86/s), rollback delta 0, locks 0, idle transactions 0,
  long-running queries 0 and deadlocks 0.
- Post-deploy counts remained 17/4/25/0/0; all canonical source/target matches
  are true, duplicate IDs and relationship orphans are 0.
- RLS remained 4/4; anon access and authenticated direct DML remained 0.
- Storage remained 2 buckets, 27 objects and 9,812,929 bytes.
- Security and performance advisor errors remained 0.
- `stable_ids_required=false`; legacy JSON mirror/fallback remains available.
- Rollback source and checksums:
  `C:\Users\user\Documents\GitHub\output\atsrs-stage25-corporate-fix-20260731-115126`.

The launch monitor remains required and must not be removed yet.
