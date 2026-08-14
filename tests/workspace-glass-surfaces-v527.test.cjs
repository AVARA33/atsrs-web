const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const index = read('index.html');
const css = read('css/workspace-glass-surfaces-v527.css');
const harness = read('tests/fixtures/workspace-glass-surfaces-v527-harness.html');

assert.match(index, /data-atsrs-build="V527"/);
assert.match(index, /workspace-glass-surfaces-v527\.css\?v=527/);
assert.match(css, /--atsrs-glass-canvas:#cbd4df/);
assert.match(css, /--atsrs-glass-canvas:#08101b/);
assert.match(css, /--atsrs-glass-accent:#55a2f4/);
assert.match(css, /rgba\(255,255,255,\.34\)/);
assert.match(css, /rgba\(25,33,47,\.72\)/);
assert.match(css, /backdrop-filter:blur\(var\(--atsrs-glass-blur\)\) saturate\(125%\)/);
assert.match(css, /body:where\(\.personal-mode,\.company-mode\)/);
assert.doesNotMatch(css, /#landingPage|#auth|#atsrsBootScreen/);
assert.match(css, /@supports not/);
assert.match(harness, /id="themeToggle"/);

console.log('V527 measured workspace glass surface contracts passed');
