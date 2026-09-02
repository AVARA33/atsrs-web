import test from 'node:test';
import assert from 'node:assert/strict';
import {clean,postingUrl,checkDetail,usageCost,verifiedClassification,sourceContent} from '../supabase/functions/job-ingestion/policy.mjs';
test('additional salary, shifts and relocation facts are retained without AI rewriting',()=>{
 const r=sourceContent({jobDescription:{text:'<p>Review laboratory records.</p>'},additionalInformation:{text:'<p>$18–$20 per hour.</p><p>Relocation to Mississauga expected in 2026.</p><p>Monday–Friday 8am–5pm.</p>'},qualifications:{text:'<p>HS diploma.</p>'}});
 assert.equal(r.error,null);
 assert.ok(r.description.includes('$18–$20 per hour.'));
 assert.ok(r.description.includes('Relocation to Mississauga expected in 2026.'));
 assert.ok(r.description.includes('Monday–Friday 8am–5pm.'));
 assert.equal(r.requirements,'HS diploma.');
});
test('oversized source is sent to review rather than silently losing facts',()=>{
 assert.ok(sourceContent({jobDescription:{text:'a'.repeat(11990)},additionalInformation:{text:'Critical salary and location information.'}}).error);
 assert.ok(sourceContent({qualifications:{text:'x'.repeat(12001)}}).error);
 assert.equal(sourceContent({jobDescription:{text:'Plain job.'}}).description,'Plain job.');
});
test('URL identity is pinned to the official board and job, never a homepage',()=>{
 assert.ok(postingUrl('https://jobs.smartrecruiters.com/Test/123-title?oga=true','Test','123'));
 for(const url of ['http://jobs.smartrecruiters.com/Test/123-title','https://evil.com/Test/123-title','https://jobs.smartrecruiters.com/','https://jobs.smartrecruiters.com/Other/123-title','https://jobs.smartrecruiters.com/Test/1234-title'])assert.equal(postingUrl(url,'Test','123'),false);
});
test('facts remain source text; invented summaries are rejected',()=>{
 const text='Build reliable systems and maintain the existing services for our customers.';
 assert.ok(verifiedClassification({is_vacancy:true,summary_quote:text},text));
 assert.equal(verifiedClassification({is_vacancy:true,summary_quote:'Excellent salary and relocation support provided'},text),false);
 assert.equal(verifiedClassification({is_vacancy:false,summary_quote:text},text),false);
 assert.equal(clean('<p>A &amp; B</p><script>evil()</script>'),'A & B');
});
test('closed, private or wrong-source postings cannot publish',()=>{
 const d={id:'123',company:{identifier:'Test',name:'Test'},name:'Engineer',active:true,visibility:'PUBLIC',postingUrl:'https://jobs.smartrecruiters.com/Test/123-title',applyUrl:'https://jobs.smartrecruiters.com/Test/123-title?oga=true',location:{city:'London'},jobAd:{sections:{jobDescription:{text:'A'.repeat(100)}}}};
 assert.equal(checkDetail(d,'Test','123'),null);
 assert.ok(checkDetail({...d,active:false},'Test','123'));
 assert.ok(checkDetail({...d,visibility:'PRIVATE'},'Test','123'));
 assert.ok(checkDetail({...d,id:'456'},'Test','123'));
});
test('pricing includes cached tokens; worst bounded request is below reservation',()=>{
 assert.equal(usageCost(1000000,0,1000000),1.45);
 assert.equal(usageCost(1000000,1000000,0),.02);
 // 16K input bytes + conservative instruction/schema overhead; no tools/images.
 assert.ok(usageCost(20000,0,1000)<.02);
});
