# Normalized primary-read preparation — 2026-07-30

Status: local/default-off preparation only. No production cutover or database
mutation.

## Safety contract

- Legacy JSON remains authoritative, writable, and the immediate fallback.
- `stable_ids_required=false`; normalized frontend writes remain disabled.
- The primary candidate is limited to the existing SHA-256 allowlist and an
  independent `primaryRead=true` flag. The committed configuration remains
  `false`.
- Normalized canonical fields are selected only when all entity comparisons
  match and skipped records are zero.
- Legacy ordering, volatile/UI-only metadata, and file metadata remain in the
  legacy envelope because those fields are not fully represented by the
  normalized schema.
- A real write clears the overlay before enqueueing. A successful cloud
  transaction triggers a fresh normalized read; failed/offline writes remain on
  legacy. No-op writes cause neither invalidation nor a cloud write.
- Mismatch, query failure, RLS denial, stale response, workspace change, or
  flag-off selects legacy and never mutates data.

## Local evidence

All 15 repository test files pass, including adapter parity, primary overlay,
runtime invalidation/reload, workspace-switch concurrency, canonical checksum,
RLS/grant contracts, migration reconciliation, stable-ID, and restore package
contracts. `git diff --check` passes.

The primary compatibility suite covers empty normalized sets, duplicate names,
equal certificate numbers, renamed personnel identified by stable ID, reordered
arrays, preserved optional/file metadata, project relationships, and mismatch
fallback.

## Remaining gate

Production primary read is **NO-GO** until an authenticated browser rehearsal
selects `normalized_overlay` against staging or an equivalent isolated target,
then proves Personal/Corporate navigation, two/three-tab behavior,
offline/reconnect, loader completion, desktop and 390x844 rendering, immediate
flag-off rollback, zero data mutation, and unchanged database
counts/checksums/RLS/advisor results.
