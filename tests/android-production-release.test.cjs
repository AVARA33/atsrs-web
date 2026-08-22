const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const root = path.resolve(__dirname, '..');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');

test('Android OAuth uses the system browser and exact application callback', () => {
  const storage = read('js/storage.js');
  const runtime = read('apps/android/src/atsrs-mobile-runtime.js');
  const manifest = read('apps/android/android/app/src/main/AndroidManifest.xml');
  assert.match(storage, /atsrsNativeOAuthRedirectUrl/);
  assert.match(storage, /await window\.atsrsNativeOpenOAuth\(oauthUrl\)/);
  assert.match(runtime, /com\.atsrs\.app:\/\/login-callback/);
  assert.match(runtime, /hwtjuqyxzivymofamwxl\.supabase\.co/);
  assert.match(runtime, /Browser\.open/);
  assert.match(manifest, /android:scheme="com\.atsrs\.app" android:host="login-callback"/);
});

test('native packaging hides the redundant install entry and keeps its fallback canonical', () => {
  const runtime = read('apps/android/src/atsrs-mobile-runtime.js');
  const syncScript = read('apps/android/scripts/sync-web-assets.mjs');
  assert.match(runtime, /\.atsrs-native-android \.public-android-entry\{display:none!important\}/);
  assert.match(syncScript, /href="https:\/\/atsrs\.com\/download\/android\/"/);
  assert.match(syncScript, /replaceAll\(/);
});

test('Android release manifest and hosted APK are internally consistent', () => {
  const release = JSON.parse(read('download/android/android-version.json'));
  const apk = fs.readFileSync(path.join(root, 'downloads', 'atsrs-android-1.0.0.apk'));
  assert.equal(release.versionName, '1.0.0');
  assert.equal(release.versionCode, 1);
  assert.equal(release.apkUrl, 'https://atsrs.com/downloads/atsrs-android-1.0.0.apk');
  assert.equal(release.fileSize, apk.byteLength);
  assert.equal(release.sha256, crypto.createHash('sha256').update(apk).digest('hex'));
});

test('Android updater enforces ATSRS HTTPS, checksum and anti-downgrade boundaries', () => {
  const plugin = read('apps/android/android/app/src/main/java/com/atsrs/app/AtsrsUpdaterPlugin.java');
  assert.match(plugin, /RELEASE_HOST = "atsrs\.com"/);
  assert.match(plugin, /RELEASE_PATH_PREFIX = "\/downloads\/"/);
  assert.match(plugin, /sha256\.matches\("\[0-9a-f\]\{64\}"\)/);
  assert.match(plugin, /nextVersionCode <= currentVersionCode\(\)/);
  assert.match(plugin, /CHECKSUM_MISMATCH/);
  assert.match(plugin, /FileProvider\.getUriForFile/);
  assert.match(read('apps/android/src/atsrs-mobile-runtime.js'), /\^\[0-9A-Za-z\]\[0-9A-Za-z\.\+\-\]\{0,31\}\$/);
});

test('Public Android entry is a non-interactive coming-soon badge in both responsive slots', () => {
  const html = read('index.html');
  assert.equal((html.match(/class="public-android-entry [^"]*is-coming-soon"/g) || []).length, 2);
  assert.equal((html.match(/<strong>Android<\/strong><small>Coming soon<\/small>/g) || []).length, 2);
  assert.doesNotMatch(html, /href="\/download\/android\/"/);
  const headers = read('_headers');
  assert.match(headers, /application\/vnd\.android\.package-archive/);
  assert.match(headers, /max-age=31536000, immutable/);
});

test('Cloudflare production build keeps the coming-soon page but excludes the paused APK', () => {
  const buildScript = read('scripts/build-cloudflare-pages.mjs');
  assert.match(buildScript, /const publicDirectories = \[[^\]]*"download"/);
  assert.doesNotMatch(buildScript, /const publicDirectories = \[[^\]]*"downloads"/);
});

test('Android release hero begins directly with its heading and avoids duplicate branding', () => {
  const page = read('download/android/index.html');
  assert.match(page, /<section class="download-hero"[^>]*>\s*<h1 id="downloadTitle">ATSRS for Android<\/h1>/);
  assert.doesNotMatch(page, /class="download-icon"/);
  assert.doesNotMatch(page, />Back to Home<\/a>/);
  assert.match(page, /class="download-button download-button-disabled" aria-disabled="true">Coming Soon<\/span>/);
  assert.doesNotMatch(page, /href="[^"]+\.apk/);
  assert.doesNotMatch(page, /class="release-grid"|class="download-details"|class="checksum"/);
});

test('Android release page preserves Home navigation and canonical theme surfaces', () => {
  const page = read('download/android/index.html');
  const css = read('css/android-download.css');
  const script = read('js/android-download.js');
  assert.match(page, /class="public-header"/);
  assert.match(page, /class="public-wordmark atsrs-home-lockup" href="\/\?view=home#top"/);
  assert.match(page, /href="\/\?view=home#platform">Platform<\/a>/);
  assert.match(page, /href="\/\?view=login">Log in<\/a>/);
  assert.match(page, /href="\/\?view=signup">Create Free Account<\/a>/);
  assert.match(page, /theme-palette-v508\.css\?v=5848/);
  assert.match(css, /--bg:\s*#f6f8fb/);
  assert.match(css, /html\[data-theme="dark"\][^{]*\{[^}]*--bg:\s*#050606/);
  assert.match(css, /body\s*\{[^}]*background:\s*var\(--bg\)\s*!important/);
  assert.match(css, /\.android-public-nav-shell \.public-header\s*\{[^}]*background:\s*rgba\(255, 255, 255, \.97\)\s*!important/);
  assert.match(css, /html\[data-theme="dark"\] \.android-public-nav-shell \.public-header\s*\{[^}]*background:\s*rgba\(5, 6, 6, \.96\)\s*!important/);
  assert.match(script, /localStorage\.setItem\("atsrs_theme",theme\)/);
});

test('Signing credentials remain external and ignored', () => {
  const ignore = read('.gitignore');
  const gradle = read('apps/android/android/app/build.gradle');
  assert.match(ignore, /\*\.keystore/);
  assert.match(ignore, /signing\.properties/);
  assert.match(gradle, /ATSRS_SIGNING_PROPERTIES/);
  assert.doesNotMatch(gradle, /storePassword\s+["']/);
});
