# V393 normalized read-only canary

Production canary status: PASS.

- Commit: `8e2ac914e1907046b5fdd16e5e1e1b793ef5ef70`
- GitHub Pages build: built from the exact commit.
- Canary scopes: four SHA-256 workspace scope hashes; no raw user identifiers.
- UI read source: `legacy_json`.
- Normalized candidate status: `match`.
- Normalized mismatch/skipped count: `0`.
- Shadow mismatch count: `0`.
- `stable_ids_required=false`.

Authenticated browser verification passed for six additional
Personal/Corporate transitions and three simultaneous V393 tabs. Each tab
reported the canary as `match`, selected legacy JSON, closed its loader, and
logged no warning or error.

Post-canary read-only database verification remained unchanged:

- workspace/personnel/certificates/projects/assignments: `17/4/25/0/0`;
- canonical personnel source/target MD5:
  `c33612a045bda2c1f28841c9ba20e0aa`;
- all four entity source/target comparisons matched;
- duplicate source IDs and certificate/assignment orphans: `0`;
- advisor critical findings introduced by this release: `0`.

No database, schema, RLS, grant, Edge Function, secret, cron, email, WhatsApp,
webhook, DNS, or Storage mutation occurred.

Rollback is frontend-only to V392
`42d86b4c62e7c4dee6308c3cc81a142908680a9c`; the verified V393 ZIP and Git
bundle are stored outside the repository under the timestamped output package.
