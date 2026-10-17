import {useEffect, useRef, useState} from 'react';
import {request, type Classroom, type User} from '../api/stemmateApi';
import VoiceTools from './VoiceTools';
import {readNotebook} from './projectNotebook';
type Bloom='remember'|'understand'|'apply'|'analyse'|'evaluate'|'create';
interface Project {id?:number;revision:number;title:string;question:string;brief:string;artifact:string;criteria:string;resources:string;topic_id:string;bloom:Bloom[];published:boolean}
const bloomLabels:Record<Bloom,string>={remember:'Remember — recall relevant ideas',understand:'Understand — explain in your own words',apply:'Apply — use an idea in your design',analyse:'Analyse — connect evidence and causes',evaluate:'Evaluate — judge against criteria',create:'Create — make and improve an artifact'};
const templates:Record<string,[string,string,string]>={
 mathematics:['Plan a fair school-event budget','How can a budget model help a school event stay affordable when attendance changes?','A paper or spreadsheet budget model with assumptions, two scenarios and a justified recommendation.'],
 physics:['Explain a model transport design','How can supplied motion data help us improve a fictional delivery-cart design?','An annotated paper model or simulation storyboard comparing two designs using fictional motion data. No construction or experiments.'],
 chemistry:['Make an atom-conservation teaching model','How can a reusable paper model help another learner explain conservation of atoms?','A paper particle-model kit and instruction sheet, tested on supplied equations and revised after peer feedback. Do not perform reactions.'],
 biology:['Build an evidence-based enzyme exhibit','How can an interactive paper exhibit explain enzyme-rate patterns without overstating the evidence?','A paper exhibit using fictional temperature/rate data, uncertainty notes and a revised explanation after feedback. No biological samples.'],
 computing:['Design a search teaching tool','How can a paper prototype help a younger learner understand why binary search needs sorted data?','A paper interface or pseudocode prototype, trace tables for present/absent values and a revision log. No code execution or real personal data.']
};
const anchors:Record<string,string>={mathematics:'proportion',physics:'motion',chemistry:'atoms',biology:'enzymes',computing:'search'};
function template(c:Classroom):Project{
 const [title,question,artifact]=templates[c.course.subject];
 return {revision:0,title,question,artifact,topic_id:c.course.topics.some(t=>t.id===anchors[c.course.subject])?anchors[c.course.subject]:c.course.topics[0].id,bloom:['understand','apply','analyse','evaluate','create'],published:false,
 brief:'Choose an audience and a design approach. Identify what you need to learn, compare at least two possible designs, make a first version, test it against evidence, seek feedback and revise. Explain what changed and why. Work individually or in a teacher-approved team; record your own contribution without naming others.',
 criteria:'Teacher review: accuracy and assumptions; reasons for design choices; relevant test evidence; response to feedback; useful artifact for the chosen audience; individual explanation and unaided transfer. Agree observable success criteria before making.',
 resources:'Teacher: supply approved fictional data, topic references, materials and a schedule with checkpoints. Agree a safe audience for sharing. Paper and pencil are sufficient; no purchases, experiments, uploads or public posting are required.'};
}
const phases=[
 {title:'Question and investigate',bloom:'Remember · Understand',prompt:'What do you already think? Predict an outcome. What do you need to find out? Record an explanation from an approved source, identify its limits and write your own interpretation. Agree the driving question and success criteria with your teacher.'},
 {title:'Design and choose',bloom:'Apply · Analyse',prompt:'Compare two design ideas. Choose one and explain why it meets the criteria. Describe the audience, assumptions, resources and your own role. Plan teacher checkpoints and peer feedback without recording personal names.'},
 {title:'Make a first version',bloom:'Apply · Create',prompt:'Make your paper model, prototype, program design or other approved artifact. Record its version label and describe how it works. Explain a decision you made yourself. Bring the actual artifact to your teacher; this notebook does not upload it.'},
 {title:'Test with evidence',bloom:'Analyse · Evaluate',prompt:'State a prediction and test criteria before looking at results. Use teacher-approved supplied data or paper traces. Record at least one expected result, observed result and limitation. What evidence challenges your design? No unsupervised experiments or code execution.'},
 {title:'Feedback and revision',bloom:'Evaluate · Create',prompt:'Ask a peer or teacher to use or inspect your artifact. Record feedback without names, the change you made and the evidence behind it. Compare versions. If you decide not to change something, explain why. Do not invent feedback.'},
 {title:'Share and defend',bloom:'Understand · Evaluate · Create',prompt:'Share the artifact with the teacher-approved audience in class. Explain how it answers the driving question, show the test/revision evidence and state remaining weaknesses. Record your individual contribution and any help you used. Ask your teacher to review it; this is not an automatic submission or mark.'},
 {title:'Individual independent check',bloom:'Apply · Analyse · Evaluate',prompt:'Ask your teacher for a NEW related problem. Record that question and your own explanation without AI, notes, team or outside help. Explain a design tradeoff and how you would adapt the idea. Your teacher should compare this with your earlier work and check unaided transfer again later.'}
];
export default function ProjectPathway({classroom,user}:{classroom:Classroom;user:User}){
 const [items,setItems]=useState<Project[]>([]),[selected,setSelected]=useState<Project|null>(null),[draft,setDraft]=useState<Project>(()=>template(classroom));
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState('');
 const errorRef=useRef<HTMLParagraphElement>(null),heading=useRef<HTMLHeadingElement>(null);const pending=useRef(false);
 const base=`/classes/${classroom.id}/projects`;
 useEffect(()=>{let live=true;request<Project[]>(base).then(r=>{if(live)setItems(r);}).catch(e=>{if(live)setError(e instanceof Error?e.message:'Projects could not load.');});return()=>{live=false;};},[base]);
 async function run(task:()=>Promise<void>){if(pending.current)return;pending.current=true;setBusy(true);setError('');setMessage('');try{await task();}catch(e){setError(e instanceof Error?e.message:'Please try again.');requestAnimationFrame(()=>errorRef.current?.focus());}finally{setBusy(false);pending.current=false;}}
 function choose(p:Project){setSelected(p);if(user.role==='teacher')setDraft(p);requestAnimationFrame(()=>heading.current?.focus());}
 return <section className="learning-area" aria-label="Teacher-led projects"><h2 ref={heading} tabIndex={-1}>Learn by making and improving</h2>
 <p>A project takes several lessons. Your teacher sets checkpoints and reviews evidence; learners choose, make, test, revise and explain. Bloom’s categories describe intended thinking, not automatic scores or a fixed ladder.</p>
 <p className="privacy">{classroom.course.safety_notice} Project briefs are saved for this class. Learner notebooks stay in browser memory: export before switching projects, pathways, classes or refreshing. Share artifacts and receive assessment from your teacher in class.</p>
 <button className="secondary" disabled={busy} onClick={()=>void run(async()=>{const latest=await request<Project[]>(base);setItems(latest);setSelected(current=>latest.find(p=>p.id===current?.id)??null);setMessage('Projects refreshed. New brief versions open a new notebook; export your current work first.');})}>Refresh projects</button>
 <div className="class-grid">{items.map(p=><button className="class-card" key={p.id} aria-pressed={selected?.id===p.id} onClick={()=>choose(p)}><strong>{p.title}</strong><span>Version {p.revision} · {p.published?'Shared with class':'Teacher draft'}</span></button>)}</div>
 {!items.length&&<p>{user.role==='teacher'?'Adapt the starter brief below, then share it with the class.':'Your teacher has not shared a project yet. Guided practice is still available.'}</p>}
 {user.role==='teacher'&&<details className="card" open><summary>Teacher project brief</summary>
 <button className="secondary" disabled={busy} onClick={()=>{setDraft(template(classroom));setSelected(null);setMessage('New starter brief ready to adapt.');}}>Start a new brief</button>
 <p>Adapt this original starter to your syllabus, learners and several-lesson schedule. Supply actual topic data and references before publishing; this template alone is not full curriculum coverage.</p>
 <form onSubmit={e=>{e.preventDefault();void run(async()=>{const saved=await request<Project>(draft.id?`${base}/${draft.id}`:base,draft.id?'PUT':'POST',draft);setDraft(saved);setSelected(saved);setItems(await request<Project[]>(base));setMessage(saved.published?'Project shared with your class.':'Teacher draft saved.');});}}>
 {([['title','Project title',100],['question','Driving question',1000],['brief','Learner brief and checkpoints',3000],['artifact','Artifact learners will make',1000],['criteria','Success criteria and assessment evidence',2000],['resources','Approved resources, data, schedule and sharing audience',2000]] as const).map(([key,label,max])=><div key={key}><label htmlFor={`project-${key}`}>{label} (required)</label><textarea id={`project-${key}`} required minLength={key==='title'?3:key==='brief'?20:10} maxLength={max} value={draft[key]} disabled={busy} onChange={e=>setDraft({...draft,[key]:e.target.value})}/></div>)}
 <label htmlFor="project-topic">Class topic anchor</label><select id="project-topic" value={draft.topic_id} disabled={busy} onChange={e=>setDraft({...draft,topic_id:e.target.value})}>{classroom.course.topics.map(t=><option key={t.id} value={t.id}>{t.label}</option>)}</select>
 <fieldset disabled={busy}><legend>Bloom’s learning objectives — select at least one</legend>{(Object.entries(bloomLabels) as [Bloom,string][]).map(([key,label])=><label className="check" key={key}><input type="checkbox" checked={draft.bloom.includes(key)} onChange={e=>setDraft({...draft,bloom:e.target.checked?[...draft.bloom,key]:draft.bloom.filter(b=>b!==key)})}/>{label}</label>)}</fieldset>
 <label className="check"><input type="checkbox" checked={draft.published} disabled={busy} onChange={e=>setDraft({...draft,published:e.target.checked})}/>Share this brief with enrolled learners (uncheck to withdraw it)</label>
 <button disabled={busy||!draft.bloom.length}>{busy?'Saving…':'Save project brief'}</button>
 </form></details>}
 {selected&&<><section className="card"><h3>{selected.title}</h3><p><strong>Driving question:</strong> {selected.question}</p><p className="learner-text">{selected.brief}</p><h4>Make something meaningful</h4><p>{selected.artifact}</p><h4>Agree what success looks like</h4><p className="learner-text">{selected.criteria}</p><h4>Resources and teacher checkpoints</h4><p className="learner-text">{selected.resources}</p><h4>Intended learning objectives</h4><ul>{selected.bloom.map(b=><li key={b}>{bloomLabels[b]}</li>)}</ul></section>
 <ProjectNotebook key={`${selected.id}-${selected.revision}`} project={selected} classroom={classroom}/></>}
 {busy&&<p role="status">Updating projects…</p>}<p role="status">{message}</p>{error&&<p className="error" role="alert" tabIndex={-1} ref={errorRef}>{error}</p>}
 </section>;
}
function ProjectNotebook({project,classroom}:{project:Project;classroom:Classroom}){
 const [stage,setStage]=useState(0),[entries,setEntries]=useState<string[]>(()=>phases.map(()=>''));const [fileMessage,setFileMessage]=useState('');const heading=useRef<HTMLHeadingElement>(null);
 const independent=stage===6,complete=stage===7;const phase=phases[Math.min(stage,6)];
 const notebookText=[project.title,`Brief version ${project.revision} · ${classroom.course.syllabus_subject} · ${classroom.course.pathway}`,project.question,project.brief,project.artifact,project.criteria,project.resources,`Intended objectives: ${project.bloom.join(', ')}`,'Learner self-report, not teacher verification or a learning score.',...entries.map((e,i)=>`${phases[i].title}\n${e||'(not recorded)'}`)].join('\n\n');
 async function restore(file:File|undefined){
  if(!file)return;
  try{
   if(file.size>300000)throw new Error('Notebook file is too large.');
   const value=readNotebook(await file.text(),project.id,project.revision);
   setEntries(value.entries);setStage(value.stage);setFileMessage('Notebook restored on this device only. No file was uploaded.');requestAnimationFrame(()=>heading.current?.focus());
  }catch(e){setFileMessage(e instanceof Error?e.message:'This notebook could not be restored.');}
 }
 function saveResumable(){const url=URL.createObjectURL(new Blob([JSON.stringify({format:'stemmate-project-v1',project_id:project.id,revision:project.revision,stage,entries})],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='stemmate-resumable-notebook.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
 function exportWork(){const url=URL.createObjectURL(new Blob([notebookText],{type:'text/plain;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='stemmate-project-notebook.txt';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
 return <section className="card" aria-label="Local project notebook"><h3 ref={heading} tabIndex={-1}>{complete?'Review your project evidence':phase.title}</h3>
 <p>Project notebook · {Math.min(stage+1,7)} of 7 · {complete?'Teacher review needed':phase.bloom}</p>
 <p>These entries are self-reports. Progress does not verify that an artifact was built, feedback was received or learning occurred. Your teacher reviews the actual artifact, your reasons and your independent work.</p>
 {classroom.paused&&<p role="status">Your teacher has paused this class. You can keep writing and export, but cannot advance.</p>}
 {!complete?<><p>{phase.prompt}</p>{independent&&<aside className="hint">Earlier notebook entries are hidden for this individual check. Do not open exports or outside help. Text-to-speech and dictation remain accessibility options. This is formative practice, not a secure exam.</aside>}
 <form onSubmit={e=>{e.preventDefault();if(entries[stage].trim()&&!classroom.paused){setStage(stage+1);requestAnimationFrame(()=>heading.current?.focus());}}}>
 <label htmlFor="project-evidence">{independent?'Teacher’s new question and your unaided explanation':'Your evidence, decisions and questions'} (required)</label><textarea id="project-evidence" maxLength={6000} required value={entries[stage]} onChange={e=>setEntries(old=>old.map((v,i)=>i===stage?e.target.value:v))}/>
 <VoiceTools key={stage+String(classroom.voice_input_enabled)} allowDictation={classroom.voice_input_enabled} readText={phase.prompt} onTranscript={text=>setEntries(old=>old.map((v,i)=>i===stage?`${v}${v?' ':''}${text}`.slice(0,6000):v))}/>
 <button disabled={!entries[stage].trim()||classroom.paused}>{independent?'Record independent attempt':'Record evidence and continue'}</button>
 </form></>:<p>Discuss this notebook and artifact with your teacher. Ask for an individual explanation check and a later unaided task. No automatic mark or Bloom level is assigned.</p>}
 {!independent&&entries.some(e=>e)&&<details><summary>Earlier project evidence</summary>{entries.map((e,i)=>e&&<div key={i}><h4>{phases[i].title}</h4><p className="learner-text">{e}</p></div>)}</details>}
 <button className="secondary" disabled={independent} onClick={exportWork}>Export my notebook</button>{independent&&<p>Export is available again after your independent attempt.</p>}<p>Exports contain your writing and are stored in your Downloads. Avoid personal details; share only with your teacher or the agreed audience. No notebook text or files are sent to AI or saved on the server.</p>
 {!independent&&<><button className="secondary" onClick={saveResumable}>Save resumable notebook</button><label htmlFor="restore-notebook">Resume from a saved notebook file (processed on this device only)</label><input id="restore-notebook" type="file" accept=".json,application/json" onChange={e=>{void restore(e.target.files?.[0]);e.target.value='';}}/><p>Use the resumable file to continue in another lesson. Keep it private. Restoration requires the same project and brief version; ask your teacher before changing versions.</p></>}<p role="status">{fileMessage}</p>
 {!independent&&<details><summary>Copy notebook text instead</summary><label htmlFor="notebook-copy">Your notebook text — select and copy</label><textarea id="notebook-copy" readOnly rows={10} value={notebookText}/></details>}
 </section>;
}
