import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { verifyCvOwnership } from '../supabase/functions/_shared/cv-ownership.ts';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const edge = fs.readFileSync(path.join(root, 'supabase/functions/generate-cv/index.ts'), 'utf8');
const account = {
  fullName: 'Anar Agasiyev',
  emails: ['anar@example.com'],
  phones: ['+994 55 350 15 15'],
};

assert.deepEqual(verifyCvOwnership(account, {
  full_name: 'Anar Agasiyev', email: 'anar@example.com', phone: '+994553501515', confidence: 'high',
}), { result: 'verified', allow: true, reason: 'name_and_contact_match' });

for (const fullName of ['ANAR AGASIYEV', 'Agasiyev Anar', 'Anar A. Agasiyev', 'Anar Ağasıyev']) {
  const result = verifyCvOwnership(account, { full_name: fullName, email: '', phone: '', confidence: 'high' });
  assert.equal(result.allow, true, `${fullName} must be accepted as the account owner`);
  assert.equal(result.result, 'probable');
}

assert.equal(verifyCvOwnership(account, {
  full_name: 'Anar Agasiyev', email: '', phone: '', confidence: 'medium',
}).allow, true, 'matching name without secondary fields must be allowed');

assert.deepEqual(verifyCvOwnership({ fullName: 'Anar', emails: [], phones: [] }, {
  full_name: 'Anar Smith', email: '', phone: '', confidence: 'high',
}), { result: 'uncertain', allow: false, reason: 'identity_missing' });

assert.deepEqual(verifyCvOwnership(account, {
  full_name: 'John Smith', email: 'john.smith@example.com', phone: '+1 202 555 0101', confidence: 'high',
}), { result: 'mismatch', allow: false, reason: 'identity_mismatch' });

assert.equal(verifyCvOwnership(account, {
  full_name: '', email: '', phone: '', confidence: 'low',
}).allow, false, 'missing identity must enter the safe verification state');

const verifyPosition = edge.lastIndexOf('verifyCvOwnership(');
const quotaPosition = edge.indexOf('atsrs_reserve_ai_cv');
const generationPosition = edge.indexOf('name: "atsrs_profile_cv"');
assert.ok(verifyPosition > 0 && verifyPosition < quotaPosition, 'ownership must be enforced before quota reservation');
assert.ok(verifyPosition < generationPosition, 'ownership must be enforced before CV generation');
assert.match(edge, /if \(!temporaryPath\)[\s\S]*?Upload a CV from the AI CV card/);
assert.match(edge, /if \(!ownership\.allow\)[\s\S]*?identity_mismatch/);
assert.doesNotMatch(edge, /latest CV|most recently uploaded/i);

console.log('CV ownership verification contracts passed');
