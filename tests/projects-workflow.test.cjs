const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const storage = fs.readFileSync(path.join(root, 'js', 'storage.js'), 'utf8');
const projects = fs.readFileSync(path.join(root, 'js', 'projects.js'), 'utf8');
const talent = fs.readFileSync(path.join(root, 'js', 'talent-directory.js'), 'utf8');
const shell = fs.readFileSync(path.join(root, 'js', 'shell-polish.js'), 'utf8');

assert.match(html, /id="navProjects"[^>]+company-only/);
assert.match(html, /id="projectsPage"/);
assert.match(html, /id="projectEditorDialog"/);
assert.match(html, /id="projectsFeedback"[^>]+aria-live="polite"/);
assert.match(html, /id="personnelAssignmentDialog"/);
assert.match(html, /id="projectMembersDialog"/);
assert.match(storage, /page==="projects"/);
assert.match(storage, /projects:navProjects/);
assert.match(html, /Project membership does not grant access to private documents/);
assert.match(projects, /atsrsProjectAssignments/);
assert.match(projects, /end date cannot be earlier than its start date/);
assert.match(projects, /assignments\.filter\(isAssignmentActive\)/);
assert.match(projects, /status='ended'|status:\s*'ended'/);
assert.match(storage, /function saveProjects\(d\)\{return writeAppDataKey/);
assert.match(projects, /async function persistProject/);
assert.match(projects, /await window\.atsrsCloudData\.refresh\(\)/);
assert.match(projects, /Project could not be saved/);
assert.match(talent, /data-linked-projects/);
assert.match(talent, /openPersonnelAssignments/);
assert.match(shell, /navProjects:'kanban'/);

console.log('Corporate project workflow contract passed.');
