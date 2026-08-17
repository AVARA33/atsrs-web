const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const test=require('node:test');
const vm=require('node:vm');

const runtime=fs.readFileSync(path.join(__dirname,'..','js','jobs-prototype.js'),'utf8');
const fixture=fs.readFileSync(path.join(__dirname,'fixtures','jobs-prototype-harness.html'),'utf8');

function runtimeSlice(start,end){
  const from=runtime.indexOf(start),to=runtime.indexOf(end,from);
  assert.notEqual(from,-1,`missing ${start}`);
  assert.notEqual(to,-1,`missing ${end}`);
  return runtime.slice(from,to);
}

test('30-row page contract handles exact boundary totals',()=>{
  const context={PAGE:30};
  vm.runInNewContext(runtimeSlice('function totalPages','function pageItems'),context);
  assert.equal(context.totalPages(0),0);
  assert.equal(context.totalPages(19),1);
  assert.equal(context.totalPages(30),1);
  assert.equal(context.totalPages(31),2);
  assert.equal(context.totalPages(60),2);
  assert.equal(context.totalPages(61),3);
  assert.equal(context.totalPages(360),12);
});

test('pagination model covers first, middle and last pages with ellipses',()=>{
  const context={};
  vm.runInNewContext(runtimeSlice('function pageItems','function pageButton'),context);
  assert.deepEqual(Array.from(context.pageItems(1,1)),[1]);
  assert.deepEqual(Array.from(context.pageItems(1,3)),[1,2,3]);
  assert.deepEqual(Array.from(context.pageItems(1,12)),[1,2,'ellipsis',12]);
  assert.deepEqual(Array.from(context.pageItems(6,12)),[1,'ellipsis',5,6,7,'ellipsis',12]);
  assert.deepEqual(Array.from(context.pageItems(12,12)),[1,'ellipsis',11,12]);
});

test('server filter builder keeps role/location exact and searches title tokens only',()=>{
  const context={};
  vm.runInNewContext(runtimeSlice('function clean','function pageItems'),context);
  const calls=[];
  const query={eq(field,value){calls.push(['eq',field,value]);return this},ilike(field,value){calls.push(['ilike',field,value]);return this}};
  context.applyFilters(query,{role:'ROV Pilot',location:'Offshore Ireland',search:' Engineer,  SUBSEA-engineer '});
  assert.deepEqual(calls,[
    ['eq','title','ROV Pilot'],
    ['eq','location','Offshore Ireland'],
    ['ilike','title','%engineer%'],
    ['ilike','title','%subsea%']
  ]);
  assert.deepEqual(Array.from(context.searchTerms(' rov—PILOT, rov ')),['rov','pilot']);
});

test('title search removes ROV false positives and combines with location before pagination',()=>{
  const context={};
  vm.runInNewContext(runtimeSlice('function clean','function pageItems'),context);
  const vacancies=[
    {title:'ROV Pilot',location:'Offshore Ireland',description:''},
    {title:'ROV Pilot Technician',location:'Qatar',description:''},
    {title:'Senior ROV Pilot',location:'Offshore Ireland',description:''},
    {title:'Workshop Technician',location:'Aberdeen',description:''},
    {title:'Driver - Shop Technician',location:'Aberdeen',description:''},
    {title:'Reward Specialist',location:'Offshore Ireland',description:'Supports ROV recruitment.'},
    {title:'Electrical Principal Engineer',location:'Offshore Ireland',description:'ROV systems experience.'},
    {title:'Logistics Category Buyer',location:'Qatar',description:'ROV equipment purchasing.'}
  ];
  function results(search,location=''){
    const filters=[];
    const query={eq(field,value){filters.push(['eq',field,value]);return this},ilike(field,value){filters.push(['ilike',field,value.slice(1,-1).toLowerCase()]);return this}};
    context.applyFilters(query,{role:'',location,search});
    return vacancies.filter(job=>filters.every(([kind,field,value])=>kind==='eq'?job[field]===value:String(job[field]||'').toLowerCase().includes(value))).map(job=>job.title);
  }
  assert.deepEqual(results('ROV'),['ROV Pilot','ROV Pilot Technician','Senior ROV Pilot']);
  assert.deepEqual(results('rov pilot'),['ROV Pilot','ROV Pilot Technician','Senior ROV Pilot']);
  assert.deepEqual(results('pilot'),['ROV Pilot','ROV Pilot Technician','Senior ROV Pilot']);
  assert.deepEqual(results('technician'),['ROV Pilot Technician','Workshop Technician','Driver - Shop Technician']);
  assert.deepEqual(results('reward'),['Reward Specialist']);
  assert.deepEqual(results('electrical'),['Electrical Principal Engineer']);
  assert.deepEqual(results('ROV','Offshore Ireland'),['ROV Pilot','Senior ROV Pilot']);
  assert.ok(!results('ROV').includes('Reward Specialist'));
  assert.ok(!results('ROV').includes('Electrical Principal Engineer'));
  assert.ok(!results('ROV').includes('Logistics Category Buyer'));
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

test('top and bottom pagination share one stateful renderer and compact navigation contract',()=>{
  assert.match(runtime,/function renderPaginationNav\(nav,pages\)/);
  assert.match(runtime,/querySelectorAll\('\[data-jobs-pagination\]'\)\.forEach/);
  assert.match(runtime,/load\(target,\{focus:true\}\)/);
  assert.match(runtime,/id\('jobsPaginationTop'\)/);
  assert.match(runtime,/hide\(nav,pages<=1\)/);
  assert.match(runtime,/direction==='previous'/);
  assert.match(runtime,/direction==='next'/);
  assert.match(fixture,/id="jobsPaginationTop"[^>]*data-jobs-pagination/);
  assert.match(fixture,/id="jobsPaginationBottom"[^>]*data-jobs-pagination/);
});

test('full-dataset facets preserve raw values and include role/location found only after row 30',()=>{
  assert.match(runtime,/var PAGE=30,FACET_PAGE=1000/);
  assert.match(runtime,/select\('id,title,location'\)/);
  assert.match(runtime,/\.range\(offset,offset\+FACET_PAGE-1\)/);
  assert.match(runtime,/while\(batch\.length===FACET_PAGE\)/);
  assert.match(runtime,/var raw=String\(j\[c\[1\]\]/);
  assert.doesNotMatch(runtime,/role:clean\(id\('jobsRoleFilter'/);
  assert.match(fixture,/n===65\?'Final Page Specialist'/);
  assert.match(fixture,/n===65\?'Remote Arctic'/);
  assert.match(fixture,/n===4\?'ROV Pilot'/);
  assert.match(fixture,/n===7\?'Reward Specialist'/);
  assert.match(fixture,/mentions ROV only in vacancy details/);
});
