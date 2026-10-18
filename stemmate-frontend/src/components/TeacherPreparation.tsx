import {lazy,Suspense,useId,useRef,useState} from 'react';
import {request,type Classroom,type Course} from '../api/stemmateApi';
import DisplayBoundary from './DisplayBoundary';
const MessageContent=lazy(()=>import('./MessageContent'));
interface Draft {learner_draft:string;teacher_guide:string;review_notes:string}
export default function TeacherPreparation({courses,classes,active}:{courses:Course[];classes:Classroom[];active:boolean}){
 const id=useId(),pending=useRef(false),resultRef=useRef<HTMLHeadingElement>(null),errorRef=useRef<HTMLParagraphElement>(null);
 const [mode,setMode]=useState('lesson'),[topic,setTopic]=useState(''),[objective,setObjective]=useState(''),[content,setContent]=useState(''),[resources,setResources]=useState(''),[minutes,setMinutes]=useState(40);
 const [consent,setConsent]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[draft,setDraft]=useState<Draft|null>(null),[reviewed,setReviewed]=useState(false),[dirty,setDirty]=useState(false);
 const [subject,setSubject]=useState('mathematics'),[grade,setGrade]=useState(10),[year,setYear]=useState(2027),[courseId,setCourseId]=useState('na-nssco'),[prefill,setPrefill]=useState('');
 const available=courses.filter(c=>c.subject===subject&&c.grades.includes(grade)&&c.exam_years.includes(year));
 const course=available.find(c=>c.id===courseId)??available.find(c=>c.id.replace(/-202[67]$/,'')===courseId.replace(/-202[67]$/,''))??available[0];
 const blocked=busy||!active;
 function changeContext(){setPrefill('');changed();}
 function fromClass(value:string){const c=classes.find(item=>String(item.id)===value);setPrefill(value);if(c){setSubject(c.course.subject);setGrade(c.grade);setYear(c.exam_year);setCourseId(c.course_id);changed();}}

 function changed(){setReviewed(false);if(draft)setDirty(true);}
 function edit(key:keyof Draft,text:string){setDraft(v=>v?{...v,[key]:text}:v);setReviewed(false);}
 async function generate(){
  if(pending.current||!active||!course)return;pending.current=true;setBusy(true);setError('');setReviewed(false);
  try{const value=await request<Draft>('/teacher/preparation','POST',{course_id:course.id,grade,exam_year:year,mode,topic,objective,content,resources,minutes,consent});setDraft(value);setDirty(false);requestAnimationFrame(()=>resultRef.current?.focus());}
  catch(e){setError(e instanceof TypeError?'Connection interrupted. Your writing is still here. Reconnect and try again.':e instanceof Error?e.message:'Please try again.');requestAnimationFrame(()=>errorRef.current?.focus());}
  finally{pending.current=false;setBusy(false);}
 }
 return <details className="card teacher-preparation"><summary>Prepare teaching materials</summary><p>Draft, adapt and review. Nothing is assigned or sent to learners. Planning works even when learner practice is paused.</p><p>No class or student list needed. Choose your teaching context below, or use a class to prefill it. This does not connect or share the draft with that class.</p>
 <label htmlFor={`${id}-prefill`}>Use an existing class to prefill choices (optional)</label><select id={`${id}-prefill`} value={prefill} disabled={blocked} onChange={e=>fromClass(e.target.value)}><option value="">No class—choose directly</option>{classes.map(c=><option key={c.id} value={c.id}>{c.name} · Grade {c.grade} · {c.course.subject_label}</option>)}</select>
 <p>{course?`${course.subject_label} · Grade ${grade} · ${course.pathway} ${course.qualification} · Exam ${year}`:'Loading curriculum choices…'}</p>
 <form onSubmit={e=>{e.preventDefault();void generate();}}>
 <label htmlFor={`${id}-subject`}>Preparation subject</label><select id={`${id}-subject`} value={subject} disabled={blocked} onChange={e=>{setSubject(e.target.value);changeContext();}}>{[['mathematics','Mathematics'],['physics','Physics'],['chemistry','Chemistry'],['biology','Biology'],['computing','Computing / Computer Science']].map(([value,label])=><option key={value} value={value}>{label}</option>)}</select>
 <label htmlFor={`${id}-grade`}>Preparation grade</label><select id={`${id}-grade`} value={grade} disabled={blocked} onChange={e=>{setGrade(Number(e.target.value));changeContext();}}>{[10,11,12].map(g=><option key={g}>{g}</option>)}</select>
 <label htmlFor={`${id}-year`}>Preparation examination year</label><select id={`${id}-year`} value={year} disabled={blocked} onChange={e=>{setYear(Number(e.target.value));changeContext();}}><option>2026</option><option>2027</option></select>
 <label htmlFor={`${id}-course`}>Preparation curriculum and qualification</label><select id={`${id}-course`} value={course?.id??''} disabled={blocked||!course} onChange={e=>{setCourseId(e.target.value);changeContext();}}>{available.map(c=><option key={c.id} value={c.id}>{c.pathway} · {c.qualification} · {c.syllabus_subject} {c.code}</option>)}</select>
 <label htmlFor={`${id}-mode`}>What would you like to prepare?</label><select id={`${id}-mode`} value={mode} disabled={blocked} onChange={e=>{setMode(e.target.value);changed();}}><option value="lesson">Plan a lesson</option><option value="adapt">Adapt an activity</option><option value="questions">Create practice questions</option></select>
 <label htmlFor={`${id}-topic`}>Topic (required)</label><input id={`${id}-topic`} value={topic} maxLength={300} required disabled={blocked} onChange={e=>{setTopic(e.target.value);changed();}}/>
 <label htmlFor={`${id}-objective`}>Curriculum objective (required)</label><textarea id={`${id}-objective`} value={objective} maxLength={1500} required disabled={blocked} onChange={e=>{setObjective(e.target.value);changed();}} placeholder="Paste the objective you want learners to work towards."/>
 <p>Use the objective from your syllabus. AI drafts are not verified curriculum alignment.</p>
 <label htmlFor={`${id}-content`}>{mode==='lesson'?'Notes or lesson content (optional)':mode==='adapt'?'Activity to adapt (required)':'Lesson content for five questions (required)'}</label><textarea id={`${id}-content`} value={content} maxLength={6000} required={mode!=='lesson'} disabled={blocked} onChange={e=>{setContent(e.target.value);changed();}}/>
 <details><summary>Time and materials</summary><label htmlFor={`${id}-minutes`}>Available minutes</label><input id={`${id}-minutes`} type="number" min={10} max={120} value={minutes} disabled={blocked} onChange={e=>{setMinutes(Number(e.target.value));changed();}}/><label htmlFor={`${id}-resources`}>Available materials and accessibility needs (optional)</label><textarea id={`${id}-resources`} value={resources} maxLength={1000} disabled={blocked} onChange={e=>{setResources(e.target.value);changed();}} placeholder="For example: board only, no printing; use short instructions. Do not identify learners."/></details>
 <label className="check"><input type="checkbox" checked={consent} disabled={blocked} onChange={e=>setConsent(e.target.checked)}/>I agree to send these planning inputs and the selected course context to the AI provider. I have removed personal learner details and have permission to use the supplied content.</label>
 <p>Provider retention rules apply. Inputs and drafts are not saved by STEMMate or included in reports. They stay in this view while you switch tabs inside the app; refreshing or signing out clears them. Prefilling from a class or changing curriculum keeps your writing but marks any existing draft as out of date. Tab chat recovery does not include these drafts. Copy important work before leaving.</p>
 <button disabled={blocked||!course||!consent||!topic.trim()||!objective.trim()||(mode!=='lesson'&&!content.trim())}>{busy?'Preparing…':draft?'Generate a replacement draft':'Generate draft'}</button>{draft&&<p>A successful replacement overwrites the draft below. Copy any edits you want to keep first.</p>}
 </form>
 {error&&<p role="alert" ref={errorRef} tabIndex={-1} className="error">{error}</p>}
 {draft&&<section aria-label="Teaching draft"><h3 ref={resultRef} tabIndex={-1}>Review and edit your draft</h3>{dirty&&<p role="status">Planning inputs changed. The draft below is from your earlier inputs; generate again to update it.</p>}<label htmlFor={`${id}-learner`}>Learner-facing draft—edit, then select and copy</label><textarea id={`${id}-learner`} className="preparation-output" value={draft.learner_draft} maxLength={14000} disabled={blocked} onChange={e=>edit('learner_draft',e.target.value)}/>
 <details><summary>Preview learner materials</summary><DisplayBoundary fallback={<p>Formatted preview could not load. Use the editable text above.</p>}><Suspense fallback={<p role="status">Loading formatted preview…</p>}><MessageContent content={draft.learner_draft}/></Suspense></DisplayBoundary></details>
 <details><summary>Teacher guide and answers—keep separate from learner materials</summary><label htmlFor={`${id}-guide`}>Teacher guide—edit, then select and copy</label><textarea id={`${id}-guide`} className="preparation-output" value={draft.teacher_guide} maxLength={10000} disabled={blocked} onChange={e=>edit('teacher_guide',e.target.value)}/><details><summary>Preview teacher guide</summary><DisplayBoundary fallback={<p>Formatted preview could not load. Use the editable text above.</p>}><Suspense fallback={<p role="status">Loading formatted preview…</p>}><MessageContent content={draft.teacher_guide}/></Suspense></DisplayBoundary></details></details>
 <label htmlFor={`${id}-review`}>Assumptions and review notes</label><textarea id={`${id}-review`} value={draft.review_notes} maxLength={4000} disabled={blocked} onChange={e=>edit('review_notes',e.target.value)}/>
 <label className="check"><input type="checkbox" checked={reviewed} disabled={blocked||dirty||!draft.learner_draft.trim()||!draft.teacher_guide.trim()||!draft.review_notes.trim()} onChange={e=>setReviewed(e.target.checked)}/>I checked accuracy, answer separation, curriculum fit, timing, safety, accessibility and the independent check.</label><p role="status">{reviewed?'Marked reviewed by you. Copy only the learner-facing draft when sharing activities. This is not automatic validation.':'Teacher review needed before use. AI can include mistakes or leak answers into prompts; inspect both sections.'}</p>
 </section>}
 </details>;
}
