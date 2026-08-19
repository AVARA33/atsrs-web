const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const storage = fs.readFileSync(path.join(root, 'js', 'storage.js'), 'utf8');
const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

const ownerFunction = storage.match(
  /function personalOwnerStableId\(\)\{[\s\S]*?\n\}/
);
const selectedFunction = storage.match(
  /function selectedPersonnel\(select\)\{[\s\S]*?\n\}/
);

assert.ok(ownerFunction, 'personalOwnerStableId must remain available');
assert.ok(selectedFunction, 'selectedPersonnel must remain available');
assert.match(index, /js\/storage\.js\?v=580/);

function createContext({ profile = null, personal = true } = {}) {
  const writes = [];
  const generatedId = '11111111-1111-4111-8111-111111111111';
  const context = {
    JSON,
    window: {
      atsrsStableIds: {
        create: () => generatedId,
        isValid: value => value === generatedId
      }
    },
    localKey: key => `atsrs_user_personal_${key}`,
    readAppDataKey: () => profile === null ? null : JSON.stringify(profile),
    saveData: (key, value) => writes.push({ key, value: { ...value } }),
    validAtsrsId: value => value === generatedId,
    isPersonalMode: () => personal,
    soloOwnerName: () => 'myxmiboxs@gmail.com',
    writes
  };
  vm.createContext(context);
  vm.runInContext(`${ownerFunction[0]}\n${selectedFunction[0]}`, context);
  return { context, generatedId, writes };
}

{
  const { context, generatedId, writes } = createContext();
  const selected = vm.runInContext('selectedPersonnel(null)', context);
  assert.equal(selected.id, generatedId);
  assert.equal(selected.name, 'myxmiboxs@gmail.com');
  assert.deepEqual(writes, [{
    key: 'profile',
    value: { atsrsId: generatedId }
  }]);
}

{
  const existingId = '11111111-1111-4111-8111-111111111111';
  const { context, writes } = createContext({
    profile: { atsrsId: existingId, name: 'Existing owner' }
  });
  const selected = vm.runInContext('selectedPersonnel(null)', context);
  assert.equal(selected.id, existingId);
  assert.equal(writes.length, 0);
}

{
  const { context, writes } = createContext({ personal: false });
  const selected = vm.runInContext(
    'selectedPersonnel({value:"11111111-1111-4111-8111-111111111111",options:[{textContent:"Personnel A"}],selectedIndex:0})',
    context
  );
  assert.equal(selected.id, '11111111-1111-4111-8111-111111111111');
  assert.equal(selected.name, 'Personnel A');
  assert.equal(writes.length, 0);
}

console.log('personal document owner bootstrap: ok');
