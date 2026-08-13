const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');

const root = path.resolve(__dirname, '..');
const calm = fs.readFileSync(path.join(root, 'css', 'calm-actions.css'), 'utf8');
const references = fs.readFileSync(path.join(root, 'css', 'references.css'), 'utf8');
const account = fs.readFileSync(path.join(root, 'css', 'account.css'), 'utf8');
const base = fs.readFileSync(path.join(root, 'css', 'base.css'), 'utf8');
const theme = fs.readFileSync(path.join(root, 'css', 'theme.css'), 'utf8');
const themeRuntime = fs.readFileSync(path.join(root, 'js', 'theme.js'), 'utf8');
const palette = fs.readFileSync(path.join(root, 'css', 'theme-palette-v508.css'), 'utf8');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

const globalControlRule = calm.match(/button,\s*\ninput\[type="button"\],\s*\ninput\[type="submit"\]\s*\{([\s\S]*?)\n\}/);
assert.ok(globalControlRule, 'global action control rule must exist');
assert.match(globalControlRule[1], /transition:background-color \.14s ease,border-color \.14s ease,box-shadow \.14s ease!important/);
assert.doesNotMatch(globalControlRule[1], /(?:transition:|,)color\s/, 'text color must not animate');
assert.doesNotMatch(globalControlRule[1], /(?:transition:|,)opacity\s/, 'opacity must not animate');

const filterRule = references.match(/#refsPage \.atsrs-v134-filter\{([\s\S]*?)\n\}/);
assert.ok(filterRule, 'References sort control rule must exist');
assert.match(filterRule[1], /min-width:132px!important/);
assert.match(filterRule[1], /padding:6px 30px 6px 10px!important/);
assert.match(filterRule[1], /flex:0 0 132px!important/);
assert.doesNotMatch(filterRule[1], /(?:transition:|,)color\s/, 'sort control text color must not animate');
assert.doesNotMatch(filterRule[1], /(?:transition:|,)opacity\s/, 'sort control opacity must not animate');

const finalFilterRule = account.match(/#refsPage \.atsrs-v134-filter,\s*\n#refsPage \.atsrs-v134-filter\.active\{([\s\S]*?)\n\}/);
assert.ok(finalFilterRule, 'final References sort override must exist');
assert.match(finalFilterRule[1], /width:132px!important/);
assert.match(finalFilterRule[1], /min-width:132px!important/);
assert.match(finalFilterRule[1], /padding:5px 30px 5px 10px!important/);
assert.match(finalFilterRule[1], /flex:0 0 132px!important/);

assert.match(html, /css\/references\.css\?v=408/);
assert.match(html, /css\/calm-actions\.css\?v=408/);
assert.match(theme, /--atsrs-canvas-dark:#04101d/,'one canonical dark canvas token must exist');
assert.match(theme, /--sidebar-accent:#22c55e;[\s\S]*?--loading-accent:var\(--sidebar-accent\)/,'dark loading accent must inherit the green sidebar accent');
assert.match(palette, /--sidebar-accent:var\(--brand-cyan\);[\s\S]*?--loading-accent:var\(--brand-cyan\)/,'Glass loading accent must use the cyan brand token');
assert.match(base, /\.atsrs-spinner span\s*\{[\s\S]*?background:var\(--loading-accent\)/,'all shared spinner segments must use the loading accent token');
assert.doesNotMatch(base, /\.atsrs-spinner span\s*\{[\s\S]*?background:#(?:22c55e|16a34a)/,'spinner segments must not hard-code an accent');
assert.equal((html.match(/class="atsrs-spinner"/g)||[]).length,1,'boot uses the animated logo while shared-profile loading keeps the shared spinner');
assert.match(theme, /html:not\(\[data-theme="light"\]\) #auth\.auth,[\s\S]*?#atsrsBootScreen\s*\{[\s\S]*?background-color:var\(--atsrs-canvas-dark\)!important;[\s\S]*?background-image:none!important/,'auth, boot and app canvases must use the canonical token without gradients');
assert.match(theme, /html:not\(\[data-theme="light"\]\) #app\.app > \.main > section\s*\{[\s\S]*?background-color:transparent!important;[\s\S]*?background-image:none!important/,'route canvases must inherit the canonical dark canvas');
assert.match(theme, /html:not\(\[data-theme="light"\]\) #auth\.auth::before\s*\{[\s\S]*?background:none!important/,'dark auth glow pseudo-element must be disabled');
assert.match(palette, /#auth\.auth::before\{background:radial-gradient/,'Glass auth theme keeps a restrained cyan reflection');
assert.match(themeRuntime, /theme==='light'\?'#03101a':'#050606'/,'runtime theme colour must match the protected Dark and Glass canvases');
assert.match(html, /html\{background:#050606\}/,'initial paint must match the protected Dark canvas');
assert.match(html, /css\/theme\.css\?v=517/);
assert.match(html, /css\/base\.css\?v=408/);
assert.match(html, /css\/account\.css\?v=517/);
assert.match(html, /js\/theme\.js\?v=517/);

console.log('References visual regression contracts passed');
