const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { pathToFileURL } = require('node:url');

const root = path.resolve(__dirname, '..');
const dates = require(path.join(root, 'js', 'document-date-validation.js'));
const fixtures = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'document-date-validation.json'), 'utf8'));
const app = fs.readFileSync(path.join(root, 'js', 'app.js'), 'utf8');
const edge = fs.readFileSync(path.join(root, 'supabase', 'functions', 'scan-document', 'index.ts'), 'utf8');

for (const fixture of fixtures) {
  test(fixture.name, () => {
    const result = dates.validate(fixture.input);
    if (fixture.expected.issue_date !== undefined) assert.equal(result.issue_date, fixture.expected.issue_date);
    assert.equal(result.expiry_date, fixture.expected.expiry_date);
    assert.equal(result.date_validation.status, fixture.expected.status);
    if (fixture.expected.conflict) assert.ok(result.date_validation.conflicts.some((item) => item.code === fixture.expected.conflict));
    if (fixture.expected.derived) assert.equal(result.date_validation.derived_expiry_date, fixture.expected.derived);
  });
}

test('DD.MM.YYYY versus MM.DD.YYYY ambiguity is detected and not guessed', () => {
  const parsed = dates.parseRawDate('06.07.2026');
  assert.equal(parsed.ambiguous, true);
  assert.deepEqual(parsed.candidates, ['2026-07-06', '2026-06-07']);
  assert.equal(parsed.normalized, '');
  const result = dates.validate({issue_date:'2026-07-06',expiry_date:'2027-06-07',warnings:[],date_evidence:[{field:'expiry_date',source_label:'Expires',raw_text:'06.07.2027',normalized_value:''}]});
  assert.equal(result.expiry_date, '');
  assert.equal(result.date_validation.status, 'review_required');
});

test('unambiguous numeric dates normalize deterministically', () => {
  assert.equal(dates.parseRawDate('31.01.2026').normalized, '2026-01-31');
  assert.equal(dates.parseRawDate('01/31/2026').normalized, '2026-01-31');
});

test('duration arithmetic clamps leap and end-of-month dates', () => {
  assert.equal(dates.addDuration('2024-02-29', 1, 'years'), '2025-02-28');
  assert.equal(dates.addDuration('2026-01-31', 1, 'months'), '2026-02-28');
  assert.equal(dates.addDuration('2024-01-31', 1, 'months'), '2024-02-29');
});

test('backend and frontend both enforce the validation boundary without auth changes', () => {
  assert.match(edge, /validateExtractedDocumentDates\(extracted\)/);
  assert.match(edge, /date_evidence/);
  assert.match(edge, /validity_duration/);
  assert.match(app, /atsrsDocumentDateValidation\.validate\(documentData\)/);
  assert.match(app, /Date validation was unavailable[\s\S]*blocked_fields:\['expiry_date'\]/);
  assert.match(app, /Conflicting date values were left blank/);
  assert.match(edge, /supabase\.auth\.getUser\(token\)/);
  assert.match(edge, /atsrs_reserve_ai_scan/);
  assert.match(edge, /MAX_FILE_BYTES = 15 \* 1024 \* 1024/);
});

test('frontend revalidation preserves an already blocked backend conflict', () => {
  const once = dates.validate(fixtures[0].input);
  const twice = dates.validate(once);
  assert.equal(twice.expiry_date, '');
  assert.equal(twice.date_validation.status, 'review_required');
  assert.ok(twice.date_validation.conflicts.some((item) => item.code === 'duration_conflict'));
});

test('Supabase validator matches the browser contract for every deterministic fixture', async () => {
  const backend = await import(pathToFileURL(path.join(root, 'supabase', 'functions', '_shared', 'document-date-validation.ts')));
  for (const fixture of fixtures) {
    const browserResult = dates.validate(fixture.input);
    const edgeResult = backend.validateExtractedDocumentDates(fixture.input);
    assert.deepEqual(edgeResult, browserResult, fixture.name);
  }
  assert.deepEqual(backend.parseRawDate('06.07.2026'), dates.parseRawDate('06.07.2026'));
  assert.equal(backend.addDuration('2024-02-29', 1, 'years'), '2025-02-28');
  assert.equal(backend.addDuration('2026-01-31', 1, 'months'), '2026-02-28');
});
