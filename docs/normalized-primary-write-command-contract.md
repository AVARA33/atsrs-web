# Stage 19 normalized primary-write command

Status: **staging rehearsal only**. Production project
`hwtjuqyxzivymofamwxl` remains read-only in this stage. The frontend primary
write flag and `stable_ids_required` both remain `false`.

## Transaction and ownership contract

The browser cannot write the four normalized tables directly. It calls one
PostgreSQL RPC, `public.atsrs_apply_workspace_command`, and PostgreSQL owns the
entire transaction. An Edge Function, if introduced later, may call this RPC
once but must not be treated as a multi-statement transaction coordinator.

The request contains:

- `p_operation_id`: UUID idempotency key;
- `p_expected_revision`: workspace CAS revision;
- `p_account_type`: `personal` or `company`;
- `p_client_build`: short non-PII build marker;
- `p_operations`: one affected workspace graph, expressed as stable-ID legacy
  mirror keys and JSON values;
- `p_audit_metadata`: only `channel`, `rollout_stage`, and a one-way
  `client_instance_hash`.

Authorization comes only from `auth.uid()` and the owned
`public.atsrs_workspaces` row. User-editable metadata is not used. Raw payloads
and PII are never stored in the command ledger; it stores a SHA-256 request
hash, revisions, safe counts, client build, and the allowlisted audit metadata.

The command locks one indexed workspace revision row, checks idempotency before
CAS, applies projects → personnel/profile → certificates, then dependency-safe
deletes. Legacy JSON writes execute the existing normalized shadow trigger in
the same PostgreSQL transaction. Stable IDs, relationships, exact file
ownership, and canonical field parity are checked before commit. A trigger,
parity, FK, CAS, timeout, or mirror failure rolls back every affected row and
the ledger entry.

Old clients remain compatible: every legacy workspace-data write increments
the same workspace revision. A managed RPC suppresses per-row increments and
advances the revision once after the whole graph passes parity.

## Least privilege

- normalized tables retain explicit authenticated `SELECT`;
- authenticated/anon `INSERT`, `UPDATE`, and `DELETE` remain revoked;
- private state and ledger tables have RLS enabled, no browser policies, and
  all Data API grants revoked;
- the public RPC is `SECURITY DEFINER` only because table DML remains closed;
- its `search_path` is empty, every object is schema-qualified, and execution
  is revoked from `PUBLIC`, `anon`, and `service_role`;
- only `authenticated` receives `EXECUTE`.

Data API grants and RLS are independent gates. Passing one never substitutes
for the other.

## Error contract

- `ATSRS_AUTH_REQUIRED` / `ATSRS_WORKSPACE_FORBIDDEN`: authentication or
  ownership failed;
- `ATSRS_STALE_REVISION`: caller must re-read; never overwrite automatically;
- `ATSRS_IDEMPOTENCY_CONFLICT`: the same operation UUID was reused for
  different content;
- `ATSRS_PARITY_MISMATCH:*`: normalized graph and legacy mirror disagree;
- `ATSRS_FILE_OWNERSHIP_MISMATCH`: certificate file mapping is not exact;
- graph validation errors reject unstable IDs or invalid relationships;
- PostgreSQL lock/statement timeout rejects the command with no partial
  success.

An exact duplicate returns the original privacy-safe result. A no-op changes no
business row and does not advance the workspace revision; its idempotency
receipt is still retained.

## Rollback

1. Keep the frontend primary-write flag `false`.
2. Revoke RPC execute first.
3. Run
   `supabase/activation/normalized-primary-write-command-rollback.sql`.
4. If command/revision evidence exists, retain the private tables and use
   forward recovery. Never automatically drop evidence or business columns.
5. Confirm legacy writer, normalized shadow trigger, counts/checksum, RLS, and
   grants are unchanged.

## Future rollout gate

Production activation is a separate approval and follows this order:

1. staging synthetic;
2. admin/test workspace;
3. one explicitly selected real workspace;
4. allowlist and measured percentage rollout;
5. all workspaces.

Every step requires before/after counts, canonical parity, duplicate/orphan/
workspace mismatch zero, RLS/grant/advisor review, no lost/stale write, and a
tested rollback. Legacy JSON mirror and normalized graph remain in the same
transaction throughout the compatibility window.
