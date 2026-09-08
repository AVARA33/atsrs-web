const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const context = {window: {}};
vm.createContext(context);
vm.runInContext(fs.readFileSync('js/locale-az.js', 'utf8'), context);
vm.runInContext(fs.readFileSync('js/legal-az-content.js', 'utf8'), context);
const messages = context.window.ATSRS_AZ_MESSAGES;
const legalPages = ['faq.html','terms.html','billing-terms.html','refund-policy.html','data-protection.html','data-deletion.html','security.html'];

function visibleTexts(file) {
  return fs.readFileSync(file, 'utf8')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .match(/>([^<>]+)</g)
    .map(value => value.slice(1, -1).replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/\s+/g, ' ').trim())
    .filter(value => value && /[A-Za-z]{3}/.test(value) && !/@|VÖEN|AZ1095/.test(value));
}

for (const page of legalPages) {
  assert.match(fs.readFileSync(page, 'utf8'), /js\/legal-az-content\.js\?v=3/);
  const missing = [...new Set(visibleTexts(page).filter(text => !Object.hasOwn(messages, text)))];
  assert.deepEqual(missing, [], `${page} has untranslated visible strings: ${missing.join(' | ')}`);
}

for (const key of ['Developer','Registered accounts','Time remaining','Notifications','No new notifications.','Available from a date','Not specified']) {
  assert.ok(messages[key], `missing Azerbaijani UI translation: ${key}`);
}

console.log('Azerbaijani localization completeness checks passed.');
