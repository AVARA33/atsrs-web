const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync('js/app.js', 'utf8');
function harness(failIds = []) {
  let docs = [{cloudFileId:'one'}, {cloudFileId:'two'}];
  const events=[];
  const ctx={window:{confirm:()=>true,atsrsCloudData:{
    deleteDocument:async id=>{events.push('delete:'+id);if(failIds.includes(id))throw Error('offline');},
    flush:async()=>{events.push('flush');return true;}
  }},getData:()=>docs,saveData:(_,value)=>{events.push('save');docs=value;},
  selectedCertIndices:new Set([0,1]),byId:()=>null,alert:()=>{},console:{error:()=>{}},renderCertRows:()=>{}};
  vm.createContext(ctx);
  vm.runInContext(source.slice(source.indexOf('  window.deleteCert=async function(i){'),source.indexOf('  function renderCertRows(){')),ctx);
  return {ctx,events,docs:()=>docs};
}
test('single failed server deletion keeps document visible',async()=>{
  const h=harness(['one']);await h.ctx.window.deleteCert(0);
  assert.equal(h.docs().length,2);assert.deepEqual(h.events,['delete:one']);
});
test('single deletion completes on server before saving register',async()=>{
  const h=harness();await h.ctx.window.deleteCert(0);
  assert.equal(h.docs().length,1);assert.deepEqual(h.events,['delete:one','save','flush']);
});
test('bulk deletion retains failed items for retry',async()=>{
  const h=harness(['two']);await h.ctx.deleteSelectedCertificates();
  assert.equal(h.docs().length,1);assert.equal(h.docs()[0].cloudFileId,'two');
  assert.deepEqual(h.events,['delete:two','delete:one','save','flush']);
});
test('metadata delete requires a confirmed owner-scoped returned row',()=>{
  const src=fs.readFileSync('js/server-data.js','utf8');
  const fn=src.slice(src.indexOf('  async function deleteCloudFile(id){'),src.indexOf('  async function signedFileUrl'));
  assert.match(fn,/\.eq\('user_id',user\(\)\.id\)\.eq\('account_type',accountType\(\)\)/);
  assert.match(fn,/select\('id'\)\.maybeSingle\(\)/);
  assert.match(fn,/if\(!result.data\)throw/);
});
