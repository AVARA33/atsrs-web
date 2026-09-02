const assert=require('node:assert/strict');
const fs=require('node:fs');
const html=fs.readFileSync('index.html','utf8');
assert.doesNotMatch(html,/id="cvBetaBadge"/);
assert.equal((html.match(/id="cvBetaTitle"/g)||[]).length,1);
assert.match(html,/<h4 id="cvBetaTitle">AI CV Generator<\/h4>/);
console.log('References AI card has a single heading');
