# V395 primary-read canary root cause

Status: V395 reverted. V394 remains the production baseline with
`primaryRead=false`.

## Evidence

The V395 browser canary selected `normalized_overlay` with exact parity and
zero comparator mismatches. The post-test database audit nevertheless found
three company workspace rows updated during the test window. Counts remained
`17/4/25/0/0`, duplicate/orphan/workspace mismatch remained zero, and no
relationship or stable-ID loss was found.

The write path was traced to existing automatic hydration behavior:

- `loadPersonnelLinks()` called `saveWorkspaceLink()` for every linked profile
  after a read. The primary overlay exposed a normalized `nationality` value
  while the legacy record used the equivalent `country` alias, so the
  read-derived object was serialized back into legacy JSON.
- `loadProfile()` may restore a weak company profile from `profile_backup` and
  write the recovered object automatically.
- Personal startup/resume may call `syncOwnProfile()` and update the talent
  profile without an explicit user save.

These are valid legacy maintenance paths, but they violate the primary canary
contract: selecting a candidate read source must not cause background writes.

## Candidate contract

The next candidate keeps legacy JSON authoritative and introduces a runtime
policy that blocks only automatic recovery/background synchronization while an
allowlisted primary canary scope is active. Explicit user Save/Add/Remove
actions retain their existing write behavior.

The adapter also preserves the legacy `country`/`nationality` field shape so a
semantically equal normalized row cannot reshape the legacy envelope if a
later explicit operation serializes it.

The candidate remains local/default-off until deterministic tests and a fresh
read-only database snapshot gate pass. No database, schema, RLS, grant, Edge
Function, secret, scheduler, messaging, webhook, or DNS change is required.
