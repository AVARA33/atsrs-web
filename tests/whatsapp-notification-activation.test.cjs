const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const ui = read('js/notifications.js');
const worker = read('supabase/functions/process-whatsapp-outbox/index.ts');
const migration = read('supabase/migrations/20260813123000_activate_whatsapp_notification_worker.sql');

assert.doesNotMatch(ui, /WhatsApp notifications will be connected soon|WhatsApp marked coming soon/);
assert.match(ui, /select\('whatsapp_number,whatsapp_verified'\)/);
assert.match(ui, /profile\.whatsapp_verified===true/);
assert.match(ui, /whatsapp_enabled:whatsapp/);
assert.match(ui, /whatsapp_phone_e164:whatsapp\?verifiedWhatsappNumber:null/);

const authCheck = worker.indexOf('atsrs_verify_whatsapp_worker_token');
const providerCheck = worker.indexOf('WhatsApp provider is not configured');
const queueRead = worker.indexOf('atsrs_notification_outbox');
assert.ok(authCheck > -1 && providerCheck > authCheck, 'provider state is checked only after worker authentication');
assert.ok(queueRead > providerCheck, 'provider configuration is checked before the queue is touched');
assert.match(worker, /eq\("whatsapp_number", destination\)\.eq\("whatsapp_verified", true\)/);
assert.match(worker, /graph\.facebook\.com\/v25\.0/);
assert.match(worker, /name: templateName/);

assert.match(migration, /atsrs_verify_whatsapp_worker_token/);
assert.match(migration, /atsrs-process-whatsapp-outbox/);
assert.match(migration, /'\*\/5 \* \* \* \*'/);

console.log('WhatsApp notification activation tests passed');
