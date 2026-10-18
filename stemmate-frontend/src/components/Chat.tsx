import {lazy,Suspense,useId,useRef,useState} from 'react';
import {request,type Lesson,type Classroom,type User} from '../api/stemmateApi';
import VoiceTools from './VoiceTools';
const AttachedWork=lazy(()=>import('./AttachWork'));
const VisualExplorer=lazy(()=>import('./ExploreVisually'));
const MathContent=lazy(()=>import('./MessageContent'));
function Message({content}:{content:string}){return <Suspense fallback={<p role="status">Loading learning material…</p>}><MathContent content={content}/></Suspense>;}
const stages=['attempt','explain','feedback','apply','independent','complete'];
const labels:Record<string,string>={attempt:'Predict or try',explain:'Explain your thinking',feedback:'Compare and reflect',apply:'Apply your learning',independent:'Try independently',complete:'Review your learning'};
export default function Chat({classroom,user,independent=false,active=true}:{classroom:Classroom;user:User;independent?:boolean;active?:boolean}){
 const id=useId(),pending=useRef(false),heading=useRef<HTMLHeadingElement>(null),errorRef=useRef<HTMLParagraphElement>(null);
 const [topic,setTopic]=useState(''),[topicId,setTopicId]=useState(classroom.course.topics[0].id),[band,setBand]=useState('secondary');
 const [mode,setMode]=useState('guided'),[token,setToken]=useState(''),[lesson,setLesson]=useState<Lesson|null>(null);
 const [work,setWork]=useState(''),[notes,setNotes]=useState<{label:string;text:string}[]>([]),[answer,setAnswer]=useState(''),[example,setExample]=useState('');
 const [attachOpen,setAttachOpen]=useState(false);
 const attachHeading=useRef<HTMLDivElement>(null),attachButton=useRef<HTMLButtonElement>(null);
 const [visualOpen,setVisualOpen]=useState(false),[visualRevision,setVisualRevision]=useState(0);
 const visualHeading=useRef<HTMLDivElement>(null),visualButton=useRef<HTMLButtonElement>(null);
 const [source,setSource]=useState(''),[notice,setNotice]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false),[consent,setConsent]=useState(false);
 async function run(task:()=>Promise<void>){if(pending.current)return;pending.current=true;setBusy(true);setError('');setNotice('');try{await task();requestAnimationFrame(()=>heading.current?.focus());}catch(e){setError(e instanceof Error?e.message:'Please try again.');requestAnimationFrame(()=>errorRef.current?.focus());}finally{pending.current=false;setBusy(false);}}
 const context={class_id:classroom.id,course_id:classroom.course_id,grade:classroom.grade,exam_year:classroom.exam_year,topic_id:topicId,topic,band};
 function start(){void run(async()=>{if(mode==='direct'){const r=await request<{answer:string;content_source:string}>('/explain','POST',context);setAnswer(r.answer);setSource(r.content_source);}else{const r=await request<Lesson&{token:string}>('/learning','POST',{...context,consent:user.role==='learner'&&consent});setLesson(r);setToken(r.token);setSource(r.content_source??'original_starter');}});}
 function act(action:string){void run(async()=>{const r=await request<Lesson>('/learning/session','POST',{action,attempted:Boolean(work.trim())},undefined,token);if(action==='continue'){if(work.trim())setNotes(n=>[...n,{label:labels[lesson!.stage],text:work}]);setWork('');setAnswer('');setExample('');}if(r.direct_explanation)setAnswer(r.direct_explanation);if(r.similar_example)setExample(r.similar_example);setLesson(r);});}
 function reset(){void run(async()=>{if(token)await request('/learning/session','DELETE',undefined,undefined,token);setToken('');setLesson(null);setAnswer('');setExample('');setWork('');setNotes([]);setSource('');setTopic('');setMode('guided');setAttachOpen(false);setVisualOpen(false);setVisualRevision(n=>n+1);});}
 const started=Boolean(lesson||answer),independentCheck=lesson?.stage==='independent',complete=lesson?.stage==='complete';
 const prompt=lesson?.stage==='apply'?lesson.application:independentCheck?lesson.independent:lesson?.challenge;
 const blocked=busy||classroom.paused;
 return <section className="chat-workspace" aria-label="STEM thinking chat">
 <div className="chat-topbar"><div><span className="eyebrow">{independent?'Independent practice':classroom.name}</span><h2 ref={heading} tabIndex={-1}>{lesson?labels[lesson.stage]:'Let’s think it through'}</h2></div>
 <details className="chat-preferences"><summary>Topic and support</summary><label htmlFor={`${id}-topic-choice`}>Practice topic</label><select id={`${id}-topic-choice`} value={topicId} disabled={started||busy} onChange={e=>setTopicId(e.target.value)}>{classroom.course.topics.map(t=><option key={t.id} value={t.id}>{t.label}</option>)}</select><p>Ask about this subject and topic, or leave your question blank for starter practice.</p>
 <label htmlFor={`${id}-reading`}>Explanation style</label><select id={`${id}-reading`} value={band} disabled={started||busy} onChange={e=>setBand(e.target.value)}><option value="primary">Simpler English</option><option value="secondary">Standard</option><option value="senior">More detail</option></select>
 {classroom.evaluation_enabled&&user.role==='learner'&&<label className="check"><input type="checkbox" checked={consent} disabled={started||busy} onChange={e=>setConsent(e.target.checked)}/>Optionally share activity counts if enabled by my teacher. No written answers.</label>}
 <p>AI receives optional questions and curriculum context. Attempts stay in this browser. Avoid personal details. Plans expire after one hour; copy your work before refreshing. {independent?'No teacher reports. Microphone transcription is off.':'Optional microphone transcription may use your browser’s external speech service.'}</p><p>{classroom.course.safety_notice}</p><p>{classroom.course.coverage_notice}</p></details>
 {started&&<button className="secondary" disabled={busy} onClick={reset}>New chat</button>}</div>
 <details className="exam-practice"><summary>Exam practice and past papers</summary><p>Find an official paper for {classroom.course.syllabus_subject} · {classroom.course.pathway} {classroom.course.qualification} · syllabus {classroom.course.code}. Check the paper year, tier and syllabus version before practising.</p>
 <p><a href={classroom.course.pathway==='Namibia'?'https://nied.edu.na/documents/questionpapers/':'https://www.cambridgeinternational.org/resource-centre/'} target="_blank" rel="noreferrer">{classroom.course.pathway==='Namibia'?'Open NIED’s official past-paper links':'Open Cambridge’s official paper resources'} (new tab)</a></p>
 <p>STEMMate does not currently host or search a past-paper library. Some resources require school access. Open your paper separately, choose the closest topic in Topic and support, then type a question here. Try it yourself before asking for a hint. Use the official mark scheme after your attempt; AI explanations are not official marking guidance.</p><p>For exam rehearsal, work through the paper without STEMMate help first. Afterwards, bring the steps you found difficult to the reasoning chat. Use Attach work for a photograph or typed answer and supplied marking criteria. Feedback is formative; marking criteria are not authenticated.</p></details>
 {!independentCheck&&<div ref={attachHeading} tabIndex={-1} hidden={!attachOpen}><Suspense fallback={<p role="status">Loading attachment support…</p>}><AttachedWork key={visualRevision} classId={classroom.id} learningToken={token} disabled={blocked||!active} onClose={()=>{setAttachOpen(false);attachButton.current?.focus();}}/></Suspense></div>}
 {!independentCheck&&<div ref={visualHeading} tabIndex={-1} hidden={!visualOpen} className="visual-container" id={`${id}-visual`}><Suspense fallback={<p role="status">Loading visual activities…</p>}><VisualExplorer key={visualRevision} subject={classroom.course.subject} paused={classroom.paused} active={active&&visualOpen} onClose={()=>{setVisualOpen(false);visualButton.current?.focus();}}/></Suspense></div>}
 <div className="chat-conversation" aria-label="Conversation">
 {!started&&<div className="chat-welcome"><span className="chat-emblem" aria-hidden="true">SM</span><h3>Your ideas come first.</h3><p>Ask a STEM question or start a practice activity. We’ll work through it one thought at a time.</p><p className="chat-small">Choose a topic in “Topic and support”. For science, use supplied data and paper models; practical work requires qualified supervision.</p></div>}
 {started&&topic&&!independentCheck&&<div className="chat-bubble learner-bubble"><strong>Your question</strong><p>{topic}</p></div>}
 {!independentCheck&&notes.map((n,i)=><div className="chat-bubble learner-bubble" key={i}><strong>{n.label} · your thinking</strong><p className="learner-text">{n.text}</p></div>)}
 {lesson&&<div className="chat-bubble tutor-bubble"><p className="eyebrow">Step {stages.indexOf(lesson.stage)+1} of 6 · {labels[lesson.stage]}</p>
 {source==='ai_general_support'&&<p className="chat-small">AI-generated support. Check its reasoning; accuracy and syllabus alignment are not verified.</p>}
 {!complete&&<Message content={prompt??''}/>}
 {lesson.stage==='attempt'&&<p>What have you tried, or what feels confusing? A first idea or “I’m stuck” is enough.</p>}
 {lesson.stage==='explain'&&<><p>Why might your approach work? Explain a rule, an assumption or where you are stuck.</p>{lesson.hints.map((h,i)=><aside className="hint" key={i}><strong>Hint {i+1}</strong><Message content={h}/></aside>)}</>}
 {lesson.stage==='feedback'&&<><Message content={lesson.explanation??''}/><p>Compare this with your attempt. What agrees, and what would you change? This is a model explanation, not a mark.</p></>}
 {lesson.stage==='apply'&&<p>Try the new situation and explain your steps. If you viewed the similar example, this is supported practice.</p>}
 {independentCheck&&<p>Try this new problem without AI, notes or outside help. Earlier writing and help are hidden until you finish. This is formative practice, not a supervised assessment.</p>}
 {complete&&<><p>You completed the steps. Completion alone does not show mastery. {lesson.direct_used?'You used worked support; consider what you can now explain alone.':''}</p><h3>Application: compare your reasoning</h3><Message content={lesson.application??''}/><Message content={lesson.application_explanation??''}/><h3>Independent check: compare after your attempt</h3><Message content={lesson.independent??''}/><Message content={lesson.independent_explanation??''}/><p>Try another problem later without help. Ask a teacher or trusted adult to review uncertain ideas.</p></>}
 </div>}
 {answer&&!independentCheck&&<div className="chat-bubble tutor-bubble"><strong>Direct explanation</strong>{source==='ai_general_support'&&<p className="chat-small">AI-generated; check accuracy.</p>}<p>Use this support, then explain the idea yourself.</p><Message content={answer}/></div>}
 {example&&!independentCheck&&<div className="chat-bubble tutor-bubble"><strong>A similar worked example</strong><Message content={example}/><p>Use the method to explain your own steps. This is support, not independent evidence.</p></div>}
 </div>
 <div className="chat-composer">
 <div className="reasoning-options" role="group" aria-label="Reasoning support">
 <button type="button" className={mode==='guided'?'selected':''} aria-pressed={mode==='guided'} disabled={blocked||started} onClick={()=>setMode('guided')}>Think with me</button>
 <button type="button" disabled={blocked||lesson?.stage!=='explain'||lesson.hints_used>=lesson.max_hints} onClick={()=>act('hint')}>Give me a hint{lesson?.stage==='explain'?` (${lesson.hints_used}/${lesson.max_hints})`:''}</button>
 <button type="button" aria-pressed={mode==='direct'} className={mode==='direct'?'selected':''} disabled={blocked||independentCheck||complete||(!lesson&&started)} onClick={()=>lesson?act('direct'):setMode('direct')}>Explain simply</button>
 <button type="button" disabled={blocked||!lesson||!['explain','feedback','apply'].includes(lesson.stage)} onClick={()=>act('example')}>Similar example</button>
 <button type="button" disabled={blocked||!lesson||independentCheck||complete} onClick={()=>setNotice('Self-check your reasoning: What rule supports each step? Are your assumptions and units consistent? Can you test a different case or find a counterexample? Revise your response below. This is a reflection prompt, not an AI assessment.')}>Check my reasoning</button>
 <button type="button" ref={attachButton} disabled={blocked||independentCheck} aria-expanded={attachOpen&&!independentCheck} onClick={()=>{setAttachOpen(v=>!v);if(!attachOpen)requestAnimationFrame(()=>{attachHeading.current?.focus();attachHeading.current?.scrollIntoView({block:"start"});});}}>Attach work</button>
 <button type="button" ref={visualButton} aria-expanded={visualOpen&&!independentCheck} aria-controls={independentCheck?undefined:`${id}-visual`} disabled={blocked||independentCheck} onClick={()=>{setVisualOpen(v=>!v);if(!visualOpen)requestAnimationFrame(()=>{visualHeading.current?.focus();visualHeading.current?.scrollIntoView({block:'start'});});}}>Explore visually</button>
 <button type="button" disabled={blocked||lesson?.stage!=='apply'||!work.trim()} onClick={()=>act('continue')}>Try on my own</button>
 </div>
 <p className="chat-small">{!started?(mode==='guided'?'Think with me: start with your idea, then get support.':'Direct explanation: accessible support, then explain it back.'):'Hints and examples unlock after an attempt. “Try on my own” unlocks after your application response.'}</p>
 {notice&&<p role="status" className="hint">{notice}</p>}
 {!complete&&<form onSubmit={e=>{e.preventDefault();if(lesson)act('continue');else start();}}>
 <label className="composer-label" htmlFor={`${id}-message`}>{lesson?(lesson.stage==='feedback'?'Your reflection (optional)':'Your thinking (required)'):'Your STEM question (optional)'}</label>
 <div className="message-entry"><textarea id={`${id}-message`} value={lesson?work:topic} maxLength={lesson?4000:2000} disabled={busy||(!lesson&&started)} required={Boolean(lesson&&lesson.stage!=='feedback')} onChange={e=>lesson?setWork(e.target.value):setTopic(e.target.value)} placeholder={lesson?'Share a first step, explain your idea, or say where you are stuck.':'Ask your STEM question… or leave blank for starter practice.'}/><button disabled={blocked||(!lesson&&started)||Boolean(lesson&&lesson.stage!=='feedback'&&!work.trim())}>{busy?'Working…':lesson?(independentCheck?'Compare attempt':'Send thinking'):(mode==='direct'?(topic.trim()?'Explain question':'Explain topic'):(topic.trim()?'Send question':'Start practice'))}</button></div>
 <VoiceTools key={String(active)+String(busy)+(lesson?.stage??mode)} allowDictation={classroom.voice_input_enabled} disabled={blocked||!active||(!lesson&&started)} readText={prompt} onTranscript={text=>lesson?setWork(v=>`${v}${v?' ':''}${text}`.slice(0,4000)):setTopic(v=>`${v}${v?' ':''}${text}`.slice(0,2000))}/>
 </form>}
 {error&&<p role="alert" className="error" tabIndex={-1} ref={errorRef}>{error}</p>}{busy&&<p role="status">Preparing support…</p>}
 <p className="chat-small">AI can make mistakes. Chat attempts stay on this device; Attach work sends only the material you explicitly submit to AI. Direct answers and completed steps do not prove independent understanding.</p>
 </div></section>;
}
