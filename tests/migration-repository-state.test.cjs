const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const migrationDir = path.join(root, 'supabase', 'migrations');
const sha256 = file => crypto.createHash('sha256')
  .update(fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n'))
  .digest('hex')
  .toUpperCase();

const remoteFiles = new Map([
  ['20260718220449_create_expiry_notification_foundation.sql', '2A65DF7E4D6F2DB1D11CF9BF25B68BADFF0ED3B20DBB3DF3CC099E6DDED4E7E2'],
  ['20260718221136_tighten_notification_table_grants.sql', '364F5D54E940865E0AE23967669A94C4A74D4A5C21AAECE69B7F9B7319BE2AB9'],
  ['20260718221245_document_notification_outbox_client_denial.sql', 'C076E30DAFDF2F0C221EC5F15C7FBA8B17675E8094D262D543B1D8C0C9D0ACAC'],
  ['20260718221329_secure_rls_event_trigger_function.sql', '0FA0216A4B3C8A065AF5E681AE761403008ADB54FF5B23815B98167F91EAAB7F'],
  ['20260719160405_v240_expiry_notification_stages.sql', '441C1E27365C7F3D219E03A413EB029975A0B3B79E4D531E12CF78737CE12373'],
  ['20260721044053_secure_share_access_requests.sql', 'D31B28C5B15577FF02CBE087353FD0AE526B63BC4923B1C3ABFEF2FCF9784FE5'],
  ['20260722144856_plan_quotas.sql', '2E21DD2F008809DB4AD496E36C6BD8566649B9E64DFF290DDF22AA2C55E3CD8A'],
  ['20260722145016_harden_ai_quota_rpc.sql', 'DDB881968AE58AF81C9A328CC35BD9AE76F6AE86F850EC9E184C37B26FC9016F'],
  ['20260722152910_share_access_revocation.sql', '45D655F2212162D73E34127922334138C3A54D80D605EBF0940534B44660F4D9'],
  ['20260722185521_talent_directory.sql', '69FD02F57D264606CC2A4F5896DA99F53A2D6EDB1CF3E91A06363D2309DC3CEA'],
  ['20260722194551_one_time_share_downloads.sql', 'B3BFBAA9413A2750875E3317BD61B18A6AFDBC123B052AEC821536ACB23A3540'],
  ['20260722210553_talent_profile_actions.sql', 'D5AB9308EFDD3020BA14EAD8BF80285E15487665186859B809A22149EE92107F'],
  ['20260723031945_work_availability_and_system_status.sql', '53B452D5DD524115CCE3390637AB6C8BF3C11C312E74542D3A09D6675B710475'],
  ['20260723034044_multi_work_preferences.sql', 'D6A8B95C1A0C74D085E625A4A2D97EA75888B393C58BAD7CE6E142100C809952'],
  ['20260723035731_linked_corporate_personnel.sql', '8B80F702D54DA9D3B3444CFCE044ED424D8F7BC6839A84B652BA14FD390CEFC2'],
  ['20260723125234_talent_official_profile_details.sql', 'E8D177DDD0413C54205E1B002B9C36A731C9323512A26AB76196E520DA291F8C'],
  ['20260723132002_add_talent_whatsapp_profile_fields.sql', 'A31B108458718B7D351A9237057A5FE41E172A80258FA72DEB01B988E80BC184'],
  ['20260723200035_talent_profile_visibility.sql', '4B36522021D5313CD1001AB469F3CDDA245B82573680BC9D03CEB85925C80C55'],
  ['20260723200355_enforce_talent_profile_visibility.sql', 'B11BF9ADA5806D6C264C4B425131182FB808BEB5982F5E37B1D5AD30672381E9'],
  ['20260723205032_v317_admin_overview.sql', '43443F102CB83A26B0C7BF8E7611CF03E0CE1B50281F49A3AE1E0586187BDE04'],
  ['20260724110719_corporate_sent_download_requests.sql', '4DB971D07E853F00CCFC5785610F1A3005F205B49890269CC1445B8B39D6DA57'],
  ['20260724112227_talent_message_archive.sql', '65CC8FC8CAA2D28343D93F7B283F7E42B33A52E109D0DE18B62076A167CB0AEF'],
  ['20260727120924_whatsapp_webhook_events.sql', '91DE5493ADB1FFA3F1E4384F31B3551F886BC9FC12D1E5DB1149273635FE180E'],
  ['20260727131449_grant_whatsapp_webhook_service_role_access.sql', '08F1D649AEEFB38D4D0879CCCE2EA7CB5354D56AB2A062C988FF8895526111EB'],
  ['20260727134155_whatsapp_verification.sql', '07C454C056F8D570F1D66A460562396E2E1375ED74667D3EAE7E0AE3104A6E34'],
  ['20260729005912_normalize_workspace_operations.sql', '27CE334D45D489DF02678C619FCB70808C8742D0E8209F34E1E04341CB682C97'],
  ['20260729013053_backfill_normalized_workspace_data.sql', 'DDEBC8C168E08ECAF6E152256D19841FE79A827555C39E3EF4435AE65F197FE0'],
  ['20260729035118_prepare_workspace_dual_write.sql', 'D323AAD3CD88B83D0952FBBBCBCAF1CC84F144CF23E64A77459CB59BC9169801']
]);

const retiredAliases = [
  '20260721090000_secure_share_access_requests.sql',
  '20260722120000_plan_quotas.sql',
  '20260722121500_harden_ai_quota_rpc.sql',
  '20260722183000_share_access_revocation.sql',
  '20260722200000_talent_directory.sql',
  '20260722213000_one_time_share_downloads.sql',
  '20260722220000_talent_profile_actions.sql',
  '20260723093000_work_availability_and_system_status.sql',
  '20260723110000_multi_work_preferences.sql',
  '20260723123000_linked_corporate_personnel.sql',
  '20260723180000_talent_official_profile_details.sql',
  '20260723183000_talent_whatsapp_profile_fields.sql',
  '20260723230000_talent_profile_visibility.sql',
  '20260723231500_enforce_talent_profile_visibility.sql',
  '20260724153000_corporate_sent_download_requests.sql',
  '20260724170000_talent_message_archive.sql',
  '20260727193000_whatsapp_webhook_events.sql',
  '20260727200000_whatsapp_verification.sql'
];

assert.equal(remoteFiles.size, 28);
for (const [name, expectedHash] of remoteFiles) {
  const file = path.join(migrationDir, name);
  assert.ok(fs.existsSync(file), `missing exact remote migration ${name}`);
  assert.equal(sha256(file), expectedHash, `remote migration hash drift: ${name}`);
}
for (const name of retiredAliases) {
  assert.equal(fs.existsSync(path.join(migrationDir, name)), false, `timestamp alias remains: ${name}`);
}

const localOnly = [
  '20260720192356_secure_profile_shares.sql',
  '20260721191000_delete_own_expiry_notifications.sql',
  '20260723140000_profile_photos.sql',
  '20260723170000_talent_actions_workspace_access.sql',
  '20260726223000_ai_cv_generation_quota.sql',
  '20260729041619_stable_workspace_entity_ids.sql',
  '20260729105130_baseline_v242_detailed_expiry_notifications.sql',
  '20260729105131_baseline_secure_share_live_delta.sql',
  '20260730061019_normalized_primary_write_command_contract.sql',
  '20260730111258_normalized_primary_write_semantic_noop.sql',
  '20260730112618_semantic_noop_direct_receipt_fix.sql',
  '20260730113050_semantic_canonical_array_tiebreaker.sql',
  '20260730133558_bound_workspace_command_locking.sql',
  '20260730154540_contain_workspace_command_retry_storm.sql',
  '20260730155715_reject_stale_workspace_revision_without_retry.sql',
  '20260731030456_targeted_workspace_command_revision_read.sql',
  '20260731034949_stable_id_workspace_compatibility_gate.sql',
  '20260731035646_fix_stable_id_compatibility_telemetry_bucket.sql'
];
for (const name of localOnly) {
  assert.ok(fs.existsSync(path.join(migrationDir, name)), `missing local-only migration ${name}`);
}

const actual = fs.readdirSync(migrationDir).filter(name => name.endsWith('.sql')).sort();
assert.equal(actual.length, 53);
assert.equal(new Set(actual.map(name => name.slice(0, 14))).size, actual.length);
assert.ok(actual.indexOf('20260729041619_stable_workspace_entity_ids.sql') <
  actual.indexOf('20260729105130_baseline_v242_detailed_expiry_notifications.sql'));

console.log('repository migration history state tests passed');
