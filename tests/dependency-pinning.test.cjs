const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const lock = JSON.parse(
  fs.readFileSync(path.join(root, 'vendor', 'dependencies.lock.json'), 'utf8')
);
const dependency = lock.dependencies['@supabase/supabase-js'];
const vendoredPath = path.join(root, ...dependency.vendoredPath.split('/'));
const bytes = fs.readFileSync(vendoredPath);

const sha256 = crypto.createHash('sha256').update(bytes).digest('hex');
const integrity = `sha384-${crypto
  .createHash('sha384')
  .update(bytes)
  .digest('base64')}`;

assert.equal(dependency.version, '2.111.0');
assert.equal(dependency.sha256, sha256);
assert.equal(dependency.integrity, integrity);
assert.match(dependency.source, /@supabase\/supabase-js@2\.111\.0$/);
assert.match(
  index,
  /src="vendor\/supabase-js-2\.111\.0\.min\.js"[\s\S]*integrity="sha384-[A-Za-z0-9+/=]+"/
);
assert.ok(index.includes(`integrity="${integrity}"`));
assert.doesNotMatch(
  index,
  /cdn\.jsdelivr\.net\/npm\/@supabase\/supabase-js@2(?=["/])/
);

console.log('pinned Supabase browser dependency tests passed');
