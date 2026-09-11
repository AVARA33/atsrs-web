const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const sql = fs.readFileSync(path.join(__dirname, '..', 'supabase', 'migrations', '20260911100149_prioritize_rov_for_remainder_of_day.sql'), 'utf8');

test('temporary ROV-only mode expires automatically at Baku midnight', () => {
  assert.match(sql, /priority_until > now\(\)/);
  assert.match(sql, /cfg\.priority_specialty is null or q\.specialty=cfg\.priority_specialty/);
  assert.match(sql, /priority_specialty = 'rov_roc'/);
  assert.match(sql, /timestamp '2026-09-12 00:00:00' at time zone 'Asia\/Baku'/);
});
