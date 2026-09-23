const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const jobs = fs.readFileSync('js/jobs-prototype.js', 'utf8');
const css = fs.readFileSync('css/jobs-prototype.css', 'utf8');

test('passive recruiter details stay with vacancy information above the action footer', () => {
  assert.match(jobs, /job-recruiter-info job-card-recruiter-meta/);
  assert.match(jobs, /if\(recruiterMeta\.childElementCount\)project\.append\(recruiterMeta\)/);
  assert.match(css, /\.jobs-cards \.job-card-recruiter-meta\{margin-top:6px\}/);
});

test('the separated footer contains only actionable contact controls for full access', () => {
  assert.match(jobs, /job-recruiter-info job-contact-actions/);
  assert.match(jobs, /if\(actions\.childElementCount\)c\.append\(actions\)/);
  assert.doesNotMatch(jobs, /c\.append\(contacts\)/);
});

test('collapsed cards explain how to open the full vacancy above the action divider', () => {
  assert.match(jobs, /job-card-expand-hint',uiText\('For more info, please expand the card\.'\)/);
  assert.match(jobs, /a\.append\(head,controls,body,expandHint,c\)/);
  assert.match(css, /\.jobs-cards \.job-card-expand-hint\{display:block;align-self:end\}/);
});
