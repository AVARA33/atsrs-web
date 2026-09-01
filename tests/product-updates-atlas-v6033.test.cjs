const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const js = fs.readFileSync(path.join(root, 'js/product-updates-atlas-v6004.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'css/product-updates-atlas-v6010.css'), 'utf8');

[
  ['email', 'Email Notification Expiry Alert'],
  ['tracking', 'Document Tracking'],
  ['sharing', 'Share Profile Link'],
  ['corporate', 'Corporate Account'],
].forEach(([key, label]) => {
  assert.match(html, new RegExp(`data-release="${key}"[^>]*>[\\s\\S]*?<span>${label}</span>`));
  assert.match(js, new RegExp(`${key}:\\{title:'${label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}'`));
});

assert.match(html, /marker-email[^>]*is-live|is-live marker-email/);
assert.match(html, /marker-tracking[^>]*is-live|is-live marker-tracking/);
assert.match(html, /marker-sharing[^>]*is-live|is-live marker-sharing/);
assert.match(html, /marker-corporate[^>]*is-building|is-building marker-corporate/);
assert.match(js, /RELEASES_PER_PAGE=30/);
assert.match(js, /Math\.ceil\(keys\.length\/RELEASES_PER_PAGE\)/);
assert.match(html, /updates-atlas-pagination/);
assert.match(css, /\.updates-atlas-pagination\{/);
assert.match(css, /\.atlas-release-card\{background:rgba\(4,12,8,\.82\)/);
assert.match(css, /html\[data-theme="light"\] \.atlas-release-card\{background:rgba\(255,255,255,\.86\)/);

console.log('Product Updates atlas v6033 checks passed.');
