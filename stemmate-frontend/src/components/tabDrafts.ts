// Optional, tab-scoped recovery only. Never store authentication or AI responses.
export const DRAFT_KEY='stemmate.tab-drafts.v1';
export const DRAFT_TTL=30*60*1000;
export interface Draft {id:string;label:string;stage:string;question:string;text:string;expires:number}
interface Envelope {owner:number;enabled:boolean;drafts:Draft[]}
interface Storage {getItem(key:string):string|null;setItem(key:string,value:string):void;removeItem(key:string):void}
function storage():Storage{return window.sessionStorage;}
function announce(){if(typeof window!=='undefined')window.dispatchEvent(new Event('stemmate-drafts'));}
export function clearTabDrafts(store?:Storage){try{(store??storage()).removeItem(DRAFT_KEY);}catch{/* Storage may be disabled. */}announce();}
export function readDrafts(owner:number,store?:Storage,now=Date.now()):Envelope{
 const empty={owner,enabled:false,drafts:[]};
 try{
  const target=store??storage(),raw=target.getItem(DRAFT_KEY);
  if(!raw)return empty;
  if(raw.length>40000)throw Error('Invalid size');
  const value=JSON.parse(raw) as Envelope;
  if(value.owner!==owner||value.enabled!==true||!Array.isArray(value.drafts)||value.drafts.length>4)throw Error('Invalid owner or shape');
  const drafts=value.drafts.filter(d=>d&&typeof d.id==='string'&&d.id.length<=160&&typeof d.label==='string'&&d.label.length<=240&&typeof d.stage==='string'&&d.stage.length<=80&&typeof d.question==='string'&&d.question.length<=3000&&typeof d.text==='string'&&d.text.length<=4000&&d.text.trim()&&Number.isFinite(d.expires)&&d.expires>now&&d.expires<=now+DRAFT_TTL);
  // Rebuild an allowlist: unknown fields (including credentials) are discarded.
  const clean={owner,enabled:true,drafts:drafts.map(d=>({id:d.id,label:d.label,stage:d.stage,question:d.question,text:d.text,expires:d.expires}))};
  try{target.setItem(DRAFT_KEY,JSON.stringify(clean));}catch{/* A read must not erase an existing draft when writes are blocked. */}
  return clean;
 }catch{try{(store??storage()).removeItem(DRAFT_KEY);}catch{/* No storage access. */}return empty;}
}
export function enableDrafts(owner:number,enabled:boolean,store?:Storage){
 try{const target=store??storage();if(!enabled)target.removeItem(DRAFT_KEY);else target.setItem(DRAFT_KEY,JSON.stringify({owner,enabled:true,drafts:readDrafts(owner,target).drafts}));announce();return true;}catch{return false;}
}
export function saveDraft(owner:number,draft:Omit<Draft,'expires'>,store?:Storage,now=Date.now()){
 try{
  const target=store??storage(),value=readDrafts(owner,target,now);
  if(!value.enabled)return false;
  const remaining=value.drafts.filter(d=>d.id!==draft.id);
  const clean={id:draft.id.slice(0,160),label:draft.label.slice(0,240),stage:draft.stage.slice(0,80),question:draft.question.slice(0,3000),text:draft.text.slice(0,4000),expires:now+DRAFT_TTL};
  value.drafts=clean.text.trim()?[clean,...remaining].slice(0,4):remaining;
  target.setItem(DRAFT_KEY,JSON.stringify(value));announce();return true;
 }catch{return false;}
}
export function removeDraft(owner:number,id:string,store?:Storage){
 try{const target=store??storage(),value=readDrafts(owner,target);value.drafts=value.drafts.filter(d=>d.id!==id);if(value.enabled)target.setItem(DRAFT_KEY,JSON.stringify(value));announce();}catch{/* No storage access. */}
}
