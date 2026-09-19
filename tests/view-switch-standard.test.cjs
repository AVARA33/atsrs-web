const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const jobs = fs.readFileSync(path.join(root, 'js', 'jobs-prototype.js'), 'utf8');
const talent = fs.readFileSync(path.join(root, 'js', 'talent-directory.js'), 'utf8');
const projects = fs.readFileSync(path.join(root, 'js', 'projects.js'), 'utf8');

test('directory workspaces use card view only', () => {
  assert.doesNotMatch(html, /class="talent-view-switch|data-(?:jobs|candidate|personnel|project)-view=/);
  assert.doesNotMatch(jobs, /atsrs_jobs_view|data-jobs-view/);
  assert.doesNotMatch(talent, /atsrs_(?:candidate|personnel)_view|data-(?:candidate|personnel)-view/);
  assert.doesNotMatch(projects, /atsrs_project_view|data-project-view/);
  assert.match(jobs, /grid\.classList\.add\('jobs-cards'\)/);
  assert.match(talent, /var candidateView='cards';/);
  assert.match(talent, /var personnelView='cards';/);
  assert.match(projects, /list\.classList\.remove\('is-list'\)/);
});
