const assert = require('node:assert/strict');
const fs = require('node:fs');

const html = fs.readFileSync('index.html', 'utf8');
const landing = fs.readFileSync('js/public-landing.js', 'utf8');
const boot = fs.readFileSync('js/boot-refresh.js', 'utf8');

assert.match(html, /data-atsrs-build="V6082"/);
assert.match(html, /if\(window\.__atsrsEntryRoute==='app'\)[\s\S]*?atsrsShowLanding/);
assert.match(html, /setTimeout\(hardUnlockBoot,15000\)/);
assert.doesNotMatch(html, /setTimeout\(hardUnlockBoot,5000\)/);
assert.match(landing, /window\.atsrsShowLanding=showLanding/);
assert.match(boot, /BOOT_DEADLINE_MS=15000/);
assert.match(boot, /__atsrsEntryRoute==='app'&&!appIsOpen\(\)[\s\S]*?atsrsShowLanding/);
assert.match(boot, /!session\|\|!session\.user[\s\S]*?atsrsShowLanding/);

console.log('Authenticated refresh boot fallback checks passed.');
