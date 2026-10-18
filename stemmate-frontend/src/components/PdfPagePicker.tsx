import {useEffect,useId,useRef,useState} from 'react';
import {GlobalWorkerOptions,type PDFDocumentLoadingTask,type PDFDocumentProxy} from 'pdfjs-dist/legacy/build/pdf.mjs';
import workerUrl from 'pdfjs-dist/legacy/build/pdf.worker.mjs?url';
import sampleUrl from './fixtures/scanned-practice.pdf?url';
import {openPdf,PDF_BYTE_LIMIT,PDF_PAGE_LIMIT,renderPage} from './pdfPages';
GlobalWorkerOptions.workerSrc=workerUrl;
export default function PdfPagePicker({disabled,consent,onRead,onBusy}:{disabled:boolean;consent:boolean;onRead:(image:string)=>Promise<void>;onBusy:(busy:boolean)=>void}){
 const mounted=useRef(true),running=useRef(false),id=useId(),doc=useRef<PDFDocumentProxy|null>(null),task=useRef<PDFDocumentLoadingTask|null>(null);
 const [count,setCount]=useState(0),[page,setPage]=useState(1),[image,setImage]=useState(''),[rendered,setRendered]=useState(0),[error,setError]=useState(''),[busy,setBusy]=useState(false),[fileKey,setFileKey]=useState(0),[sample,setSample]=useState(false);
 useEffect(()=>{mounted.current=true;return ()=>{mounted.current=false;void task.current?.destroy();doc.current=null;};},[]);
 async function run(action:()=>Promise<void>){
  if(running.current)return;
  running.current=true;setBusy(true);onBusy(true);setError('');
  try{await action();}catch(e){if(mounted.current)setError(e instanceof Error?e.message:'Could not read this PDF. Try a photograph instead.');}
  finally{running.current=false;if(mounted.current){setBusy(false);onBusy(false);}}
 }
 async function load(data:Uint8Array){
  await task.current?.destroy();if(!mounted.current)return;doc.current=null;setCount(0);setImage('');setRendered(0);setPage(1);
  const loading=openPdf(data);task.current=loading;
  let passwordProtected=false;
  loading.onPassword=()=>{passwordProtected=true;void loading.destroy();};
  let pdf:PDFDocumentProxy;
  try{pdf=await loading.promise;}catch(e){
   if(passwordProtected)throw new Error('Password-protected PDFs are not supported. Use an unlocked copy you are permitted to use.',{cause:e});
   throw new Error('Could not open this PDF. It may be damaged or unsupported. Try a photograph of the page instead.',{cause:e});
  }
  if(!mounted.current){await loading.destroy();return;}
  if(pdf.numPages>PDF_PAGE_LIMIT){await loading.destroy();throw new Error('Choose a PDF with at most 100 pages.');}
  doc.current=pdf;setCount(pdf.numPages);
 }
 const blocked=disabled||busy;
 return <fieldset disabled={blocked}><legend>Choose a PDF page</legend>
 <p>The PDF stays in this browser. Only the selected page image is sent to AI when you choose Read this page. Check the preview for personal details first. Maximum 10 MB and 100 pages; password-protected PDFs are not supported.</p>
 <label htmlFor={`${id}-file`}>PDF file</label>
 <input key={fileKey} id={`${id}-file`} type="file" accept="application/pdf,.pdf" onChange={e=>{
  const file=e.target.files?.[0];if(!file)return;
  void run(async()=>{
   setSample(false);setCount(0);setImage('');
   // Reject before reading the whole file. Discard any previous page on failure.
   if(file.size>PDF_BYTE_LIMIT){await task.current?.destroy();doc.current=null;setCount(0);setImage('');throw new Error('Choose a PDF smaller than 10 MB.');}
   await load(new Uint8Array(await file.arrayBuffer()));
  });
 }}/>
 <button type="button" className="secondary" onClick={()=>void run(async()=>{setFileKey(n=>n+1);setSample(true);setCount(0);setImage('');const response=await fetch(sampleUrl);if(!response.ok)throw new Error('The sample could not load. Choose your own PDF instead.');await load(new Uint8Array(await response.arrayBuffer()));})}>Try a sample PDF</button>
 {sample&&count>0&&<p role="status">Fictional sample loaded: page 1 is a question; page 2 is a scanned answer with an intentional mistake. This is not an official exam paper.</p>}
 {count>0&&<><label htmlFor={`${id}-page`}>Page number (1–{count})</label><input id={`${id}-page`} type="number" min={1} max={count} value={page} onChange={e=>{setPage(Number(e.target.value));setImage('');setRendered(0);}}/><button type="button" onClick={()=>void run(async()=>{if(!doc.current)return;setImage('');const preview=await renderPage(doc.current,page);setImage(preview);setRendered(page);})}>Preview selected page</button></>}
 {image&&<figure><img src={image} alt={`Selected PDF page ${rendered}. Check the original document if you cannot read this preview.`} style={{maxWidth:'100%',maxHeight:600,objectFit:'contain'}}/><figcaption>Page {rendered} of {count}. No other pages will be sent. A page image may be hard to read with a screen reader; the editable transcription is available after reading.</figcaption><button type="button" disabled={!consent||blocked} onClick={()=>void run(()=>onRead(image.split(',')[1]))}>Read this page</button>{!consent&&<p>Agree to AI processing above before sending this page.</p>}</figure>}
 {busy&&<p role="status">Preparing selected PDF page…</p>}{error&&<p role="alert">{error}</p>}
 </fieldset>;
}
