const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const root=path.resolve(__dirname,'..');
const index=fs.readFileSync(path.join(root,'index.html'),'utf8');
const dashboard=fs.readFileSync(path.join(root,'js','dashboard.js'),'utf8');

assert.match(index,/js\/dashboard\.js\?v=421/);
assert.match(index,/id="editProfileBtn" type="button">Edit profile<\/button>/);
assert.match(index,/id="saveProfileBtn" type="button" onclick="saveProfile\(\)" hidden>Save profile<\/button>/);
assert.match(dashboard,/function setProfileEditMode\(editing,focusFirst\)/);
assert.match(dashboard,/profileEditableControls\(\)\.forEach\(function\(control\)\{control\.disabled=!editing\}\)/);
assert.match(dashboard,/editButton\.addEventListener\('click',function\(\)\{setProfileEditMode\(true,true\)\}\)/);
assert.match(dashboard,/if\(generalTab&&!generalTab\.hasAttribute\('data-profile-editing'\)\)setProfileEditMode\(false,false\)/);
assert.match(dashboard,/setProfileEditMode\(false,false\);\s*showSaved\(\);return true/);

console.log('Personal profile explicit edit-mode contracts passed');
