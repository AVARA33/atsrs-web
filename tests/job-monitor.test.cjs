const test=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const source=fs.readFileSync(require('node:path').join(__dirname,'../js/job-ingestion-monitor.js'),'utf8');
function setup(rpc){
 class Node{constructor(tag){this.tag=tag;this.children=[];this.textContent='';this.classList={add(){},remove(){}};}appendChild(n){this.children.push(n);}replaceChildren(){this.children=[];}}
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
test('logout while request is in flight prevents data appearing',async()=>{let resolve;const s=setup(()=>new Promise(r=>resolve=r));const pending=s.window.atsrsRefreshJobMonitor();s.window.__atsrsDeveloperAccess=false;await s.window.atsrsRefreshJobMonitor();resolve({data:{balance:{amount_usd:7.82}}});await pending;assert.equal(s.host.children.length,0);});
test('network errors offer a retry without showing invented zeroes',async()=>{const s=setup(async()=>{throw Error('offline');});await s.window.atsrsRefreshJobMonitor();assert.match(s.text(s.host),/unavailable/);assert.doesNotMatch(s.text(s.host),/\$0/);});
