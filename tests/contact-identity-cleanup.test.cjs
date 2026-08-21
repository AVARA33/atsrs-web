const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const root=path.resolve(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const publicPages=['index.html','pricing.html','privacy.html','data-deletion.html','data-protection.html','security.html','terms.html','billing-terms.html','refund-policy.html','contact.html'];

test('user-facing ATSRS pages contain no owner Gmail address',()=>{
  publicPages.forEach(file=>assert.doesNotMatch(read(file),/anaragasiyev@gmail\.com|myxmiboxs@gmail\.com/i,file));
});

test('official ATSRS contact identity is centralized',()=>{
  const config=read('js/contact-config.js');
  assert.match(config,/var primaryMailbox='hello@atsrs\.com'/);
  ['general','support','privacy','security','billing','legal'].forEach(role=>{
    assert.match(config,new RegExp(`${role}:Object\\.freeze\\(\\{email:primaryMailbox,subject:`));
  });
  ['privacy.html','data-deletion.html','security.html'].forEach(file=>{
    const html=read(file);
    assert.match(html,/js\/contact-config\.js\?v=5850/);
    assert.doesNotMatch(html,/mailto:/);
  });
});

test('Contact page uses the shared field system and honest mailto submission',()=>{
  const html=read('contact.html');
  const runtime=read('js/contact-page.js');
  assert.match(html,/<h1>Contact ATSRS<\/h1>/);
  assert.match(html,/floating-field-standard-v58178\.css\?v=58206/);
  assert.match(html,/js\/floating-fields\.js\?v=58186/);
  assert.match(html,/id="contactForm"/);
  assert.match(html,/Open email application/);
  assert.match(html,/ATSRS does not store or claim to submit the message/);
  assert.match(runtime,/window\.location\.href='mailto:'/);
  assert.doesNotMatch(runtime,/fetch\(|supabase|successfully sent|message sent/i);
});

test('Contact is present in every public footer and public navigation',()=>{
  publicPages.forEach(file=>{
    const html=read(file);
    assert.match(html,/<a href="contact\.html"[^>]*>Contact<\/a>/,file);
    assert.equal((html.match(/public-footer-legal/g)||[]).length,1,file);
  });
  assert.match(read('sitemap.xml'),/https:\/\/atsrs\.com\/contact\.html/);
  assert.match(read('llms.txt'),/Contact ATSRS/);
});

test('transactional and test-only email identities remain untouched',()=>{
  assert.match(read('supabase/functions/recipient-share/index.ts'),/notifications@notify\.atsrs\.com/);
  assert.match(read('js/dashboard.js'),/local-test@atsrs\.com/);
});
