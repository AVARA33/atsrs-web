const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const pricing = fs.readFileSync(path.join(root, 'pricing.html'), 'utf8');
const brandCss = fs.readFileSync(path.join(root, 'css', 'brand-auth-v513.css'), 'utf8');
const lightBrandCss = fs.readFileSync(path.join(root, 'css', 'privacy-brand-v533.css'), 'utf8');

assert.match(pricing, /class="public-wordmark atsrs-home-lockup"/);
assert.doesNotMatch(pricing, /class="public-wordmark atsrs-animated-wordmark"[^>]*>ATSRS<\/a>/);
assert.match(pricing, /brand-auth-v513\.css\?v=539/);
assert.match(pricing, /privacy-brand-v533\.css\?v=539/);
assert.match(brandCss, /atsrs-lockup-green-transparent\.png/);
assert.match(lightBrandCss, /atsrs-lockup-light-transparent\.png/);
assert.match(brandCss, /\.public-wordmark\.atsrs-home-lockup[\s\S]*?width:clamp\(188px,17vw,218px\)/);
assert.match(brandCss, /@media\(max-width:420px\)[\s\S]*?\.public-wordmark\.atsrs-home-lockup[\s\S]*?width:168px/);

console.log('Pricing header reuses the responsive Home lockup in dark and light themes');
