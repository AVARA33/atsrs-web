const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const client = fs.readFileSync(path.join(root, 'js', 'talent-directory.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'css', 'talent-directory.css'), 'utf8');
const theme = fs.readFileSync(path.join(root, 'css', 'theme.css'), 'utf8');
const workspaceCss = fs.readFileSync(path.join(root, 'css', 'workspace-surface-standard-v519.css'), 'utf8');
const harness = fs.readFileSync(path.join(root, 'tests', 'fixtures', 'personnel-card-action-ownership-harness.html'), 'utf8');

assert.match(index, /data-atsrs-build="V5816"/);
assert.match(index, /css\/talent-directory\.css\?v=575/);
assert.match(index, /css\/theme\.css\?v=58161/);
assert.match(index, /css\/workspace-surface-standard-v519\.css\?v=520/);
assert.match(index, /js\/talent-directory\.js\?v=574/);

const cardBranch = client.slice(
  client.indexOf("if(personnelView==='cards')"),
  client.indexOf("}else{", client.indexOf("if(personnelView==='cards')")),
);

assert.match(cardBranch, /<article class="linked-personnel-card" data-person-id="'\+personId\+'">/,
  'every Personnel card must expose the person that owns it');
assert.match(cardBranch, /<div class="linked-personnel-card-content">[\s\S]*?<\/div>'\+[\s\S]*?<div class="linked-personnel-actions"/,
  'card content and its action bar must be sibling rows inside the same article');
for (const action of ['projects', 'open', 'remove']) {
  assert.match(cardBranch, new RegExp(`data-linked-${action}="'\\+personId\\+'"`),
    `the ${action} action must use its enclosing card's person id`);
}

assert.match(css, /\.linked-personnel-card\{[^}]*display:grid[^}]*grid-template-rows:minmax\(0,1fr\) auto[^}]*overflow:hidden/,
  'the card border must contain both content and actions in normal grid flow');
assert.match(css, /\.linked-personnel-card \.linked-personnel-actions\{[^}]*grid-template-columns:repeat\(3,max-content\)[^}]*justify-content:end[^}]*width:100%/,
  'desktop card actions must remain compact and align to the end of their owner');
assert.match(css, /\.linked-personnel-card \.linked-personnel-actions button\{[^}]*width:auto!important/,
  'desktop card action labels must not stretch into oversized controls');
assert.match(css, /\.linked-personnel-cards\{[^}]*auto-fit[^}]*min\(100%,320px\),440px[^}]*align-items:stretch/,
  'Personnel cards must use a compact responsive width and equal-height grid stretching');
assert.match(css, /\.linked-personnel-card\{[^}]*min-height:200px/,
  'Personnel cards must keep the compact desktop height contract');
assert.match(css, /\.linked-personnel-card \.linked-personnel-actions button\{[^}]*min-height:34px!important/,
  'desktop card actions must use the compact control height');
assert.match(css, /html\[data-theme\] body\.company-mode #app\.app \.linked-personnel-card \.linked-personnel-actions button\{min-height:34px!important\}/,
  'compact Personnel buttons must override the shared 44px workspace control rule');
assert.doesNotMatch(css, /\.linked-personnel-actions\{[^}]*min-width:max-content/,
  'shared action rows must not force overflow beyond their owner');
assert.doesNotMatch(css, /\.linked-personnel-card(?:\s+\.linked-personnel-actions)?\{[^}]*position:absolute/,
  'card actions must never be absolutely positioned outside the card');
assert.match(workspaceCss, /\.linked-personnel-row:not\(\.is-head\) \.linked-personnel-actions button\{/,
  'compact list-view button rules must not leak into card action bars');
assert.match(css, /\.linked-personnel-card \.linked-personnel-actions button:focus-visible\{[^}]*--atsrs-brand-green/,
  'dark card actions must use the ATSRS green focus standard');
assert.match(theme, /html\[data-theme="light"\] body #app \.linked-personnel-card \.linked-personnel-actions button:focus-visible\{[^}]*--atsrs-light-blue/,
  'light card actions must use the ATSRS blue focus standard');

for (const personId of ['person-a', 'person-b', 'person-c']) {
  const card = harness.slice(
    harness.indexOf(`data-person-id="${personId}"`),
    harness.indexOf('</article>', harness.indexOf(`data-person-id="${personId}"`)),
  );
  for (const action of ['projects', 'open', 'remove']) {
    assert.match(card, new RegExp(`data-linked-${action}="${personId}"`),
      `${personId} must own its ${action} control in the QA fixture`);
  }
}

console.log('Personnel card action ownership contracts passed');
