const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'css', 'product-updates-premium-v543.css'), 'utf8');
const updates = index.match(/<section id="introPage"[\s\S]*?<\/section>/)?.[0] || '';

assert.match(index, /data-atsrs-build="V552"/);
assert.match(index, /href="css\/product-updates-premium-v543\.css\?v=543"/);
assert.equal((updates.match(/class="roadmap-news roadmap-premium"/g) || []).length, 4);
assert.match(updates, /roadmap-premium[\s\S]*?ph ph-star[\s\S]*?PREMIUM[\s\S]*?AI Document Scan/);
assert.match(updates, /roadmap-premium[\s\S]*?ph ph-star[\s\S]*?PREMIUM[\s\S]*?QR Phone Upload/);
assert.match(updates, /roadmap-premium[\s\S]*?ph ph-star[\s\S]*?PREMIUM[\s\S]*?WhatsApp Expiry Alerts/);
assert.match(updates, /roadmap-premium[\s\S]*?ph ph-star[\s\S]*?PREMIUM[\s\S]*?ATSRS Profile CV/);
assert.doesNotMatch(updates.match(/Manual Document Upload[\s\S]*?<\/article>/)?.[0] || '', /roadmap-premium/);
assert.match(css, /color:#f6c453!important/);
assert.match(css, /data-theme="light"[\s\S]*?color:#9a6700!important/);
assert.match(css, /max-width:calc\(100% - 112px\)!important/);

console.log('V543 Product Updates premium marker tests passed');
