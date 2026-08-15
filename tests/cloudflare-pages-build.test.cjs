const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const output = path.join(root, 'dist');

function listFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolutePath = path.join(directory, entry.name);
    return entry.isDirectory() ? listFiles(absolutePath) : [absolutePath];
  });
}

test('Cloudflare Pages build publishes only the public ATSRS frontend', () => {
  execFileSync(process.execPath, [path.join(root, 'scripts', 'build-cloudflare-pages.mjs')], {
    cwd: root,
    stdio: 'pipe'
  });

  const topLevelEntries = fs.readdirSync(output).sort();
  for (const requiredEntry of ['_headers', 'index.html', 'qr-upload.html', 'billing-terms.html', 'refund-policy.html', 'assets', 'css', 'js', 'vendor']) {
    assert.ok(topLevelEntries.includes(requiredEntry), `${requiredEntry} must be deployed`);
  }

  const headers = fs.readFileSync(path.join(output, '_headers'), 'utf8');
  for (const requiredHeader of [
    'Strict-Transport-Security:',
    'X-Frame-Options: DENY',
    'X-Content-Type-Options: nosniff',
    'Referrer-Policy:',
    'Permissions-Policy:',
    'Content-Security-Policy:'
  ]) {
    assert.match(headers, new RegExp(requiredHeader), `${requiredHeader} must be deployed`);
  }
  assert.match(headers, /frame-ancestors 'none'/, 'CSP must prevent clickjacking');
  assert.match(headers, /connect-src[^\n]+hwtjuqyxzivymofamwxl\.supabase\.co/, 'CSP must retain Supabase connectivity');

  for (const forbiddenEntry of ['.git', '.github', 'CNAME', 'docs', 'scripts', 'supabase', 'tests']) {
    assert.ok(!topLevelEntries.includes(forbiddenEntry), `${forbiddenEntry} must not be deployed`);
  }

  const files = listFiles(output);
  assert.ok(files.length > 0, 'deployment output must not be empty');
  assert.ok(files.every((file) => fs.statSync(file).size <= 25 * 1024 * 1024), 'each Pages asset must remain within 25 MiB');
});
