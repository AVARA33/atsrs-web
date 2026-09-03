import test from 'node:test';
import assert from 'node:assert/strict';
import {listingSweep,safePublicUrl} from '../supabase/functions/job-ingestion/scope.mjs';
test('pagination includes every page and reports completion only at end',async()=>{
 const offsets=[];const get=async url=>{const offset=Number(new URL(url).searchParams.get('offset'));offsets.push(offset);return {totalFound:251,content:Array.from({length:Math.min(100,251-offset)},(_,i)=>({id:String(offset+i)}))};};
 const r=await listingSweep('https://api.example.com/list',0,get,()=>true);
 assert.equal(r.entries.size,251);assert.equal(r.complete,true);assert.equal(r.nextOffset,0);assert.deepEqual(offsets,[0,100,200]);
});
test('large sources resume instead of silently truncating to first 100',async()=>{
 const get=async url=>{const o=Number(new URL(url).searchParams.get('offset'));return {totalFound:1800,content:Array.from({length:100},(_,i)=>({id:String(o+i)}))};};
 const first=await listingSweep('https://api.example.com/list',0,get,()=>true,8);
 assert.equal(first.nextOffset,800);assert.equal(first.complete,false);
 const next=await listingSweep('https://api.example.com/list',first.nextOffset,get,()=>true,8);
 assert.equal(next.nextOffset,1500);assert.equal(next.entries.has('800'),true);assert.equal(next.entries.has('0'),true);
});
test('failed pagination is not recorded as a complete source scan',async()=>{
 await assert.rejects(listingSweep('https://api.example.com/list',0,async()=>({totalFound:200,content:[]}),()=>true),/Incomplete/);
});
test('source checks reject credentials, IP literals and non-public URL formats',()=>{
 for(const url of ['http://example.com','https://127.0.0.1','https://[::1]','https://localhost','https://host.internal','https://user:pass@example.com','https://example.com:9000'])assert.equal(safePublicUrl(url),null);
 assert.equal(safePublicUrl('https://careers.example.com/jobs').hostname,'careers.example.com');
});
