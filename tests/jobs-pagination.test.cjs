const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const test=require('node:test');
const vm=require('node:vm');

const runtime=fs.readFileSync(path.join(__dirname,'..','js','jobs-prototype.js'),'utf8');
const css=fs.readFileSync(path.join(__dirname,'..','css','jobs-prototype.css'),'utf8');
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

test('server feed parameters keep role/location exact and search title tokens only',()=>{
  const context={PAGE:30,worksiteFacetValues:{offshore:[],onshore:[]}};
  vm.runInNewContext(runtimeSlice('function clean','function pageItems'),context);
  const params=context.feedParams(2,{role:'ROV Pilot',location:'Offshore Ireland',search:' Engineer,  SUBSEA-engineer ',company:'',recruiter:'',days:0,offshore:false,onshore:false,newOnly:false});
  assert.equal(params.p_page,2);
  assert.equal(params.p_page_size,30);
  assert.equal(params.p_role,'ROV Pilot');
  assert.equal(params.p_location,'Offshore Ireland');
  assert.deepEqual(Array.from(params.p_search_terms),['engineer','subsea']);
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
    const terms=Array.from(context.searchTerms(search));
    return vacancies.filter(job=>(!location||job.location===location)&&terms.every(term=>job.title.toLowerCase().includes(term))).map(job=>job.title);
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

test('page query uses the entitlement-aware 30-row RPC and exact filtered total',()=>{
  assert.match(runtime,/var PAGE=30/);
  assert.match(runtime,/client\.rpc\('atsrs_jobs_feed',feedParams\(target,state\)\)/);
  assert.match(runtime,/p_page:target,p_page_size:PAGE/);
  assert.match(runtime,/count=Number\(payload\.total\)\|\|0/);
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

test('pagination exposes one shared active page with borderless theme-aware styling',()=>{
  assert.match(runtime,/b\.classList\.add\('is-current'\);b\.setAttribute\('aria-current','page'\)/);
  assert.match(css,/\.jobs-page-button\{[^}]*border:0[^}]*background:transparent[^}]*box-shadow:none/);
  assert.match(css,/jobs-page-button\.is-current[^\{]*\{background:var\(--atsrs-jobs-green-text\)!important;color:#071006!important\}/);
  assert.match(css,/html\[data-theme="light"\][^\{]*jobs-page-button\.is-current[^\{]*\{background:var\(--atsrs-shell-accent\)!important;color:#fff!important;-webkit-text-fill-color:#fff!important\}/);
  assert.match(css,/jobs-page-button\.is-current:hover[^\{]*jobs-page-button\.is-current:focus-visible[^\{]*\{background:var\(--atsrs-shell-accent\)!important;color:#fff!important/);
  assert.doesNotMatch(css,/jobs-page-button\.is-current[^\{]*\{background:#245b93!important/);
  assert.match(css,/\.jobs-page-button:disabled\{cursor:default;opacity:\.38\}/);
  assert.match(css,/\.jobs-page-button:focus-visible\{outline:2px solid/);
});

test('full-dataset facets preserve raw values and include all primary and secondary options after row 30',()=>{
  assert.match(runtime,/client\.rpc\('atsrs_jobs_facets'\)/);
  assert.match(runtime,/filterJobs=result\.error\?await legacyOptions\(client\):\(Array\.isArray\(result\.data\)\?result\.data:\[\]\)/);
  assert.match(runtime,/missingJobsRpc\(result\.error\)/);
  assert.match(runtime,/var raw=String\(j\[c\[1\]\]/);
  assert.doesNotMatch(runtime,/role:clean\(id\('jobsRoleFilter'/);
  assert.match(fixture,/n===65\?'Final Page Specialist'/);
  assert.match(fixture,/n===65\?'Remote Arctic'/);
  assert.match(fixture,/n===4\?'ROV Pilot'/);
  assert.match(fixture,/n===7\?'Reward Specialist'/);
  assert.match(fixture,/mentions ROV only in vacancy details/);
});

test('secondary filters are server-side, reset page one and preserve exact NEW logic',()=>{
  const context={PAGE:30,NEW_MS:21600000,worksiteFacetValues:{offshore:['Offshore','Vessel'],onshore:['On-site']}};
  vm.runInNewContext(runtimeSlice('function clean','function pageItems'),context);
  const params=context.feedParams(1,{role:'ROV Pilot',location:'UK',search:'pilot',company:'Maris Subsea',recruiter:'Ellie Malim',days:7,offshore:true,onshore:true,newOnly:true});
  assert.equal(params.p_role,'ROV Pilot');
  assert.equal(params.p_location,'UK');
  assert.equal(params.p_company,'Maris Subsea');
  assert.equal(params.p_recruiter,'Ellie Malim');
  assert.deepEqual(Array.from(params.p_search_terms),['pilot']);
  assert.deepEqual(Array.from(params.p_worksites),['Offshore','Vessel','On-site']);
  assert.equal(params.p_days,7);
  assert.equal(params.p_new_only,true);
  assert.match(runtime,/jobsNewOnlyFilter/);
  assert.match(runtime,/load\(1\)/);
  assert.match(runtime,/isNewPublishedJob:isNew,newWindowMs:NEW_MS/);
});

