const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const theme = fs.readFileSync(path.join(root, 'css', 'theme.css'), 'utf8');
const landing = fs.readFileSync(path.join(root, 'js', 'public-landing.js'), 'utf8');
const ui = fs.readFileSync(path.join(root, 'js', 'ui.js'), 'utf8');

assert.match(index, /<section id="auth" class="auth">[\s\S]*?<a class="auth-home-link" href="\/\?view=home">[\s\S]*?ph ph-arrow-left[\s\S]*?<span>Back to Home<\/span>/);
assert.match(index, /href="css\/theme\.css\?v=504"/);
assert.match(index, /src="js\/public-landing\.js\?v=532"/);
assert.match(index, /src="js\/ui\.js\?v=510"/);
assert.match(landing, /if\(requestedView==='home'\)[\s\S]*?__atsrsSuppressAutomaticSessionOpen=true[\s\S]*?history\.replaceState[\s\S]*?showLanding\(\)[\s\S]*?return/);
assert.match(ui, /function publicLandingVisible\(\)[\s\S]*?atsrs-public-view[\s\S]*?!landing\.classList\.contains\('hidden'\)/);
assert.match(ui, /function syncBodyState\(\)[\s\S]*?if\(publicLandingVisible\(\)\)[\s\S]*?classList\.remove\('app-open','auth-open'\)[\s\S]*?return/);
assert.match(theme, /#auth:not\(\.hidden\) \.auth-card\{[\s\S]*?min-height:328px!important/);
assert.match(theme, /#auth \.auth-home-link\{[\s\S]*?min-height:44px/);
assert.match(theme, /#auth \.auth-home-link\{[\s\S]*?border:0;[\s\S]*?background:transparent;[\s\S]*?backdrop-filter:none/);
assert.match(theme, /#auth \.auth-home-link:focus-visible\{[\s\S]*?outline:0;[\s\S]*?text-decoration:underline/);
assert.match(theme, /@media\(max-width:420px\)\{[\s\S]*?#auth:not\(\.hidden\) \.auth-card\{[\s\S]*?min-height:408px!important/);

console.log('Login stability and Home navigation contracts passed');
