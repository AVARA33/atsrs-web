const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const script = fs.readFileSync(path.join(root, 'js', 'sage-ledger.js'), 'utf8');
const styles = fs.readFileSync(path.join(root, 'css', 'sage-ledger.css'), 'utf8');

assert.match(script, /bell\.classList\.remove\('hidden'\)/, 'notification bell must be visible in Personal and Corporate accounts');
assert.doesNotMatch(script, /bell\.classList\.toggle\('hidden',!companyMode\(\)\)/, 'notification bell must not be restricted to Corporate accounts');
assert.match(script, /controls&&theme&&appVisible/, 'Sage header controls must only decorate the open app');
assert.match(script, /if\(bell\)bell\.classList\.add\('hidden'\)/, 'notification bell must remain hidden on auth');
assert.match(script, /restoreAuthThemeTrack\(theme\)/, 'logging out must restore the original auth slider');
assert.match(script, /dataset\.theme==='dark'\?'sun':'moon'/, 'dark mode must show the sun and light mode must show the moon');
assert.match(script, /MutationObserver\(decorateHeader\)\.observe\(app,\{attributes:true,attributeFilter:\['class'\]\}\)/, 'header controls must react when auth changes to the open app');
assert.match(script, /var avatarImage=avatar\.querySelector\('img'\)/, 'header decoration must detect an existing profile photo');
assert.match(script, /if\(!avatarImage\)\{[\s\S]*?avatar\.textContent=value/, 'initials must only be rendered when no profile photo exists');
assert.doesNotMatch(script, /avatar\.textContent!==value\|\|avatar\.children\.length/, 'header decoration must never replace an existing profile photo with initials');
assert.match(styles, /@media\(max-width:800px\)[\s\S]*?\.sage-header-icon-button\{display:grid!important\}/, 'mobile header must retain the notification control');

console.log('Header controls shared-account contracts passed');
