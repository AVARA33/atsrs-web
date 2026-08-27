const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const root=path.resolve(__dirname,'..');
const index=fs.readFileSync(path.join(root,'index.html'),'utf8');
const pricing=fs.readFileSync(path.join(root,'pricing.html'),'utf8');
const storage=fs.readFileSync(path.join(root,'js/storage.js'),'utf8');
const dashboard=fs.readFileSync(path.join(root,'js/executive-dashboard-v5858.js'),'utf8');

assert.doesNotMatch(index,/Start 7-day trial/i,'The public entry must use the pre-trial Free account wording.');
assert.doesNotMatch(pricing,/7-day trial|1-month trial|automatically returns to Free/i,'Pricing must use the pre-trial Free account wording.');
assert.match(storage,/Account created\. Confirmation email sent\. Check inbox\/spam\./i,'Email signup must use the pre-trial confirmation message.');
assert.doesNotMatch(dashboard,/atsrs_my_personal_trial/i,'The dashboard must not show trial state.');
assert.match(index,/Create Free Account/i,'The pre-trial public entry must restore the normal Free account CTA.');

console.log('signup-trial-ui: PASS');
