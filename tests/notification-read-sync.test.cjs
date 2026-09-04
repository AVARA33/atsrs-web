const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const code=fs.readFileSync(require('node:path').join(__dirname,'../js/notification-read-sync.js'),'utf8');
const id='12345678-1234-4234-8234-123456789012';
function browser(db,user='alice',legacy=[]){
 let fail=false,stored=JSON.stringify(legacy);
 const client={auth:{getSession:async()=>({data:{session:{user:{id:user}}}}),onAuthStateChange(){}},from(){return {
  async upsert(rows){if(fail)return {error:new Error('offline')};rows.forEach(r=>db.add(r.user_id+':'+r.request_id));return {}},
  select(){return {eq:(k,owner)=>({in:async(k,ids)=>fail?{error:new Error('offline')}:{data:ids.filter(x=>db.has(owner+':'+x)).map(request_id=>({request_id}))}})}}
 }}};
 const window={supabaseClient:client,atsrsGetOwnerShareRequests:()=>[{id,status:'pending'}],addEventListener(){},dispatchEvent(){}};
 const context={window,document:{hidden:false,addEventListener(){}},localStorage:{getItem:()=>stored,setItem:(k,v)=>stored=v},CustomEvent:function(){},setTimeout(){},setInterval(){},console};
 vm.runInNewContext(code,context);
 return {api:window.atsrsNotificationReads,offline(){fail=true},legacy:()=>JSON.parse(stored)};
}
test('read in one browser is read in another, but remains unread for another account',async()=>{
 const db=new Set(),chrome=browser(db),opera=browser(db),other=browser(db,'bob');
 await chrome.api.mark([{id}]);await opera.api.sync(true);await other.api.sync(true);
 assert.equal(opera.api.has(id),true);assert.equal(other.api.has(id),false);
 await chrome.api.mark([{id}]);assert.equal(db.size,1);
});
test('legacy read receipts import before local removal',async()=>{
 const db=new Set(),chrome=browser(db,'alice',[id]);await chrome.api.sync(true);
 assert.equal(db.has('alice:'+id),true);assert.deepEqual(chrome.legacy(),[]);
 const opera=browser(db);await opera.api.sync(true);assert.equal(opera.api.has(id),true);
});
test('failed server writes never report success or discard old receipts',async()=>{
 const b=browser(new Set(),'alice',[id]);b.offline();await b.api.sync(true);
 assert.deepEqual(b.legacy(),[id]);assert.equal(b.api.has(id),false);
 await assert.rejects(b.api.mark([{id}]),/offline/);assert.equal(b.api.has(id),false);
});

test('unread status stays unknown until server receipts arrive and is scoped to checked IDs',async()=>{
 const b=browser(new Set(['alice:'+id]));
 assert.equal(b.api.ready([{id}]),false);
 const loading=b.api.sync(true);
 assert.equal(b.api.ready([{id}]),false);
 await loading;
 assert.equal(b.api.ready([{id}]),true);
 assert.equal(b.api.has(id),true);
 assert.equal(b.api.ready([{id:'22345678-1234-4234-8234-123456789012'}]),false);
});
test('failed initial read does not classify notifications as unread',async()=>{
 const b=browser(new Set());b.offline();await b.api.sync(true);
 assert.equal(b.api.ready([{id}]),false);
 assert.equal(b.api.failed(),true);
});
