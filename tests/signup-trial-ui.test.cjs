const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const root=path.resolve(__dirname,'..');
const index=fs.readFileSync(path.join(root,'index.html'),'utf8');
const pricing=fs.readFileSync(path.join(root,'pricing.html'),'utf8');
const storage=fs.readFileSync(path.join(root,'js/storage.js'),'utf8');
const dashboard=fs.readFileSync(path.join(root,'js/executive-dashboard-v5858.js'),'utf8');

assert.doesNotMatch(index,/Start 7-day trial/i,'The public entry must expose login only while registration is managed separately.');
assert.match(pricing,/automatically returns to Free[\s\S]+?No card and no automatic charge/i,'Pricing must disclose what happens after the trial.');
assert.match(storage,/Confirm your email to start your 7-day full-access trial/i,'Email signups must explain when the trial starts.');
assert.match(dashboard,/c\.rpc\('atsrs_my_personal_trial'\)/i,'The signed-in dashboard must load authoritative trial state.');
assert.match(dashboard,/trialDays[\s\S]+?day[\s\S]+?left · then Free/i,'The dashboard must show remaining trial time and the automatic fallback.');
assert.doesNotMatch(index,/Create Free Account/i,'The public entry must not expose an alternate registration CTA.');

console.log('signup-trial-ui: PASS');
