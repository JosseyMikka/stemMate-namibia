import {lazy,Suspense,useId,useRef,useState} from 'react';
import {readTeachingMaterial} from '../api/teacherPreparationTransport';
import {appendConfirmedMaterial} from './teachingMaterials';
import DisplayBoundary from './DisplayBoundary';
const PdfPagePicker=lazy(()=>import('./PdfPagePicker'));
export default function TeacherMaterials({disabled,existing,onUse,onClose,onBusy}:{disabled:boolean;existing:string;onUse:(text:string)=>void;onClose:()=>void;onBusy:(busy:boolean)=>void}){
 const id=useId(),pending=useRef(false);
 const [kind,setKind]=useState('image'),[consent,setConsent]=useState(false),[text,setText]=useState(''),[confirmed,setConfirmed]=useState(false),[busy,setBusy]=useState(false),[pdfBusy,setPdfBusy]=useState(false),[error,setError]=useState('');
 const blocked=disabled||busy||pdfBusy;
 async function read(image:string){
  setConfirmed(false);
  const r=await readTeachingMaterial<{transcription:string}>(image,consent);
  if(r.transcription.length>6000)throw new Error('The transcription is too long for lesson notes. Use a cropped image or type only the relevant section. Your existing notes have not changed.');
  setText(r.transcription);
 }
 async function imageFile(file:File){
  if(pending.current)return;pending.current=true;setBusy(true);onBusy(true);setError('');
  try{
   if(!['image/png','image/jpeg'].includes(file.type)||file.size>2000000)throw new Error('Choose a PNG or JPEG smaller than 2 MB.');
   const data=await new Promise<string>((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(String(r.result).split(',')[1]);r.onerror=()=>reject(new Error('Could not read this image.'));r.readAsDataURL(file);});
   await read(data);
  }catch(e){setError(e instanceof Error?e.message:'Could not read these materials. Type the relevant content instead.');}
  finally{pending.current=false;setBusy(false);onBusy(false);}
 }
 return <section className="panel" aria-label="Attach teaching materials"><h3>Attach materials</h3><p>Read a photo or one PDF page, check the text, then add it to your lesson notes. Existing notes are kept.</p>
 <p className="chat-small">Remove names and personal details; use material you have permission to process. Selected images go to the AI provider for transcription. Provider retention rules apply. STEMMate does not save these files or transcripts to its database or reports. Closing clears this attachment view; confirmed text already added to notes stays until you edit it, refresh or sign out.</p>
 <button type="button" disabled={blocked} onClick={onClose}>Close materials</button>
 <div role="group" aria-label="Material format"><button type="button" aria-pressed={kind==='image'} disabled={blocked} onClick={()=>setKind('image')}>Image</button><button type="button" aria-pressed={kind==='pdf'} disabled={blocked} onClick={()=>setKind('pdf')}>PDF</button></div>
 <label className="check"><input type="checkbox" checked={consent} disabled={blocked} onChange={e=>setConsent(e.target.checked)}/>I have permission to use this material and agree to send the selected image or PDF page to the AI provider for transcription.</label>
 {kind==='image'?<><label htmlFor={`${id}-image`}>Teaching image (PNG or JPEG, maximum 2 MB and 12 million pixels)</label><input id={`${id}-image`} type="file" accept="image/png,image/jpeg" disabled={blocked||!consent} onChange={e=>{const file=e.target.files?.[0];e.target.value='';if(file)void imageFile(file);}}/></>:<DisplayBoundary fallback={<p role="alert">PDF support could not load. Close this view and use a photo or paste text instead.</p>}><Suspense fallback={<p role="status">Loading PDF support…</p>}><PdfPagePicker disabled={disabled||busy} consent={consent} onRead={read} onBusy={value=>{setPdfBusy(value);onBusy(value);}}/></Suspense></DisplayBoundary>}
 <label htmlFor={`${id}-text`}>Editable material transcription</label><textarea id={`${id}-text`} value={text} maxLength={6000} disabled={blocked} onChange={e=>{setText(e.target.value);setConfirmed(false);}}/>
 <label className="check"><input type="checkbox" checked={confirmed} disabled={blocked||!text.trim()} onChange={e=>setConfirmed(e.target.checked)}/>I checked this against the original, corrected symbols and removed personal details.</label>
 <button type="button" disabled={blocked||!confirmed||!text.trim()||/\[unclear\]/i.test(text)} onClick={()=>{try{onUse(appendConfirmedMaterial(existing,text,confirmed));}catch(e){setError(e instanceof Error?e.message:'Check your notes first.');}}}>Use confirmed text in lesson notes</button>
 {busy&&<p role="status">Reading the selected image…</p>}{error&&<p role="alert">{error}</p>}
 </section>;
}
