# ATSRS operations baseline - 2026-08-06

- Production connectivity: PASS (read-only aggregate query).
- Public tables: 31.
- Public tables with RLS enabled: 31.
- Security advisor: no critical advisory observed during the operations audit.
- Performance advisor: informational unused-index notices and one warning for multiple
  permissive `SELECT` policies on `atsrs_talent_profiles`.
- No index or policy was changed in this backup/monitoring scope. The warning needs a
  separately tested query-plan and authorization review before remediation.
- Backup cryptography round-trip and authenticated tamper rejection: PASS.
- Production restore guard and staging-only target guard: PASS.
- Existing application regression suite: 47/47 PASS.
- Full encrypted database and Storage backup: PASS (27 Storage objects).
- Outer checksum, authenticated decryption, internal checksums, package structure and
  PostgreSQL custom-dump catalog validation: PASS.
- Independent encrypted OneDrive mirror checksum: PASS.
- Daily backup and ten-minute production health scheduled tasks: READY; task execution PASS.
- Frontend, Auth, REST, Storage and privileged aggregate metrics probes: PASS.
- Aggregate log monitor: intentionally not scheduled; the stored management token failed
  its preflight and must be replaced by a valid Supabase personal access token.
- Full staging restore rehearsal: pending explicit approval to erase the staging database
  and a staging database password. Production restore remains prohibited.

Secret values, database dumps and Storage objects are not recorded in this document or repository.
