const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync('js/share-profile.js','utf8');
const helper=source.slice(source.indexOf('  async function fetchPublicProfile('),source.indexOf('  function client()'));
test('public profile aborts stalled requests and clears timeout',async()=>{
  let timeout,cleared=false;
  const context={AbortController,Error,setTimeout(fn){timeout=fn;return 1;},clearTimeout(){cleared=true;},fetch(url,options){return new Promise((resolve,reject)=>options.signal.addEventListener('abort',()=>{const e=new Error();e.name='AbortError';reject(e);}));}};
  vm.createContext(context);vm.runInContext(helper,context);
  const pending=context.fetchPublicProfile('/test',{});timeout();
  await assert.rejects(pending,/Connection timeout/);assert.equal(cleared,true);
});
test('public profile returns verified response payload',async()=>{
  const context={AbortController,Error,setTimeout(){return 1;},clearTimeout(){},fetch:async()=>({ok:true,json:async()=>({profile:{name:'Test'}})})};
  vm.createContext(context);vm.runInContext(helper,context);
  assert.equal((await context.fetchPublicProfile('/test',{})).profile.name,'Test');
});
test('denied browser storage cannot suppress public share route',()=>{
  const html=fs.readFileSync('index.html','utf8');
  assert.match(html,/try\{savedTheme=localStorage.getItem\('atsrs_theme'\);\}catch\(storageError\)\{\}/);
  assert.ok(html.indexOf("if(atsrsEntryShare)document.documentElement.classList.add")<html.indexOf("try{savedTheme=localStorage"));
  assert.match(html,/onclick="window.location.reload\(\)">Try again/);
});
