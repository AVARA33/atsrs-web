const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const js=fs.readFileSync('js/employers.js','utf8');
function setup(){
 const nodes={};const byId=id=>nodes[id]||(nodes[id]={value:'',textContent:'',classList:{toggle(){}},appendChild(){}});
 const ctx={companies:Array.from({length:95},(_,i)=>({name:'Company '+i,vacancyCount:1})),companyPage:1,COMPANY_PAGE_SIZE:30,hiringOnly:false,companyLogos:{},companyData:()=>({}),byId,document:{createDocumentFragment:()=>({appendChild(){}})},card:()=>({}),renderPagination(){}};
 vm.createContext(ctx);vm.runInContext(js.slice(js.indexOf('  function render()'),js.indexOf('  function pageButton(')),ctx);return{ctx,byId};
}
test('count follows current page, last page and empty filters',()=>{const{ctx,byId}=setup();ctx.render();assert.equal(byId('employersPageCount').textContent,'30 of 95 companies');ctx.companyPage=4;ctx.render();assert.equal(byId('employersPageCount').textContent,'5 of 95 companies');byId('employersSearch').value='not a company';ctx.render();assert.equal(byId('employersPageCount').textContent,'0 of 0 companies');});
test('company count is a transparent theme-aware tile in the banner',()=>{const html=fs.readFileSync('index.html','utf8'),css=fs.readFileSync('css/company-directory-v6034.css','utf8');assert.equal((html.match(/id="employersPageCount"/g)||[]).length,1);assert.match(css,/\.company-page-count\{[^}]*background:transparent/);assert.match(css,/html\[data-theme="light"\] #employersPage \.company-page-count/);});
