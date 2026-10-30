import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {act} from 'react';
import type {Classroom, Lesson} from '../api/stemmateApi';

const dom=new JSDOM('<!doctype html><div id="root"></div>',{url:'http://localhost'});
Object.assign(globalThis,{window:dom.window,document:dom.window.document,Event:dom.window.Event,
 HTMLElement:dom.window.HTMLElement,HTMLTextAreaElement:dom.window.HTMLTextAreaElement,
 IS_REACT_ACT_ENVIRONMENT:true,requestAnimationFrame:()=>0});
const {createRoot}=await import('react-dom/client');
const {default:Chat}=await import('./Chat');
const classroom:Classroom={id:1,name:'Math A',grade:10,course_id:'na-nssco',exam_year:2027,
 paused:false,max_hints:2,evaluation_enabled:false,voice_input_enabled:false,
 course:{id:'na-nssco',pack_id:'na-nssco',pack_version:'test-release',subject:'mathematics',subject_label:'Mathematics',syllabus_subject:'Mathematics',
 safety_notice:'Paper reasoning only',pathway:'Namibia',qualification:'NSSCO',code:'6131',version:'test',
 grades:[10],exam_years:[2027],source:'test',coverage_notice:'Test scope',topics:[{id:'linear',label:'Linear equations'}]}};
const lesson:Lesson={stage:'attempt',challenge:'Solve x + 2 = 5',hints:[],hints_used:0,max_hints:2,direct_used:false};
const calls:{path:string;body:Record<string,unknown>;token:string|null}[]=[];
let fail=false;
let savedStage:Lesson['stage']='attempt';
globalThis.fetch=async(url,init)=>{
 const path=new URL(String(url)).pathname,body=JSON.parse(String(init?.body??'{}'));
 const token=new Headers(init?.headers).get('X-Learning-Token');calls.push({path,body,token});
 if(fail)return new Response(JSON.stringify({detail:'Tutor unavailable'}),{status:503});
 if(path==='/learning')return Response.json({...lesson,token:token?'separate-token':'saved-token',challenge:token?'Explain inverse operations':'Solve x + 2 = 5'});
 assert.equal(path,'/learning/session');
 if(body.action==='continue')savedStage=savedStage==='attempt'?'explain':'independent';
 return Response.json({...lesson,stage:savedStage,hints:body.action==='hint'?['Use balance']:[],hints_used:body.action==='hint'?1:0});
};
const root=createRoot(document.getElementById('root')!);
await act(async()=>root.render(<Chat classroom={classroom} user={{id:2,username:'learner',role:'learner'}}/>));
function visible<T extends Element>(selector:string):T[]{return [...document.querySelectorAll<T>(selector)].filter(e=>!e.closest('[hidden]'));}
function button(text:string){const b=visible<HTMLButtonElement>('button').find(b=>b.textContent===text);assert.ok(b,`Missing button ${text}`);return b;}
async function click(text:string){await act(async()=>button(text).click());}
async function type(text:string){await act(async()=>{
 const field=visible<HTMLTextAreaElement>('textarea')[0];assert.ok(field);
 Object.getOwnPropertyDescriptor(dom.window.HTMLTextAreaElement.prototype,'value')!.set!.call(field,text);
 field.dispatchEvent(new dom.window.Event('input',{bubbles:true}));
});}
async function send(){await act(async()=>visible<HTMLFormElement>('form')[0].dispatchEvent(new dom.window.Event('submit',{bubbles:true,cancelable:true})));}
await click('Try a small example');
assert.equal(calls.at(-1)?.body.pack_version,'test-release');
await type('PRIVATE_ATTEMPT: subtract two');await send();
assert.deepEqual(calls.at(-1),{path:'/learning/session',body:{action:'continue',attempted:true},token:'saved-token'});
assert.ok(!JSON.stringify(calls).includes('PRIVATE_ATTEMPT'));
await click('Give me a hint');
await type('PRIVATE_UNFINISHED_REASONING');
await click('Ask a new question');
assert.equal(visible<HTMLTextAreaElement>('textarea')[0].value,'');
await type('Why do inverse operations preserve equality?');
fail=true;await send();
assert.equal(visible<HTMLTextAreaElement>('textarea')[0].value,'Why do inverse operations preserve equality?');
await click('Back to saved lesson');
assert.equal(visible<HTMLTextAreaElement>('textarea')[0].value,'PRIVATE_UNFINISHED_REASONING');
assert.match(visible('section')[0].textContent??'',/Use balance/);
await click('Open separate question');
assert.equal(visible<HTMLTextAreaElement>('textarea')[0].value,'Why do inverse operations preserve equality?');
fail=false;await send();
assert.equal(calls.at(-1)?.path,'/learning');
assert.equal(calls.at(-1)?.body.topic,'Why do inverse operations preserve equality?');
assert.equal(calls.at(-1)?.body.pack_version,'test-release');
assert.equal(calls.at(-1)?.token,'saved-token');
assert.match(visible('section')[0].textContent??'',/Explain inverse operations/);
await type('SEPARATE_UNFINISHED_WORK');
await click('Back to saved lesson');
assert.equal(visible<HTMLTextAreaElement>('textarea')[0].value,'PRIVATE_UNFINISHED_REASONING');
assert.match(visible('section')[0].textContent??'',/PRIVATE_ATTEMPT/);
await click('Open separate question');
assert.equal(visible<HTMLTextAreaElement>('textarea')[0].value,'SEPARATE_UNFINISHED_WORK');
await click('Back to saved lesson');
await click('Open separate question');
await send(); // Enter the separate lesson's independent check.
assert.equal(button('Back to saved lesson').disabled,true);
await click('New chat'); // Explicit reset leaves that check, as in the original chat.
await click('Back to saved lesson');
await send(); // The saved lesson still uses its own token and stage.
assert.equal(calls.at(-1)?.token,'saved-token');
assert.equal(button('Open separate question').disabled,true); // independent check
const count=calls.length;await click('Open separate question');assert.equal(calls.length,count);
await act(async()=>root.render(<Chat classroom={{...classroom,paused:true}} user={{id:2,username:'learner',role:'learner'}}/>));
assert.equal(visible<HTMLTextAreaElement>('textarea')[0].disabled,true);
await act(async()=>root.unmount());dom.window.close();
console.log('Guided response privacy, separate question routing, retry, restoration and independent/pause gates passed.');
