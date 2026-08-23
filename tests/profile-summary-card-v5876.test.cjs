const fs=require('fs');const assert=require('assert');
const html=fs.readFileSync('index.html','utf8'),css=fs.readFileSync('css/profile-summary-card-v5876.css','utf8'),js=fs.readFileSync('js/dashboard.js','utf8');
['profileSummaryName','profileSummaryEmail','profileSummaryPhone','profileSummaryLocation','profileSummaryWorkplace','profileSummaryMemberSince','profileSummaryLastLogin','profileSummaryProgress','profileSummaryEditBtn'].forEach(id=>assert(html.includes(`id="${id}"`),`missing ${id}`));
assert(css.includes('grid-template-columns:minmax(0,2fr) minmax(280px,1fr)'),'right-hand slot is not reserved');
assert(css.includes('@media(max-width:720px)'),'responsive card rule missing');
assert(js.includes('updateProfileSummary(p)'),'profile summary is not connected to loaded profile data');
assert(js.includes('user.created_at')&&js.includes('user.last_sign_in_at'),'server-backed account dates missing');
console.log('Personal Profile summary card contracts passed');
