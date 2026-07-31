const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const storage = fs.readFileSync(path.join(root, 'js', 'storage.js'), 'utf8');
const talentActions = fs.readFileSync(
  path.join(root, 'supabase', 'functions', 'talent-profile-actions', 'index.ts'),
  'utf8'
);

assert.match(
  storage,
  /'x-atsrs-client-build'\s*:\s*atsrsClientBuild/,
  'the browser client must continue sending the build compatibility header'
);
assert.match(
  talentActions,
  /Access-Control-Allow-Headers["']\s*:\s*["'][^"']*\bx-atsrs-client-build\b[^"']*["']/i,
  'the Edge Function preflight must allow every browser client header'
);
assert.match(
  talentActions,
  /if\s*\(req\.method\s*===\s*["']OPTIONS["']\)\s*return\s+new\s+Response\([^;]+corsHeaders/,
  'OPTIONS must return the same CORS header contract as application responses'
);
assert.match(
  talentActions,
  /authClient\.auth\.getUser\(token\)/,
  'authenticated requests must still be validated inside the function'
);
assert.doesNotMatch(
  talentActions,
  /Access-Control-Allow-Origin["']\s*:\s*["']\*["']/,
  'the production function must keep its origin allowlist'
);

console.log('talent-profile-actions CORS contract tests passed');
