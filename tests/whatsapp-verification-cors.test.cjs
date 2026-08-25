const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const storage = fs.readFileSync(path.join(root, 'js', 'storage.js'), 'utf8');
const verification = fs.readFileSync(
  path.join(root, 'supabase', 'functions', 'whatsapp-verification', 'index.ts'),
  'utf8'
);

assert.match(
  storage,
  /'x-atsrs-client-build'\s*:\s*atsrsClientBuild/,
  'the browser client must continue sending the build compatibility header'
);
assert.match(
  verification,
  /Access-Control-Allow-Headers["']\s*:\s*["'][^"']*\bx-atsrs-client-build\b[^"']*["']/i,
  'the verification preflight must allow every browser client header'
);
assert.match(
  verification,
  /if\s*\(req\.method\s*===\s*["']OPTIONS["']\)\s*return\s+new\s+Response\([^;]+cors\(req\)/,
  'OPTIONS must return the same CORS header contract as application responses'
);
assert.match(
  verification,
  /authClient\.auth\.getUser\(accessToken\)/,
  'mobile and WhatsApp verification requests must remain authenticated'
);
assert.doesNotMatch(
  verification,
  /Access-Control-Allow-Origin["']\s*:\s*["']\*["']/,
  'the production function must keep its origin allowlist'
);

console.log('WhatsApp verification CORS contract tests passed');
