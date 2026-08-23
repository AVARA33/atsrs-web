const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const auth = fs.readFileSync(path.join(root, 'js', 'auth-unified.js'), 'utf8');
const storage = fs.readFileSync(path.join(root, 'js', 'storage.js'), 'utf8');
const workspaceSql = fs.readFileSync(path.join(root, 'supabase', 'atsrs_workspaces.sql'), 'utf8');
const changedFrontend = `${auth}\n${storage}`;

assert.doesNotMatch(changedFrontend, /service_role/i, 'browser auth code must never contain a service-role credential');
assert.doesNotMatch(changedFrontend, /(?:localStorage|sessionStorage)\.setItem\([^\n]*(?:password|access_token|refresh_token)/i,
  'passwords and session tokens must not be persisted by the browser flow');
assert.doesNotMatch(changedFrontend, /console\.(?:log|info|debug)\([^\n]*(?:password|access_token|refresh_token)/i,
  'passwords and session tokens must not be logged');
assert.match(auth, /function redirectUrl\(intent\)\{var url=new URL\('\/'\,window\.location\.origin\|\|'https:\/\/atsrs\.com'\)/,
  'email redirects must be constructed from the fixed application root');
assert.match(auth, /url\.searchParams\.set\('atsrs_method','email'\)/);
assert.doesNotMatch(auth, /redirect(?:To|Url)\s*[:=]\s*(?:params|getQuery|location\.search)/i,
  'redirect destinations must not be accepted from query input');
assert.match(storage, /flowType:'pkce'/i, 'the Supabase client must retain the PKCE flow');
assert.match(storage, /age>1200000/, 'OAuth attempt markers must retain the 20-minute expiry');
assert.match(storage, /attemptWasStored && !attemptVerified\) return/, 'mismatched OAuth callbacks must fail closed');
assert.match(storage, /\['atsrs_intent','atsrs_method','atsrs_mode','atsrs_attempt','code','error','error_code','error_description'\]/,
  'callback secrets and status parameters must be removed from the address bar');
assert.match(auth, /if\(event\)event\.preventDefault\(\);if\(busy\)return false/,
  'email submissions must be single-flight');
assert.doesNotMatch(auth, /data:\{[^}]*account/i, 'workspace/account type must not be trusted from auth metadata');

assert.match(workspaceSql, /enable row level security/i);
assert.match(workspaceSql, /auth\.uid\(\)\) = user_id/i);
assert.match(workspaceSql, /primary key \(user_id, account_type\)/i);
assert.match(workspaceSql, /revoke all on table public\.atsrs_workspaces from anon/i);

console.log('Authentication security regression tests passed');
