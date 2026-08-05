const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const root=path.resolve(__dirname,'..');
const {createAuthority,kinds}=require(path.join(root,'js','reference-filter-state.js'));
const app=fs.readFileSync(path.join(root,'js','app.js'),'utf8');
const documents=fs.readFileSync(path.join(root,'js','documents.js'),'utf8');
const account=fs.readFileSync(path.join(root,'js','account.js'),'utf8');
const server=fs.readFileSync(path.join(root,'js','server-data.js'),'utf8');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');

assert.deepEqual(kinds,['appraisal','reference','recommendation','coverLetter']);
assert.doesNotMatch(app,/filter\.disabled\s*=/,'legacy compact renderer must not own disabled state');
assert.match(documents,/class="atsrs-v134-filter" disabled aria-busy="true"/,'filters must be born disabled during hydration');
assert.match(documents,/card\.dataset\.atsrsV134Layout==='stable'/,'reference cards must have an idempotent layout guard');
assert.match(documents,/if\(!layoutReady\)\{\s*card\.innerHTML=/,'reference cards must not be rebuilt on every render');
assert.match(documents,/var cloudOwned=window\.atsrsReferenceFilterState/,'cloud ownership must be resolved once per render');
assert.match(documents,/if\(list\.innerHTML!==nextHtml\)list\.innerHTML=nextHtml/,'local empty states must not be recreated when unchanged');
assert.equal((account.match(/atsrsReferenceFilterState\.cloudOwns\(\)\)return/g)||[]).length,2,'both legacy IndexedDB renderers must yield to cloud ownership');
assert.match(server,/atsrsReferenceFilterState\.begin\(\{scope:wantedScope,source:'cloud'\}\)/);
assert.match(server,/!window\.atsrsReferenceFilterState\.settle\(kind,values\.length,filterToken\)/);
assert.ok(
  server.indexOf('!window.atsrsReferenceFilterState.settle(kind,values.length,filterToken)')
    <server.indexOf("status.textContent=values.length"),
  'stale cloud renders must be rejected before any visible status/list write'
);
assert.match(server,/if\(list\.innerHTML!==nextListHtml\)list\.innerHTML=nextListHtml/,'cloud empty states must not be recreated when unchanged');
assert.match(html,/js\/reference-filter-state\.js\?v=410/);
assert.match(html,/js\/server-data\.js\?v=410/);
assert.match(html,/js\/documents\.js\?v=410/);
assert.match(html,/js\/account\.js\?v=410/);
assert.match(html,/js\/app\.js\?v=430/);

function recorder(){
  const events=[];
  const authority=createAuthority((kind,state)=>events.push({kind,...state}));
  return {events,authority};
}

{
  const {events,authority}=recorder();
  const token=authority.begin({scope:'personal'});
  kinds.forEach(kind=>authority.mount(kind));
  kinds.forEach(kind=>assert.equal(authority.settle(kind,0,token),true));
  kinds.forEach(kind=>{
    const states=events.filter(event=>event.kind===kind).map(event=>event.disabled);
    assert.equal(states.filter((value,index)=>index&&value!==states[index-1]).length,0,'empty filter must never oscillate');
    assert.deepEqual(authority.snapshot(kind),{disabled:true,pending:false,count:0,scope:'personal',generation:1});
  });
}

{
  const {events,authority}=recorder();
  const stale=authority.begin({scope:'corporate'});
  const current=authority.begin({scope:'corporate'});
  kinds.forEach(kind=>assert.equal(authority.settle(kind,3,stale),false,'stale callback must be rejected'));
  kinds.forEach(kind=>assert.equal(authority.settle(kind,3,current),true));
  kinds.forEach(kind=>{
    const states=events.filter(event=>event.kind===kind).map(event=>event.disabled);
    assert.equal(states.filter((value,index)=>index&&value!==states[index-1]).length,1,'populated filter may make one final disabled-to-enabled transition');
    assert.equal(authority.snapshot(kind).disabled,false);
  });
}

{
  const {authority}=recorder();
  const personal=authority.begin({scope:'personal'});
  authority.settle('reference',2,personal);
  const corporate=authority.begin({scope:'corporate'});
  assert.equal(authority.snapshot('reference').pending,true);
  assert.equal(authority.snapshot('reference').disabled,true);
  assert.equal(authority.settle('reference',0,personal),false,'prior workspace must not overwrite current workspace');
  assert.equal(authority.settle('reference',1,corporate),true);
  assert.equal(authority.snapshot('reference').disabled,false);
}

console.log('reference filter state authority tests passed');
