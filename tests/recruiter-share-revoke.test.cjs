const assert = require('node:assert/strict');
const fs = require('node:fs');

const index = fs.readFileSync('index.html', 'utf8');
const share = fs.readFileSync('js/share-profile.js', 'utf8');
const history = fs.readFileSync('js/profile-sharing-v1.js', 'utf8');
const edge = fs.readFileSync('supabase/functions/share-profile/index.ts', 'utf8');
const migration = fs.readFileSync('supabase/migrations/20260829045619_add_profile_share_revoked_at.sql', 'utf8');

assert.match(index, /data-atsrs-build="V5940"/);
assert.match(index, />Share history</);
assert.match(share, /No email will be sent/);
assert.match(share, /no email was sent/);
assert.match(share, /await refreshOwnerPanel\(\{force:true\}\)/);
assert.match(history, /window\.atsrsGetShares/);
assert.match(history, /state==='revoked'\?'Revoked':'Inactive'/);
assert.match(history, /share\.revoked_at\|\|share\.updated_at/);

const revokeStart = edge.indexOf('if (action === "revoke")');
const revokeEnd = edge.indexOf('if (action === "decide_request")', revokeStart);
assert.ok(revokeStart >= 0 && revokeEnd > revokeStart, 'revoke branch must exist');
const revokeBranch = edge.slice(revokeStart, revokeEnd);
assert.match(revokeBranch, /enabled: false/);
assert.match(revokeBranch, /revoked_at: now/);
assert.match(revokeBranch, /email_sent: false/);
assert.match(revokeBranch, /recipient_notified: false/);
assert.doesNotMatch(revokeBranch, /sendEmail\(/, 'revoke must not send an email automatically');
assert.match(edge, /row\.revoked_at \? "revoked" : expired \? "expired" : "inactive"/);
assert.match(edge, /revoked_at: row\.revoked_at/);
assert.match(migration, /add column if not exists revoked_at timestamptz/);

console.log('Recruiter share revoke contracts passed');
