import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {act} from 'react';
const dom=new JSDOM('<!doctype html><div id="root"></div>',{url:'http://localhost'});
Object.assign(globalThis,{window:dom.window,document:dom.window.document,Event:dom.window.Event,HTMLElement:dom.window.HTMLElement,IS_REACT_ACT_ENVIRONMENT:true,requestAnimationFrame:()=>0});
const {createRoot}=await import('react-dom/client');
const {default:FamilyResearch}=await import('./FamilyResearch');
const calls:{path:string;method:string;body:unknown}[]=[];
let participate=false;
const link={id:4,learner_alias:'child_alias',guardian_alias:'adult_alias',confirmed:1,verified:1,share:0};
let enabled=false;
globalThis.fetch=async(url,init)=>{
 const path=new URL(String(url)).pathname,method=init?.method??'GET';const body=init?.body?JSON.parse(String(init.body)):undefined;calls.push({path,method,body});
 if(path==='/family')return Response.json([link]);
 if(path==='/research'&&method==='GET')return Response.json({study:enabled?{study_id:'test',version:'v1',title:'Fictional study',institution:'Test only',approval_reference:'NOT APPROVED',information:'Read this fictional study information.',provider_notice:'Provider test notice',withdrawal_notice:'Withdrawal test notice',contact:'test',independent_contact:'test',retention_days:30}:null,choice:{participate:participate?1:0,survey:0,version:'v1'},permissions:[],eligible:participate,notice:'Research is optional.'});
 if(path==='/research/choice'){participate=true;return Response.json({saved:true});}
 return Response.json({withdrawn:true,notice:'Live data removed.'});
};
const root=createRoot(document.getElementById('root')!);
async function render(role:'learner'|'guardian'){await act(async()=>root.render(<FamilyResearch key={role} user={{id:role==='learner'?2:3,username:role,role}} courses={[]} active/>));}
function button(text:string){const b=[...document.querySelectorAll('button')].find(b=>b.textContent===text);assert.ok(b,`Missing ${text}`);return b;}
await render('guardian');
assert.match(document.body.textContent??'',/Research collection is disabled/);
assert.ok(!document.body.textContent?.includes('Join as an adult guardian supporter'));
assert.match(document.body.textContent??'',/Home learning works without a school account/);
await act(async()=>button('Withdraw research permission for child_alias').click());
assert.equal(calls.at(-3)?.path,'/research/permission/4');
assert.equal(calls.at(-3)?.method,'DELETE'); // still available with research disabled
assert.ok(!calls.some(c=>c.path==='/research/choice'));
enabled=true;await render('learner');
assert.equal(button('I agree to join the study').disabled,true);
assert.ok([...document.querySelectorAll<HTMLInputElement>('input[type=checkbox]')].every(e=>!e.checked));
await act(async()=>document.querySelector<HTMLInputElement>('input[type=checkbox]')!.click());
await act(async()=>button('I agree to join the study').click());
assert.deepEqual(calls.find(c=>c.path==='/research/choice')?.body,{version:'v1',participate:true,survey:false});
assert.ok(!document.body.textContent?.includes('Give research permission for'));
assert.equal(button('I agree to join the study').disabled,true); // reading acknowledgement resets after refresh
await act(async()=>button('Decline or withdraw my own research participation').click());
assert.ok(calls.some(c=>c.path==='/research'&&c.method==='DELETE'));
await act(async()=>root.unmount());dom.window.close();
console.log('Family role separation, disabled research, unchecked consent, versioned assent and withdrawal UI passed.');
