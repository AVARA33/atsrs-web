import test from 'node:test';
import assert from 'node:assert/strict';
import {postingContact} from '../supabase/functions/job-ingestion/directory.mjs';
test('missing or generic author never creates an invented recruiter',()=>{
 assert.equal(postingContact({},'').state,'not_provided');
 assert.equal(postingContact({creator:{name:'Recruitment Team'}},'<p>Recruitment Team</p>').state,'review');
});
test('personal contact requires public page evidence as well as structured creator',()=>{
 assert.equal(postingContact({creator:{name:'Jane Smith'}},'<p>Contact Jane Smith</p>').name,'Jane Smith');
 assert.equal(postingContact({creator:{name:'Jane Smith'}},'<script>Jane Smith</script>').state,'review');
 assert.equal(postingContact({creator:{name:'Jane Smith'}},'<p>Different person</p>').state,'review');
});
