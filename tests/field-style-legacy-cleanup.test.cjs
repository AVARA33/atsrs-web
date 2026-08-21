const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

const base = read('css/base.css');
const login = read('css/login.css');
const projects = read('css/projects.css');
const talent = read('css/talent-directory.css');
const shell = read('css/shell-polish.css');
const workspace = read('css/workspace-control-standard-v522.css');
const runtime = read('js/floating-fields.js');

assert.doesNotMatch(base, /input:focus,select:focus,textarea:focus/);
assert.doesNotMatch(base, /select:not\(\[multiple\]\):hover/);
assert.doesNotMatch(login, /#profilePage input,#profilePage select/);
assert.doesNotMatch(projects, /\.projects-toolbar input:focus/);
assert.doesNotMatch(talent, /\.talent-searchbar input:focus/);
assert.doesNotMatch(talent, /\.personnel-filterbar input:hover/);
assert.doesNotMatch(shell, /\.phone-field:focus-within/);
assert.doesNotMatch(workspace, /\.phone-field:focus-within/);
assert.doesNotMatch(runtime, /--atsrs-field-label-surface/);

console.log('Known legacy field cascade paths removed');
