const assert = require('node:assert/strict');
const fs = require('node:fs');

const index = fs.readFileSync('index.html', 'utf8');
const recruiters = fs.readFileSync('js/recruiters.js', 'utf8');
const sharing = fs.readFileSync('js/share-profile.js', 'utf8');
const sharingUi = fs.readFileSync('js/profile-sharing-v1.js', 'utf8');
const edge = fs.readFileSync('supabase/functions/share-profile/index.ts', 'utf8');
const migration = fs.readFileSync('supabase/migrations/20260829031507_recruiter_email_sharing.sql', 'utf8');
const serviceGrant = fs.readFileSync('supabase/migrations/20260829033000_grant_recruiter_email_share_service_access.sql', 'utf8');
const activeShareInvariant = fs.readFileSync('supabase/migrations/20260829035000_unique_active_recruiter_profile_share.sql', 'utf8');

assert.match(index, /data-atsrs-build="V5936"/);
assert.match(index, /js\/recruiters\.js\?v=14/);
assert.match(index, /js\/share-profile\.js\?v=432/);
assert.match(index, /js\/profile-sharing-v1\.js\?v=29/);

assert.match(recruiters, /linkedin_url,email_verification_status/);
assert.doesNotMatch(recruiters, /\.select\([^\n]*professional_email/, 'the directory response must not bulk-download recruiter email addresses');
assert.match(recruiters, /email_verification_status === "verified"/);
assert.match(recruiters, /atsrsCreateRecruiterEmailShare/);
assert.match(recruiters, /Preparing 24h link/);
assert.match(recruiters, /Profile shared · 24h active/);
assert.match(recruiters, /atsrsGetActiveRecruiterShares/);
assert.match(recruiters, /atsrs:share-link-updated/);

assert.match(sharing, /action:'create_recruiter_email_share'/);
assert.match(sharing, /The link expires in 24 hours/);
assert.match(sharing, /navigator\.clipboard\.writeText/);
assert.match(sharing, /https:\/\/mail\.google\.com\/mail\//);
assert.match(sharing, /window\.open\(composeUrl,'_blank'\)/);
assert.match(sharing, /else window\.location\.href=composeUrl/);
assert.doesNotMatch(sharing, /mailto:/);
assert.match(sharing, /email_sent:false/);

assert.match(edge, /action === "create_recruiter_email_share"/);
assert.match(edge, /email_verification_status", "verified"/);
assert.match(edge, /24 \* 60 \* 60 \* 1000/);
assert.match(edge, /selected_file_ids: \[\]/);
assert.match(edge, /email_sent: false/);
assert.match(edge, /already_active: true/);
assert.match(edge, /Revoke the active link before sharing again/);

assert.match(migration, /professional_email text/);
assert.match(migration, /recipient_recruiter_id uuid/);
assert.match(migration, /recipient_email text/);
assert.match(serviceGrant, /grant select on table public\.atsrs_recruiters to service_role/);
assert.match(activeShareInvariant, /atsrs_profile_shares_one_enabled_recruiter_idx/);
assert.match(activeShareInvariant, /partition by user_id, account_type, recipient_recruiter_id/);
assert.match(sharingUi, /share\.recipient_name/);
assert.match(sharingUi, /share\.recipient_email/);

console.log('Verified recruiter email share contracts passed');
