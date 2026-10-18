import {lazy,Suspense,useId,useRef,useState} from 'react';
import {request,type Lesson,type Classroom,type User} from '../api/stemmateApi';
import {needsClarification,nextPrompt,replyLabel,withClarification,quizRequest} from './chatGuidance';
import VoiceTools from './VoiceTools';
const QuizPractice=lazy(()=>import('./QuizPractice'));
const AttachedWork=lazy(()=>import('./AttachWork'));
const VisualExplorer=lazy(()=>import('./ExploreVisually'));
const MathContent=lazy(()=>import('./MessageContent'));
function Message({content}:{content:string}){return <Suspense fallback={<p role="status">Loading…</p>}><MathContent content={content}/></Suspense>;}
const labels:Record<string,string>={attempt:'Let’s try together',explain:'Tell me your thinking',feedback:'Let’s compare ideas',apply:'Use your idea again',independent:'Your turn, on your own',complete:'Reflect on your thinking'};
export default function Chat({classroom,user,independent=false,active=true}:{classroom:Classroom;user:User;independent?:boolean;active?:boolean}){
 const id=useId(),pending=useRef(false),heading=useRef<HTMLHeadingElement>(null),input=useRef<HTMLTextAreaElement>(null),errorRef=useRef<HTMLParagraphElement>(null);
 const [topic,setTopic]=useState(''),[topicId,setTopicId]=useState(classroom.course.topics[0].id),[band,setBand]=useState('secondary');
 const [quizOpen,setQuizOpen]=useState(false),[quizTopic,setQuizTopic]=useState('');
 const [firstQuestion,setFirstQuestion]=useState(''),[clarifying,setClarifying]=useState(false),[helpAsking,setHelpAsking]=useState(false);
 const [mode,setMode]=useState('guided'),[token,setToken]=useState(''),[lesson,setLesson]=useState<Lesson|null>(null);
 const [work,setWork]=useState(''),[notes,setNotes]=useState<{label:string;text:string}[]>([]),[answer,setAnswer]=useState(''),[example,setExample]=useState('');
 const [attachOpen,setAttachOpen]=useState(false),[attachVisited,setAttachVisited]=useState(false),[visualOpen,setVisualOpen]=useState(false),[visualVisited,setVisualVisited]=useState(false),[revision,setRevision]=useState(0);
 const panel=useRef<HTMLDivElement>(null),attachButton=useRef<HTMLButtonElement>(null),more=useRef<HTMLDetailsElement>(null);
 const [source,setSource]=useState(''),[notice,setNotice]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false),[consent,setConsent]=useState(false);
 const started=Boolean(lesson||answer),independentCheck=lesson?.stage==='independent',complete=lesson?.stage==='complete',blocked=busy||classroom.paused||!active||quizOpen;
 const prompt=lesson?.stage==='apply'?lesson.application:independentCheck?lesson.independent:lesson?.challenge;
 function focusReply(){requestAnimationFrame(()=>input.current?.focus());}
 async function run(task:()=>Promise<void>,allowPaused=false){if(pending.current||(!allowPaused&&(classroom.paused||!active)))return;pending.current=true;setBusy(true);setError('');setNotice('');try{await task();requestAnimationFrame(()=>heading.current?.focus());}catch(e){setError(e instanceof Error?e.message:'Please try again.');requestAnimationFrame(()=>errorRef.current?.focus());}finally{pending.current=false;setBusy(false);}}
 const context={class_id:classroom.id,course_id:classroom.course_id,grade:classroom.grade,exam_year:classroom.exam_year,topic_id:topicId,band};
 function begin(question:string,choice=mode){void run(async()=>{
  if(choice==='direct'){const r=await request<{answer:string;content_source:string}>('/explain','POST',{...context,topic:question});setAnswer(r.answer);setSource(r.content_source);}
  else{let r=await request<Lesson&{token:string}>('/learning','POST',{...context,topic:question,consent:user.role==='learner'&&consent});
   // A learner who already viewed a direct answer has used support, even after switching paths.
   if(answer){const supported=await request<Lesson>('/learning/session','POST',{action:'direct'},undefined,r.token);r={...r,...supported};}
   setLesson(r);setToken(r.token);setAnswer('');setSource(r.content_source??'original_starter');
  }
  setTopic(question);setClarifying(false);setHelpAsking(false);
 });}
 function openQuiz(value=''){if(independentCheck||blocked)return;setQuizTopic(value);setQuizOpen(true);if(more.current)more.current.open=false;}
 function submit(){const command=quizRequest(lesson?work:topic);if(command!==null&&!independentCheck){openQuiz(command);return;}if(lesson){act('continue');return;}if(clarifying){begin(withClarification(firstQuestion,topic));return;}
  if(needsClarification(topic)){setFirstQuestion(topic);setTopic('');setClarifying(true);setHelpAsking(false);setNotice('');focusReply();return;}
  begin(topic);
 }
 function act(action:string){void run(async()=>{const r=await request<Lesson>('/learning/session','POST',{action,attempted:Boolean(work.trim())},undefined,token);if(action==='continue'){if(work.trim())setNotes(n=>[...n,{label:labels[lesson!.stage],text:work}]);setWork('');setAnswer('');setExample('');}if(r.direct_explanation)setAnswer(r.direct_explanation);if(r.similar_example)setExample(r.similar_example);setLesson(r);});}
 function reset(){void run(async()=>{if(token)await request('/learning/session','DELETE',undefined,undefined,token);setToken('');setLesson(null);setAnswer('');setExample('');setWork('');setNotes([]);setSource('');setTopic('');setFirstQuestion('');setClarifying(false);setHelpAsking(false);setMode('guided');setAttachOpen(false);setVisualOpen(false);setAttachVisited(false);setVisualVisited(false);setRevision(n=>n+1);},true);}
 function showPanel(kind:'attach'|'visual'){
  if(more.current)more.current.open=false;
  if(kind==='attach'){setAttachVisited(true);setAttachOpen(!attachOpen);setVisualOpen(false);}else{setVisualVisited(true);setVisualOpen(!visualOpen);setAttachOpen(false);}
  requestAnimationFrame(()=>{panel.current?.focus();panel.current?.scrollIntoView({block:'start'});});
 }
 function hint(){if(lesson?.stage==='explain'){act('hint');return;}setMode('guided');setNotice(lesson?'Share a first idea below—even “I’m stuck”. Then I can offer a small hint.':'Send a question first. We’ll start with your idea and take it one hint at a time.');focusReply();}
 return <>{quizOpen&&<Suspense fallback={<p role="status">Opening quiz practice…</p>}><QuizPractice classroom={classroom} topicId={topicId} band={band} initialTopic={quizTopic} learningToken={token} active={active} onClose={()=>{setQuizOpen(false);focusReply();}}/></Suspense>}<section hidden={quizOpen} className="chat-workspace" aria-label="STEM thinking chat">
 <div className="chat-topbar"><div><span className="eyebrow">{independent?'Independent practice':classroom.name}</span><h2 ref={heading} tabIndex={-1}>{lesson?labels[lesson.stage]:'What are you working on?'}</h2></div>{(started||clarifying)&&<button className="secondary" disabled={busy} onClick={reset}>New chat</button>}</div>
 {!independentCheck&&(attachVisited||visualVisited)&&<div ref={panel} tabIndex={-1}>
 {attachVisited&&<div hidden={!attachOpen}><Suspense fallback={<p role="status">Opening your work…</p>}><AttachedWork key={revision} classId={classroom.id} learningToken={token} disabled={blocked||!attachOpen} onClose={()=>{setAttachOpen(false);attachButton.current?.focus();}}/></Suspense></div>}
 {visualVisited&&<div hidden={!visualOpen} className="visual-container"><Suspense fallback={<p role="status">Opening visual activities…</p>}><VisualExplorer key={revision} subject={classroom.course.subject} paused={classroom.paused} active={active&&!quizOpen&&visualOpen} onClose={()=>{setVisualOpen(false);more.current?.querySelector('summary')?.focus();}}/></Suspense></div>}
 </div>}
 <div className="chat-conversation" aria-label="Conversation">
 {!started&&!clarifying&&<div className="chat-welcome"><span className="chat-emblem" aria-hidden="true">SM</span><h3>Start wherever you are.</h3><p>A question, a first idea, or “I’m stuck” is enough.</p>
 <div className="welcome-actions"><button className="secondary" disabled={blocked} onClick={()=>{setHelpAsking(true);focusReply();}}>Help me ask a question</button><button className="secondary" disabled={blocked} onClick={()=>begin('')}>Try a small example</button></div>
 {helpAsking&&<div className="chat-coach" role="status"><p>Tell me a topic and the part you find tricky. You can start with one of these:</p><div className="welcome-actions">{classroom.course.topics.map(t=><button key={t.id} disabled={blocked} onClick={()=>{setTopicId(t.id);setTopic(`I need help with ${t.label.toLowerCase()}.`);focusReply();}}>{t.label}</button>)}</div><p>You can edit the words before sending.</p></div>}
 <details className="support-choice"><summary>How would you like me to explain?</summary><div role="group" aria-label="Explanation preference">{[['primary','Short steps'],['secondary','Standard'],['senior','More detail']].map(([value,label])=><button key={value} aria-pressed={band===value} disabled={blocked} onClick={()=>setBand(value)}>{label}</button>)}</div><p>Your choice guides AI explanations in this chat. It does not change your grade or assume your ability.</p></details>
 </div>}
 {clarifying&&!started&&<><div className="chat-bubble learner-bubble"><p>{firstQuestion}</p></div><div className="chat-bubble tutor-bubble"><p>Which part feels tricky? You can add a question, or we can try a small example together.</p><button className="secondary" disabled={blocked} onClick={()=>begin(firstQuestion)}>Not sure—start with me</button></div></>}
 {started&&!independentCheck&&(topic||notes.length>0)&&<details className="earlier-thinking"><summary>Earlier question and thinking</summary>{topic&&<p className="learner-text">{topic}</p>}{notes.map((n,i)=><div key={i}><strong>{n.label}</strong><p className="learner-text">{n.text}</p></div>)}</details>}
 {lesson&&<div className="chat-bubble tutor-bubble">
 {['attempt','apply','independent'].includes(lesson.stage)&&<Message content={prompt??''}/>}
 {lesson.stage==='explain'&&lesson.hints.map((h,i)=><aside className="hint" key={i}><strong>A small hint {i+1}</strong><Message content={h}/></aside>)}
 {lesson.stage==='feedback'&&<><Message content={lesson.explanation??''}/><p className="chat-small">This is a model explanation, not a mark.</p></>}
 {!complete&&<p>{nextPrompt(lesson.stage)}</p>}
 {lesson.stage==='explain'&&<p className="chat-small">If you’re unsure, ask for a hint.</p>}
 {complete&&<><p>You’ve worked through the ideas. What could you explain without help?</p>{lesson.direct_used&&<p>You used worked support. Try a fresh problem independently next.</p>}<details><summary>Compare your answers</summary><h3>Application</h3><Message content={lesson.application??''}/><Message content={lesson.application_explanation??''}/><h3>Independent practice</h3><Message content={lesson.independent??''}/><Message content={lesson.independent_explanation??''}/></details><p className="chat-small">Finishing the steps is not a mastery score. Ask a teacher to review uncertain ideas.</p></>}
 {source==='ai_general_support'&&<p className="chat-small">AI support—check its reasoning and syllabus fit.</p>}
 </div>}
 {answer&&!independentCheck&&<div className="chat-bubble tutor-bubble"><Message content={answer}/><p>How would you explain this in your own words?</p>{!lesson&&<button className="secondary" disabled={blocked} onClick={()=>{setMode('guided');begin(topic,'guided');}}>Try it together</button>}</div>}
 {example&&!independentCheck&&<div className="chat-bubble tutor-bubble"><Message content={example}/><p>Use the method to explain your own steps. This is supported practice.</p></div>}
 </div>
 <div className={`chat-composer${attachOpen||visualOpen?' with-panel':''}`}>
 <div className="reasoning-options" role="group" aria-label="Reasoning support">
 <button type="button" aria-pressed={mode==='guided'} className={mode==='guided'?'selected':''} disabled={blocked||independentCheck||complete} onClick={()=>{setMode('guided');if(answer&&!lesson)begin(topic,'guided');else{setNotice(lesson?nextPrompt(lesson.stage):'Tell me what you’re working on. We’ll take it one idea at a time.');focusReply();}}}>Help me think</button>
 <button type="button" disabled={blocked||independentCheck||complete||Boolean(lesson&&(!['attempt','explain'].includes(lesson.stage)||lesson.hints_used>=lesson.max_hints))} onClick={hint}>Give me a hint</button>
 <button type="button" aria-pressed={mode==='direct'} className={mode==='direct'?'selected':''} disabled={blocked||independentCheck||complete||Boolean(answer&&!lesson)} onClick={()=>{if(lesson)act('direct');else{setMode('direct');setNotice('Send your question for a short explanation.');focusReply();}}}>Explain simply</button>
 <button type="button" ref={attachButton} disabled={blocked||independentCheck} aria-expanded={attachOpen&&!independentCheck} onClick={()=>showPanel('attach')}><span aria-hidden="true">＋ </span>Attach work</button>
 </div>
 {notice&&<p role="status" className="chat-coach">{notice}</p>}
 {!complete&&!(answer&&!lesson)&&<form onSubmit={e=>{e.preventDefault();submit();}}>
 <label className="composer-label" htmlFor={`${id}-message`}>{replyLabel(lesson?.stage,clarifying)}</label>
 <div className="message-entry"><textarea ref={input} id={`${id}-message`} value={lesson?work:topic} maxLength={lesson?4000:clarifying?1000:2000} disabled={blocked} required={Boolean((lesson&&lesson.stage!=='feedback')||clarifying)} onChange={e=>lesson?setWork(e.target.value):setTopic(e.target.value)} placeholder={lesson?'A first step or a question is enough.':clarifying?'For example: I’m not sure which operation to use.':'Type your question or tell me what feels confusing…'}/><button disabled={blocked||Boolean(lesson&&lesson.stage!=='feedback'&&!work.trim())||(clarifying&&!topic.trim())}>{busy?'One moment…':independentCheck?'Compare my attempt':lesson?.stage==='apply'?'Try the next one on my own':lesson?.stage==='feedback'?'Continue':lesson?'Send my thinking':'Send'}</button></div>
 <VoiceTools key={String(active&&!quizOpen)+String(busy)+(lesson?.stage??mode)} allowDictation={classroom.voice_input_enabled} disabled={blocked} readText={lesson?`${prompt??''} ${nextPrompt(lesson.stage)}`:clarifying?'Which part feels tricky?':'What are you working on?'} onTranscript={text=>lesson?setWork(v=>`${v}${v?' ':''}${text}`.slice(0,4000)):setTopic(v=>`${v}${v?' ':''}${text}`.slice(0,clarifying?1000:2000))}/>
 </form>}
 <details ref={more} className="chat-more"><summary>More options</summary>
 <div className="more-content">
 <button disabled={blocked||independentCheck} onClick={()=>openQuiz()}>Quiz me</button>
 <button disabled={blocked||independentCheck} onClick={()=>showPanel('visual')}>Explore visually</button>
 {lesson&&['explain','feedback','apply'].includes(lesson.stage)&&<button disabled={blocked} onClick={()=>{if(more.current)more.current.open=false;act('example');}}>Show a similar example</button>}
 {lesson&&!independentCheck&&!complete&&<button disabled={blocked} onClick={()=>{if(more.current)more.current.open=false;setNotice('What rule supports your step? Do the units and assumptions fit? Try checking a different case. This is a self-check, not an AI assessment.');focusReply();}}>Check my reasoning</button>}
 <details><summary>Topic and privacy</summary><label htmlFor={`${id}-topic`}>Practice topic</label><select id={`${id}-topic`} value={topicId} disabled={started||blocked} onChange={e=>setTopicId(e.target.value)}>{classroom.course.topics.map(t=><option key={t.id} value={t.id}>{t.label}</option>)}</select>
 {classroom.evaluation_enabled&&user.role==='learner'&&<label className="check"><input type="checkbox" checked={consent} disabled={started||blocked} onChange={e=>setConsent(e.target.checked)}/>Optionally share activity counts with my teacher. No written answers.</label>}
 <p>Questions and your clarification go to AI. Chat attempts stay on this device. Quiz answers and attached work ask permission separately. Copy work before refreshing; practice sessions expire after one hour. {independent?'No teacher reports; microphone dictation is off.':'Microphone dictation may use your browser’s speech service.'}</p><p>{classroom.course.safety_notice}</p><p>{classroom.course.coverage_notice}</p></details>
 {!independentCheck&&<details><summary>Past papers</summary><p>{classroom.course.pathway} {classroom.course.qualification} · syllabus {classroom.course.code}. Check year, tier and question number.</p><a href={classroom.course.pathway==='Namibia'?'https://nied.edu.na/documents/questionpapers/':'https://www.cambridgeinternational.org/resource-centre/'} target="_blank" rel="noreferrer">Open official paper resources (new tab)</a><p>Choose Attach work to practise a question or PDF page. We don’t search a paper library. Supplied criteria are not authenticated; AI feedback is not official grading.</p></details>}
 </div></details>
 {busy&&<p role="status" className="chat-small">One moment…</p>}
 {error&&<p role="alert" tabIndex={-1} ref={errorRef} className="error">{error}</p>}
 <p className="chat-small">AI can make mistakes. Keep personal details out of questions and uploads.</p>
 </div></section></>;
}
