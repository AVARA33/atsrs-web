const assert = require('node:assert/strict');
const fs = require('node:fs');

const index = fs.readFileSync('index.html', 'utf8');
const sharing = fs.readFileSync('js/share-profile.js', 'utf8');
const edge = fs.readFileSync('supabase/functions/share-profile/index.ts', 'utf8');

assert.match(index, /js\/share-profile\.js\?v=443/);
assert.match(sharing, /Confidentiality note:/);
assert.match(sharing, /keep them confidential, use them only for that purpose/);
assert.match(sharing, /do not share them with anyone else without the document owner/);
assert.match(sharing, /confidentialityNotice\+'\\n\\nKind regards,'/);

assert.match(edge, /const CONFIDENTIALITY_NOTICE =/);
assert.match(edge, /Open shared files:[^`]*CONFIDENTIALITY_NOTICE/s);
assert.match(edge, /escapeHtml\(CONFIDENTIALITY_NOTICE\)/);

console.log('Share-link email confidentiality notice contracts passed');
