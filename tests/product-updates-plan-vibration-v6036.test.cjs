const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const css = fs.readFileSync(path.join(root, 'css/product-updates-atlas-v6010.css'), 'utf8');
const js = fs.readFileSync(path.join(root, 'js/product-updates-atlas-v6004.js'), 'utf8');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

assert.match(html, /product-updates-atlas-v6010\.css\?v=6036/);
assert.match(html, /product-updates-atlas-v6004\.js\?v=6036/);
assert.match(css, /\.atlas-plan-card::after\{content:none!important;display:none!important\}/);
assert.match(css, /\.atlas-plan-card\.is-vibrating\{animation:atlasPlanVibrate 2s ease-in-out 1 both\}/);
assert.match(css, /@keyframes atlasPlanVibrate/);
assert.doesNotMatch(css, /atlasPlanShine/);
assert.match(js, /planVibrationTimer=setTimeout\(function\(\)\{/);
assert.match(js, /\},4000\);/);
assert.match(js, /planVibrationEndTimer=setTimeout\(function\(\).*\},2000\);/);
assert.match(js, /schedulePlanVibration\(activeCard,reduceMotion\)/);

console.log('Product Updates plan vibration timing verified.');
