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
  assert.match(headers, /frame-ancestors 'none'/, 'Default CSP must prevent clickjacking');
  for (const legalPath of ['/privacy.html', '/data-deletion.html']) {
    const escapedPath = legalPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const legalRule = headers.match(new RegExp(`${escapedPath}\\r?\\n([\\s\\S]*?)(?=\\r?\\n\\/|$)`));
    assert.ok(legalRule, `${legalPath} must have a scoped frame policy`);
    assert.match(legalRule[1], /! X-Frame-Options/, `${legalPath} must remove the inherited DENY header`);
    assert.match(legalRule[1], /X-Frame-Options: SAMEORIGIN/, `${legalPath} must permit same-origin embedding only`);
    assert.match(legalRule[1], /! Content-Security-Policy/, `${legalPath} must replace the inherited CSP`);
    assert.match(legalRule[1], /frame-ancestors 'self'/, `${legalPath} CSP must permit ATSRS embedding only`);
  }
  assert.match(headers, /connect-src[^\n]+hwtjuqyxzivymofamwxl\.supabase\.co/, 'CSP must retain Supabase connectivity');
  const headerBlocks = headers.split(/\r?\n\r?\n/);
  for (const currentProfileAsset of ['/', '/index.html', '/css/profile-privacy-v1.css', '/js/profile-privacy-v1.js', '/css/profile-sharing-v1.css', '/js/profile-sharing-v1.js', '/js/profile-workspace-v5886.js']) {
    const rule = headerBlocks.find(block => block.split(/\r?\n/, 1)[0] === currentProfileAsset);
    assert.ok(rule, `${currentProfileAsset} must have a cache rule`);
    assert.match(rule, /Cache-Control: no-store, no-cache, must-revalidate/, `${currentProfileAsset} must not reuse an old Profile variant`);
  }

  for (const forbiddenEntry of ['.git', '.github', 'CNAME', 'docs', 'scripts', 'supabase', 'tests']) {
    assert.ok(!topLevelEntries.includes(forbiddenEntry), `${forbiddenEntry} must not be deployed`);
  }

  const files = listFiles(output);
  assert.ok(files.length > 0, 'deployment output must not be empty');
  assert.ok(files.every((file) => fs.statSync(file).size <= 25 * 1024 * 1024), 'each Pages asset must remain within 25 MiB');
});
