import assert from 'node:assert/strict';
import {readNotebook} from './projectNotebook';
const saved={format:'stemmate-project-v1',project_id:12,revision:3,stage:2,entries:['prediction','design','','','','','']};
assert.deepEqual(readNotebook(JSON.stringify(saved),12,3),saved);
for(const value of [null,{...saved,project_id:13},{...saved,revision:4},{...saved,stage:8},{...saved,stage:2.5},{...saved,entries:['prediction']},{...saved,entries:['',...saved.entries.slice(1)]},{...saved,entries:[{text:'object'},...saved.entries.slice(1)]},{...saved,entries:['x'.repeat(6001),...saved.entries.slice(1)]}]){
 assert.throws(()=>readNotebook(JSON.stringify(value),12,3));
}
assert.throws(()=>readNotebook('x'.repeat(300001),12,3));
assert.throws(()=>readNotebook('{invalid',12,3));
const independent={...saved,stage:6,entries:['a','b','c','d','e','f','']};
assert.equal(readNotebook(JSON.stringify(independent),12,3).stage,6);
const untrusted={...saved,extra_token:'must be dropped',entries:['<script>not executed</script>','design','','','','','']};
const decoded=readNotebook(JSON.stringify(untrusted),12,3);
assert.equal(decoded.entries[0],untrusted.entries[0]);
assert.equal('extra_token' in decoded,false);
console.log('Notebook restore, version isolation, progress and malformed-file checks passed.');
