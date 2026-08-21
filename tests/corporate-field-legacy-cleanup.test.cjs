const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

const account = read('css/account.css');
const personnel = read('css/talent-directory.css');
const projects = read('css/projects.css');
const shellPolish = read('css/shell-polish.css');
const shared = read('css/floating-field-standard-v58178.css');
const index = read('index.html');

test('Corporate Documents and Company fields no longer override the shared visual system', () => {
  assert.match(account, /#certificatesPage \.atsrs-document-filter input\{width:100%;max-width:none!important;\}/);
  assert.doesNotMatch(account, /#certificatesPage \.atsrs-document-filter input\{[^}]*background:/);
  assert.doesNotMatch(account, /#profilePage select\s*\{/);
});

test('Personnel fields retain layout only and remove legacy colors and focus rings', () => {
  assert.match(personnel, /\.personnel-filterbar input,\.personnel-filterbar select\{width:100%\}/);
  assert.doesNotMatch(personnel, /\.personnel-filterbar[^}]*#091522/);
  assert.doesNotMatch(personnel, /\.personnel-filterbar[^}]*#26394c/);
  assert.doesNotMatch(personnel, /\.personnel-filterbar[^}]*#4e7187/);
  assert.doesNotMatch(personnel, /\.personnel-select-shell>select\{border-radius/);
});

test('Projects fields retain layout only and remove dark and light legacy visuals', () => {
  assert.match(projects, /\.projects-toolbar input,[^{]+\{width:100%\}/);
  assert.doesNotMatch(projects, /\.projects-toolbar[^}]*#091522/);
  assert.doesNotMatch(projects, /\.projects-toolbar[^}]*#294055/);
  assert.doesNotMatch(projects, /\.projects-toolbar[^}]*#6f8ea2/);
  assert.doesNotMatch(projects, /html\[data-theme="light"\] \.projects-toolbar input[^}]*background:#fff/);
});

test('legacy global select focus ring is removed and shared shells cover Corporate routes', () => {
  assert.doesNotMatch(shellPolish, /#app\.app:not\(\.hidden\) select:focus/);
  assert.match(shared, /#candidatesPage,#personnelPage,#projectsPage/);
  assert.match(shared, /\.atsrs-field-shell[\s\S]*:focus-visible\{[\s\S]*box-shadow:none!important;/);
});

test('changed stylesheets use fresh production cache markers', () => {
  assert.match(index, /css\/account\.css\?v=426/);
  assert.match(index, /css\/talent-directory\.css\?v=576/);
  assert.match(index, /css\/projects\.css\?v=504/);
  assert.match(index, /css\/shell-polish\.css\?v=58163/);
  assert.match(index, /css\/floating-field-standard-v58178\.css\?v=5852/);
});
