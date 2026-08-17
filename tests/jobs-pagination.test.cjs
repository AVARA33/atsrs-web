const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const test=require('node:test');
const vm=require('node:vm');

const runtime=fs.readFileSync(path.join(__dirname,'..','js','jobs-prototype.js'),'utf8');

function runtimeSlice(start,end){
  const from=runtime.indexOf(start),to=runtime.indexOf(end,from);
  assert.notEqual(from,-1,`missing ${start}`);
  assert.notEqual(to,-1,`missing ${end}`);
  return runtime.slice(from,to);
}

test('pagination model covers first, middle and last pages with ellipses',()=>{
  const context={};
  vm.runInNewContext(runtimeSlice('function pageItems','function pageButton'),context);
  assert.deepEqual(Array.from(context.pageItems(1,1)),[1]);
  assert.deepEqual(Array.from(context.pageItems(1,3)),[1,2,3]);
  assert.deepEqual(Array.from(context.pageItems(1,12)),[1,2,'ellipsis',12]);
  assert.deepEqual(Array.from(context.pageItems(6,12)),[1,'ellipsis',5,6,7,'ellipsis',12]);
  assert.deepEqual(Array.from(context.pageItems(12,12)),[1,'ellipsis',11,12]);
});

test('server filter builder keeps role/location exact and search encoded in one OR expression',()=>{
  const context={};
  vm.runInNewContext(runtimeSlice('function clean','function pageItems'),context);
  const calls=[];
  const query={eq(field,value){calls.push(['eq',field,value]);return this},or(value){calls.push(['or',value]);return this}};
  context.applyFilters(query,{role:'ROV Pilot',location:'Aberdeen, UK',search:'engineer, subsea'});
  assert.deepEqual(calls.slice(0,2),[['eq','title','ROV Pilot'],['eq','location','Aberdeen, UK']]);
  assert.equal(calls[2][0],'or');
  assert.match(calls[2][1],/^title\.ilike\."\*engineer, subsea\*",company\.ilike\./);
  assert.equal((calls[2][1].match(/\.ilike\./g)||[]).length,6);
});

test('page query uses a 30-row range and exact filtered total without client accumulation',()=>{
  assert.match(runtime,/var PAGE=30/);
  assert.match(runtime,/select\('\*',\{count:'exact'\}\)/);
  assert.match(runtime,/var from=\(target-1\)\*PAGE/);
  assert.match(runtime,/\.range\(from,from\+PAGE-1\)/);
  assert.doesNotMatch(runtime,/jobs=jobs\.concat|\.limit\(PAGE\).*cursor/);
  assert.match(runtime,/page=target/);
  assert.match(runtime,/getPage:function\(\)\{return page\}/);
  assert.match(runtime,/getTotal:function\(\)\{return total\}/);
});
