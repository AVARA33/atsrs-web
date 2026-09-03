const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const js=fs.readFileSync('js/employers.js','utf8');
function setup(){
 const nodes={};const byId=id=>nodes[id]||(nodes[id]={value:'',textContent:'',classList:{toggle(){}},appendChild(){}});
 const ctx={companies:Array.from({length:95},(_,i)=>({name:'Company '+i,vacancyCount:1})),companyPage:1,COMPANY_PAGE_SIZE:30,hiringOnly:false,companyLogos:{},companyData:()=>({}),byId,document:{createDocumentFragment:()=>({appendChild(){}})},card:()=>({}),renderPagination(){}};
 vm.createContext(ctx);vm.runInContext(js.slice(js.indexOf('  function render()'),js.indexOf('  function pageButton(')),ctx);return{ctx,byId};
}
test('count follows cumulative page position, last page and empty filters',()=>{const{ctx,byId}=setup();for(const [page,count] of [[1,30],[2,60],[3,90],[4,95]]){ctx.companyPage=page;ctx.render();assert.equal(byId('employersPageCount').textContent,count+' of 95 companies');}byId('employersSearch').value='not a company';ctx.render();assert.equal(byId('employersPageCount').textContent,'0 of 0 companies');});
test('jobs count follows cumulative position and caps at total',()=>{
 const source=fs.readFileSync('js/jobs-prototype.js','utf8');
 const render=source.split(/\r?\n/).find(line=>line.startsWith('function render(){'));
 const count={textContent:''},grid={replaceChildren(){}};
 const ctx={id:key=>key==='jobsGrid'?grid:key==='jobsVisibleCount'?count:null,timer:null,jobs:[],page:1,PAGE:30,total:95,loading:false,document:{createDocumentFragment:()=>({append(){}})},card:()=>({}),updateView(){},publishedMs:()=>NaN,isNew:()=>false,NEW_MS:86400000,hide(){},renderPagination(){}};
 vm.createContext(ctx);vm.runInContext(render,ctx);
 for(const [page,size,expected] of [[1,30,30],[2,30,60],[3,30,90],[4,5,95]]){ctx.page=page;ctx.jobs=Array(size).fill({});ctx.render();assert.equal(count.textContent,expected+' of 95 opportunities');}
 ctx.total=0;ctx.jobs=[];ctx.page=1;ctx.render();assert.equal(count.textContent,'0 of 0 opportunities');
});
test('recruiter counter has its own compact transparent tile in both themes',()=>{const css=fs.readFileSync('css/recruiter-directory-v6029.css','utf8');assert.match(css,/#recruitersPage \.recruiters-snapshot \{[^}]*min-width:0;[^}]*border:1px solid[^}]*background:transparent;/);assert.match(css,/html\[data-theme="light"\] #recruitersPage \.recruiters-snapshot \{[^}]*background:transparent;/);});
test('company count is a transparent theme-aware tile in the banner',()=>{const html=fs.readFileSync('index.html','utf8'),css=fs.readFileSync('css/company-directory-v6034.css','utf8');assert.equal((html.match(/id="employersPageCount"/g)||[]).length,1);assert.match(css,/\.company-page-count\{[^}]*background:transparent/);assert.match(css,/html\[data-theme="light"\] #employersPage \.company-page-count/);});
