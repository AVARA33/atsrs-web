const test=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const source=fs.readFileSync(require('node:path').join(__dirname,'../js/job-ingestion-monitor.js'),'utf8');
function setup(rpc){
 class Node{constructor(tag){this.tag=tag;this.children=[];this.textContent='';this.classList={add(){},remove(){}};}appendChild(n){this.children.push(n);}replaceChildren(...nodes){this.children=nodes;}setAttribute(){}focus(){}querySelector(q){for(const n of this.children){if(n.tag===q||(q==='.'+n.className))return n;const nested=n.querySelector(q);if(nested)return nested;}return null;}}
 const host=new Node('section'),window={__atsrsDeveloperAccess:true,__atsrsDeveloperAccessUserId:'owner',supabaseClient:{rpc}};
 vm.runInNewContext(source,{window,document:{getElementById:()=>host,createElement:t=>new Node(t)}});
 const text=n=>[n.textContent,...n.children.map(text)].join(' ');
 return {window,host,text};
}
test('refresh renders server costs and labels balance snapshot honestly',async()=>{
 let calls=0;const s=setup(async()=>{calls++;return {data:{balance:{amount_usd:7.82,checked_at:'2026-09-02T23:53:00Z'},refreshed_at:'2026-09-03T00:00:00Z',daily:[{day:'2026-09-03',cost:0.001,reserved:0,calls:2,published:1,updated:1,errors:0}]}};});
 await s.window.atsrsRefreshJobMonitor();assert.match(s.text(s.host),/\$7.82/);assert.match(s.text(s.host),/not live/);assert.match(s.text(s.host),/\$0.0010/);
 const button=s.host.children[0].children.find(n=>n.tag==='button');await button.onclick();assert.equal(calls,2);
});
test('non-owner does not request statistics',async()=>{let called=false;const s=setup(async()=>{called=true;});s.window.__atsrsDeveloperAccess=false;await s.window.atsrsRefreshJobMonitor();assert.equal(called,false);});
test('source coverage distinguishes planned names from connected feeds and preserves disclosure',async()=>{
 const s=setup(async()=>({data:{daily:[],coverage:{scope:[{name:'Connected Co',connector_state:'connected',boards:['One']},{name:'Waiting Co',connector_state:'needs_connector',boards:[]}],sources:[{board:'One',enabled:true}],pending:200,review:3}}}));
 await s.window.atsrsRefreshJobMonitor();assert.match(s.text(s.host),/2 name records · 1 connected · 1 need integration/);assert.match(s.text(s.host),/Needs connector/);assert.match(s.text(s.host),/Not completed/);
 s.host.querySelector('details').open=true;await s.window.atsrsRefreshJobMonitor();assert.equal(s.host.querySelector('details').open,true);
});
test('logout while request is in flight prevents data appearing',async()=>{let resolve;const s=setup(()=>new Promise(r=>resolve=r));const pending=s.window.atsrsRefreshJobMonitor();s.window.__atsrsDeveloperAccess=false;await s.window.atsrsRefreshJobMonitor();resolve({data:{balance:{amount_usd:7.82}}});await pending;assert.equal(s.host.children.length,0);});
test('network errors offer a retry without showing invented zeroes',async()=>{const s=setup(async()=>{throw Error('offline');});await s.window.atsrsRefreshJobMonitor();assert.match(s.text(s.host),/unavailable/);assert.doesNotMatch(s.text(s.host),/\$0/);});
test('refresh keeps report mounted during request and retains it on failure',async()=>{
 let resolve,calls=0;const s=setup(()=>++calls===1?Promise.resolve({data:{daily:[]}}):new Promise(r=>resolve=r));
 await s.window.atsrsRefreshJobMonitor();const children=s.host.children,button=s.host.querySelector('button');
 const pending=s.window.atsrsRefreshJobMonitor();assert.equal(s.host.children,children);assert.equal(button.disabled,true);
 resolve({error:true});await pending;assert.equal(s.host.children,children);assert.equal(button.disabled,false);
});
