const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const source=fs.readFileSync(require('node:path').join(__dirname,'../js/locale.js'),'utf8');

test('dynamic localization scans only changed subtrees',()=>{
  assert.match(source,/function queueDirty\(node, scope\)/);
  assert.match(source,/for \(const node of mutation\.addedNodes\) queueDirty\(node, scope\)/);
  assert.match(source,/else queueDirty\(mutation\.target, scope\)/);
  assert.doesNotMatch(source,/if \(scope\) dirty\.add\(scope\)/);
  assert.match(source,/if \(scopes\.includes\(scope\)\) scope\.lang = locale/);
});
