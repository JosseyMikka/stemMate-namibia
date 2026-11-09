import assert from 'node:assert/strict';
import {prepareTeachingDraft,readTeachingMaterial} from './teacherPreparationTransport';
const originalFetch=globalThis.fetch;
try{
 let calls=0,aborted=false;
 globalThis.fetch=async(_input,init)=>{calls++;return new Promise((_resolve,reject)=>{
  init!.signal!.addEventListener('abort',()=>{aborted=true;reject(new DOMException('Aborted','AbortError'));},{once:true});
 });};
 await assert.rejects(()=>prepareTeachingDraft({topic:'cells'},10),/Your writing and any previous draft are still here/);
 assert.equal(aborted,true);assert.equal(calls,1,'Never retry automatically and consume additional allowance');
 globalThis.fetch=async()=>new Response(JSON.stringify({learner_draft:'Predict first'}),{status:200});
 assert.equal((await prepareTeachingDraft<{learner_draft:string}>({},1000)).learner_draft,'Predict first');
 globalThis.fetch=async()=>new Response(JSON.stringify({detail:'Teacher access required.'}),{status:403});
 await assert.rejects(()=>prepareTeachingDraft({},1000),/Teacher access required/);
 let sentBody='';let sentPath='';
 globalThis.fetch=async(input,init)=>{sentPath=String(input);sentBody=String(init?.body);return new Response(JSON.stringify({transcription:'Fictional notes'}),{status:200});};
 assert.equal((await readTeachingMaterial<{transcription:string}>('fictional-image',true,1000)).transcription,'Fictional notes');
 assert.match(sentPath,/teacher\/materials\/transcribe$/);
 assert.deepEqual(JSON.parse(sentBody),{image:'fictional-image',consent:true});
 globalThis.fetch=async(_input,init)=>new Promise((_resolve,reject)=>{init!.signal!.addEventListener('abort',()=>reject(new DOMException('Aborted','AbortError')),{once:true});});
 await assert.rejects(()=>readTeachingMaterial('fictional-image',true,10),/lesson notes have not changed/);
}finally{globalThis.fetch=originalFetch;}
console.log('Teacher preparation stalled connection, no automatic retry and server errors passed.');
