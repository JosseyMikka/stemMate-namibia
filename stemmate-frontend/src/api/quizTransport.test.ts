import assert from 'node:assert/strict';
import {quizApi} from './quizTransport';
const originalFetch=globalThis.fetch;
try{
 let aborted=false;
 globalThis.fetch=async(_input,init)=>new Promise((_resolve,reject)=>{
  init!.signal!.addEventListener('abort',()=>{aborted=true;reject(new DOMException('Aborted','AbortError'));},{once:true});
 });
 await assert.rejects(()=>quizApi('/quiz/session','POST',{action:'answer',number:2},'temporary-test-token',10),/took too long/);
 assert.equal(aborted,true);
 let body='';
 globalThis.fetch=async(_input,init)=>{body=String(init?.body);return new Response(JSON.stringify({number:2,reviewed:1}),{status:200});};
 const retry=await quizApi<{number:number;reviewed:number}>('/quiz/session','POST',{action:'answer',number:2},'temporary-test-token',1000);
 assert.equal(retry.number,2);assert.equal(retry.reviewed,1);assert.equal(JSON.parse(body).number,2);
 globalThis.fetch=async()=>new Response(JSON.stringify({detail:'Quiz expired. Start a new quiz.'}),{status:404});
 await assert.rejects(()=>quizApi('/quiz/session','POST',{},undefined,1000),/Quiz expired/);
}finally{globalThis.fetch=originalFetch;}
console.log('Quiz transport timeout, safe retry payload and server error handling passed.');
