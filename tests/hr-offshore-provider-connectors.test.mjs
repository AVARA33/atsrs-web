import test from 'node:test';
import assert from 'node:assert/strict';
import {successFactorsEntries,successFactorsDetail} from '../supabase/functions/job-ingestion/providers.mjs';

test('SuccessFactors listing parser keeps every unique official job with a stable source id',()=>{
 const source={board:'subsea7',source_config:{company:'Subsea7',prefixes:['https://careers.subsea7.com/']}};
 const html=`Showing 1 to 2 of 2 Jobs
   <a href="/job/Offshore-Pilota%28o%29-de-ROV/1167712355/">Pilota(o) de ROV</a>
   <a href="/job/Aberdeen-ROV-Supervisor/1167712455/?source=test">ROV Supervisor</a>
   <a href="https://untrusted.example/job/Fake/999/">Fake</a>`;
 const parsed=successFactorsEntries(html,'https://careers.subsea7.com/search/',source);
 assert.equal(parsed.total,2);
 assert.deepEqual([...parsed.entries.keys()],['1167712355','1167712455']);
 assert.equal(parsed.entries.get('1167712455').postingUrl,'https://careers.subsea7.com/job/Aberdeen-ROV-Supervisor/1167712455/');
 assert.equal(parsed.entries.get('1167712355').function.id,'rov_roc');
});

test('SuccessFactors detail parser returns the card fields and direct application URL',()=>{
 const html=`<span itemprop="title">ROV Supervisor</span>
 <span data-careersite-propertyid="location"><span class="jobGeoLocation">Aberdeen, GB</span></span>
 <span data-careersite-propertyid="customfield4">01 Oct 2026</span>
 <span itemprop="description"><span class="jobdescription"><p>Lead offshore ROV operations.</p></span></span>
 <a class="btn apply dialogApplyBtn" href="/talentcommunity/apply/123/">Apply now</a>`;
 assert.deepEqual(successFactorsDetail(html),{title:'ROV Supervisor',description:'<p>Lead offshore ROV operations.</p>',location:'Aberdeen, GB',closing:'01 Oct 2026',apply:'/talentcommunity/apply/123/'});
});

test('migration connects the three requested offshore employers to their real ATS feeds',async()=>{
 const sql=await import('node:fs/promises').then(fs=>fs.readFile(new URL('../supabase/migrations/20260911111200_connect_offshore_rov_company_feeds.sql',import.meta.url),'utf8'));
 for(const provider of ['recman','hrmanager','successfactors'])assert.match(sql,new RegExp(`provider = '${provider}'`));
 for(const company of ['LEVEL Offshore','DeepOcean','Subsea7'])assert.match(sql,new RegExp(company));
 assert.match(sql,/last_checked_at = null/g);
});
