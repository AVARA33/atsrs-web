const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const calculator=require('../js/entitlement-calculator.js');

const root=path.resolve(__dirname,'..');
const read=(file)=>fs.readFileSync(path.join(root,file),'utf8');

test('effective allowance uses plan plus purchases plus manual minus used',()=>{
  assert.equal(calculator.available({plan_default:5,purchased:10,manual:3,used:4}),14);
  assert.equal(calculator.available({plan_default:0,purchased:0,manual:-5,used:1}),0);
});

test('preview separates purchased and manual buckets',()=>{
  const service={plan_default:5,purchased:10,manual:3,used:4};
  assert.deepEqual(calculator.preview(service,'manual','add',5),{delta:5,source:'manual',sourceCurrent:3,sourceNext:8,available:19});
  assert.deepEqual(calculator.preview(service,'purchased','remove',50),{delta:-50,source:'purchased',sourceCurrent:10,sourceNext:0,available:4});
});

test('canonical subscription model rejects legacy plan values',()=>{
  const sql=read('supabase/migrations/20260813163522_admin_entitlements.sql');
  assert.match(sql,/check \(plan in \('free','bronze','silver','titan','gold'\)\)/);
  assert.match(sql,/set plan = 'titan'.*where plan = 'pro'/);
  assert.match(sql,/set plan = 'gold'.*where plan = 'business'/);
  assert.match(sql,/atsrs_effective_entitlement_limit/);
  assert.doesNotMatch(sql,/atsrs_account_plan_assignments/);
});

test('active application code has no legacy plan branch',()=>{
  for(const file of [
    'index.html',
    'js/account.js',
    'js/admin-entitlements.js',
    'js/server-data.js',
    'supabase/functions/scan-document/index.ts',
    'supabase/functions/generate-cv/index.ts',
  ]){
    const source=read(file);
    assert.doesNotMatch(source,/plan\s*(?:===|==|:)\s*["'](?:pro|business)["']/i,file);
    assert.doesNotMatch(source,/["'](?:pro|business)["']\s*\|/i,file);
  }
});

test('admin RPCs are owner-gated and keep an empty search path',()=>{
  const sql=read('supabase/migrations/20260813163522_admin_entitlements.sql');
  const adminFunctions=sql.match(/create or replace function public\.atsrs_admin_[\s\S]*?\$function\$;/g)||[];
  assert.equal(adminFunctions.length,6);
  for(const definition of adminFunctions){
    assert.match(definition,/security definer\s+set search_path = ''/);
    assert.match(definition,/atsrs_is_entitlement_admin/);
  }
  assert.match(sql,/revoke all on function public\.atsrs_admin_entitlements_bootstrap\(text\) from public, anon/);
  assert.match(sql,/grant execute on function public\.atsrs_admin_entitlements_bootstrap\(text\) to authenticated/);
});

test('admin surface contains owner controls and reset safety copy',()=>{
  const html=read('index.html');
  assert.match(html,/id="navAdmin"[^>]*personal-only[^>]*hidden/);
  assert.match(html,/id="adminGrantService"/);
  assert.match(html,/id="adminAccountPlan"/);
  assert.match(html,/Purchased add-ons stay active/);
});

test('edge quota contracts use only canonical plan names',()=>{
  for(const file of ['supabase/functions/scan-document/index.ts','supabase/functions/generate-cv/index.ts']){
    const source=read(file);
    assert.match(source,/"free" \| "bronze" \| "silver" \| "titan" \| "gold"/);
    assert.doesNotMatch(source,/"pro" \| "business"/);
  }
});
