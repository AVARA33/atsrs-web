const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const storage = read('js/storage.js');

assert.equal(read('CNAME').trim(), 'atsrs.com');
assert.match(storage, /const APP_URL="https:\/\/atsrs\.com\/"/);
assert.match(storage, /const SUPABASE_URL="https:\/\/hwtjuqyxzivymofamwxl\.supabase\.co"/);
assert.match(storage, /provider:'google'/);
assert.match(storage, /prompt:'select_account'/);
assert.doesNotMatch(storage, /hwtjuqyxziyvmofamwxl\.supabase\.co/);
assert.match(read('privacy.html'), /<h1>Privacy Notice<\/h1>/i);
assert.match(read('terms.html'), /<h1>Terms of Use<\/h1>/i);

console.log('OAuth production contract tests passed');
