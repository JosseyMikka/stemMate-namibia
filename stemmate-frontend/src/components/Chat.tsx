import {lazy,Suspense,useEffect,useId,useRef,useState} from 'react';
import {request,type Lesson,type Classroom,type User} from '../api/stemmateApi';
import {needsClarification,nextPrompt,replyLabel,withClarification,quizRequest,hintGuidance,showChallenge} from './chatGuidance';
import {DraftPrivacy} from './DraftRecovery';
import DisplayBoundary from './DisplayBoundary';
import {readDrafts,saveDraft} from './tabDrafts';
import VoiceTools from './VoiceTools';
import SubjectBadge from './SubjectBadge';
import {subjectStyle} from './subjectTheme';
import {visualSuggestion,type VisualSelection} from './visualLinks';
const QuizPractice=lazy(()=>import('./QuizPractice'));
const AttachedWork=lazy(()=>import('./AttachWork'));
const VisualExplorer=lazy(()=>import('./ExploreVisually'));
const MathContent=lazy(()=>import('./MessageContent'));
function Message({content}:{content:string}){return <DisplayBoundary fallback={<><p role="status">Formatted display could not load. Plain text is shown below; your writing is still available. Copy important work before refreshing to try again.</p><p className="learner-text">{content}</p></>}><Suspense fallback={<p role="status">Loading…</p>}><MathContent content={content}/></Suspense></DisplayBoundary>;}
const labels:Record<string,string>={attempt:'Let’s try together',explain:'Tell me your thinking',feedback:'Let’s compare ideas',apply:'Use your idea again',independent:'Your turn, on your own',complete:'Reflect on your thinking'};
export default function Chat({classroom,user,independent=false,active=true,parentToken='',depth=0,onIndependentChange,initialTopicId}:{classroom:Classroom;user:User;independent?:boolean;active?:boolean;parentToken?:string;depth?:number;onIndependentChange?:(value:boolean)=>void;initialTopicId?:string}){
 // Keep up to four mounted workspaces, matching the tab-recovery draft limit.
 const [support,setSupport]=useState('unknown');
 const [questionIndependent,setQuestionIndependent]=useState(false);
 const [questionOpen,setQuestionOpen]=useState(false),[questionVisited,setQuestionVisited]=useState(false);
 const id=useId(),pending=useRef(false),heading=useRef<HTMLHeadingElement>(null),input=useRef<HTMLTextAreaElement>(null),errorRef=useRef<HTMLParagraphElement>(null);
 const [topic,setTopic]=useState(''),[topicId,setTopicId]=useState(initialTopicId??classroom.course.topics[0].id),[band,setBand]=useState('secondary');
 const [quizOpen,setQuizOpen]=useState(false),[quizTopic,setQuizTopic]=useState('');
 const [firstQuestion,setFirstQuestion]=useState(''),[clarifying,setClarifying]=useState(false),[helpAsking,setHelpAsking]=useState(false);
 const [mode,setMode]=useState('guided'),[token,setToken]=useState(''),[lesson,setLesson]=useState<Lesson|null>(null);
 const [work,setWork]=useState(''),[notes,setNotes]=useState<{label:string;text:string}[]>([]),[answer,setAnswer]=useState(''),[example,setExample]=useState('');
 const [attachOpen,setAttachOpen]=useState(false),[attachVisited,setAttachVisited]=useState(false),[visualOpen,setVisualOpen]=useState(false),[visualVisited,setVisualVisited]=useState(false),[revision,setRevision]=useState(0);
 const [visualSelection,setVisualSelection]=useState<VisualSelection>({activity:classroom.course.subject==='biology'?'cell':'molecules'});
 const visualTrigger=useRef<HTMLButtonElement|null>(null),visualRequest=useRef(0);
 const questionPanel=useRef<HTMLDivElement>(null);
 const panel=useRef<HTMLDivElement>(null),attachButton=useRef<HTMLButtonElement>(null),more=useRef<HTMLDetailsElement>(null);
 const [source,setSource]=useState(''),[notice,setNotice]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false),[consent,setConsent]=useState(false);
 const started=Boolean(lesson||answer),independentCheck=lesson?.stage==='independent',complete=lesson?.stage==='complete',blocked=busy||classroom.paused||!active||quizOpen||questionOpen;
 useEffect(()=>{onIndependentChange?.(independentCheck);},[independentCheck,onIndependentChange]);
 const prompt=lesson?.stage==='apply'?lesson.application:independentCheck?lesson.independent:lesson?.challenge;
 const suggestion=!independentCheck&&(answer||example||lesson?.stage==='feedback'||complete)?visualSuggestion(topic||lesson?.challenge||'',answer||example||lesson?.explanation||'',classroom.course.subject):null;
 const draftId=`chat:${classroom.id}:${classroom.course_id}:${classroom.grade}:${classroom.exam_year}${classroom.course.pack_version?`:${classroom.course.pack_version}`:''}${depth?`:${depth}`:''}`;
 const draftText=complete||answer&&!lesson?'':lesson?work:topic;
 const [draftEnabled,setDraftEnabled]=useState(()=>readDrafts(user.id).enabled);
 const previousDraft=useRef({text:draftText,enabled:draftEnabled});
 useEffect(()=>{const update=()=>setDraftEnabled(readDrafts(user.id).enabled);window.addEventListener('stemmate-drafts',update);return()=>window.removeEventListener('stemmate-drafts',update);},[user.id]);
 const [draftNotice,setDraftNotice]=useState('');
 useEffect(()=>{
  if(previousDraft.current.text===draftText&&previousDraft.current.enabled===draftEnabled)return;
  previousDraft.current={text:draftText,enabled:draftEnabled};
  if(!draftEnabled)return;
  const saved=saveDraft(user.id,{id:draftId,label:`${classroom.course.subject_label} · Grade ${classroom.grade} · ${classroom.course.pathway} ${classroom.course.qualification} · Exam ${classroom.exam_year}`,stage:lesson?labels[lesson.stage]:clarifying?'Question clarification':'Unsent question',question:lesson?(prompt??lesson.challenge):clarifying?firstQuestion:'',text:draftText});
  if(!saved)queueMicrotask(()=>setDraftNotice('Recovery storage is unavailable. Your writing is still here; copy it before leaving.'));
 },[draftText,draftEnabled,draftId,user.id,classroom.course.subject_label,classroom.grade,classroom.course.pathway,classroom.course.qualification,classroom.exam_year,lesson,prompt,clarifying,firstQuestion,complete,answer]);
 useEffect(()=>{
  const protect=(event:BeforeUnloadEvent)=>{if(draftText.trim()){event.preventDefault();event.returnValue='';}};
  window.addEventListener('beforeunload',protect);return()=>window.removeEventListener('beforeunload',protect);
 },[draftText]);
 function openSuggestedVisual(button:HTMLButtonElement){if(!suggestion||blocked||independentCheck)return;visualTrigger.current=button;setVisualSelection({...suggestion.selection,request:++visualRequest.current});setVisualVisited(true);setVisualOpen(true);setAttachOpen(false);if(more.current)more.current.open=false;requestAnimationFrame(()=>{panel.current?.focus();panel.current?.scrollIntoView({block:'start'});});}
 function focusReply(){requestAnimationFrame(()=>input.current?.focus());}
 async function run(task:()=>Promise<void>,allowPaused=false){if(pending.current||(!allowPaused&&(classroom.paused||!active||questionOpen)))return;pending.current=true;setBusy(true);setError('');setNotice('');try{await task();requestAnimationFrame(()=>heading.current?.focus());}catch(e){setError(e instanceof TypeError?'Connection interrupted. Your writing is still here. Reconnect and try again.':e instanceof Error?e.message:'Please try again.');requestAnimationFrame(()=>errorRef.current?.focus());}finally{pending.current=false;setBusy(false);}}
 const context={class_id:classroom.id,course_id:classroom.course_id,pack_version:classroom.course.pack_version,grade:classroom.grade,exam_year:classroom.exam_year,topic_id:topicId,band,support};
 function begin(question:string,choice=mode){void run(async()=>{
  if(choice==='direct'){const r=await request<{answer:string;content_source:string}>('/explain','POST',{...context,topic:question},undefined,parentToken);setAnswer(r.answer);setSource(r.content_source);}
  else{let r=await request<Lesson&{token:string}>('/learning','POST',{...context,topic:question,consent:user.role==='learner'&&consent},undefined,parentToken);
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
 function reset(){void run(async()=>{if(token)await request('/learning/session','DELETE',undefined,undefined,token);setQuestionVisited(false);setQuestionOpen(false);setToken('');setLesson(null);setAnswer('');setExample('');setWork('');setNotes([]);setSource('');setTopic('');setFirstQuestion('');setClarifying(false);setHelpAsking(false);setMode('guided');setAttachOpen(false);setVisualOpen(false);setAttachVisited(false);setVisualVisited(false);setRevision(n=>n+1);},true);}
 function showPanel(kind:'attach'|'visual'){
  if(more.current)more.current.open=false;
  if(kind==='attach'){setAttachVisited(true);setAttachOpen(!attachOpen);setVisualOpen(false);}else{visualTrigger.current=null;setVisualVisited(true);setVisualOpen(!visualOpen);setAttachOpen(false);}
  requestAnimationFrame(()=>{panel.current?.focus();panel.current?.scrollIntoView({block:'start'});});
 }
 function hint(){if(lesson?.stage==='explain'){act('hint');return;}setMode('guided');setNotice(lesson?'Share a first idea below—even “I’m stuck”. Then I can offer a small hint.':'Send a question first. We’ll start with your idea and take it one hint at a time.');focusReply();}
 return <><div hidden={questionOpen}>{quizOpen&&<DisplayBoundary fallback={<div role="alert"><p>Quiz practice could not load. Copy important work before refreshing to try again.</p><button onClick={()=>setQuizOpen(false)}>Back to chat</button></div>}><Suspense fallback={<p role="status">Opening quiz practice…</p>}><QuizPractice classroom={classroom} topicId={topicId} band={band} initialTopic={quizTopic} learningToken={token} active={active} onClose={()=>{setQuizOpen(false);focusReply();}}/></Suspense></DisplayBoundary>}<section hidden={quizOpen} data-independent-check={active&&!questionOpen&&independentCheck?'true':undefined} className="chat-workspace" style={subjectStyle(classroom.course.subject)} aria-label="STEM thinking chat">
 <div className="chat-topbar"><div><span className="eyebrow">{!independent&&<><SubjectBadge subject={classroom.course.subject}/><br/></>}{independent?'Independent practice':classroom.name}</span><h2 ref={heading} tabIndex={-1}>{lesson?labels[lesson.stage]:mode==='direct'?'Let’s explain it simply':'Let’s think it through'}</h2></div>{(started||clarifying)&&<button className="secondary" disabled={busy} onClick={reset}>New chat</button>}</div>
 {!independentCheck&&(attachVisited||visualVisited)&&<div ref={panel} tabIndex={-1}>
 {attachVisited&&<div hidden={!attachOpen}><DisplayBoundary fallback={<p role="alert">Attach work could not load. Your chat writing is still available. Copy important work before refreshing to try again.</p>}><Suspense fallback={<p role="status">Opening your work…</p>}><AttachedWork key={revision} classId={classroom.id} learningToken={token} disabled={blocked||!attachOpen} onClose={()=>{setAttachOpen(false);if(more.current)more.current.open=true;attachButton.current?.focus();}}/></Suspense></DisplayBoundary></div>}
 {visualVisited&&<div hidden={!visualOpen} className="visual-container"><DisplayBoundary fallback={<p role="alert">Visual activities could not load. Your chat writing is still available. Copy important work before refreshing to try again.</p>}><Suspense fallback={<p role="status">Opening visual activities…</p>}><VisualExplorer key={revision} selection={visualSelection} onSelect={setVisualSelection} paused={classroom.paused} active={active&&!quizOpen&&visualOpen} onClose={()=>{setVisualOpen(false);if(visualTrigger.current?.isConnected)visualTrigger.current.focus();else more.current?.querySelector('summary')?.focus();}}/></Suspense></DisplayBoundary></div>}
 </div>}
 <div className="chat-conversation" aria-label="Conversation">
 {!started&&!clarifying&&<div className="chat-welcome"><span className="chat-emblem" aria-hidden="true">SM</span><h3>What would you like help with?</h3><p>A question, a first idea, or “I’m stuck” is enough.</p>
 <div className="welcome-actions"><button className="secondary" disabled={blocked} onClick={()=>{setHelpAsking(true);focusReply();}}>Help me ask a question</button><button className="secondary" disabled={blocked} onClick={()=>begin('')}>Try a small example</button></div>
 {helpAsking&&<div className="chat-coach" role="status"><p>Tell me a topic and the part you find tricky. You can start with one of these:</p><div className="welcome-actions">{classroom.course.topics.map(t=><button key={t.id} disabled={blocked} onClick={()=>{setTopicId(t.id);setTopic(`I need help with ${t.label.toLowerCase()}.`);focusReply();}}>{t.label}</button>)}</div><p>You can edit the words before sending.</p></div>}

 </div>}
 {clarifying&&!started&&<><div className="chat-bubble learner-bubble"><p>{firstQuestion}</p></div><div className="chat-bubble tutor-bubble"><p>Which part feels tricky? You can add a question, or we can try a small example together.</p><button className="secondary" disabled={blocked} onClick={()=>begin(firstQuestion)}>Not sure—start with me</button></div></>}
 {started&&!independentCheck&&(topic||notes.length>0)&&<details className="earlier-thinking"><summary>Earlier question and thinking</summary>{topic&&<p className="learner-text">{topic}</p>}{notes.map((n,i)=><div key={i}><strong>{n.label}</strong><p className="learner-text">{n.text}</p></div>)}</details>}
 {lesson&&<div className="chat-bubble tutor-bubble">
 {showChallenge(lesson.stage)&&<Message content={prompt??''}/>}
 {lesson.stage==='explain'&&lesson.hints.map((h,i)=><aside className="hint" key={i}><strong>A small hint {i+1}</strong><Message content={h}/></aside>)}
 {lesson.stage==='feedback'&&<><Message content={lesson.explanation??''}/><p className="chat-small">This is a model explanation, not a mark.</p></>}
 {!complete&&<p>{nextPrompt(lesson.stage)}</p>}
 {lesson.stage==='explain'&&<p className="chat-small">{hintGuidance(lesson.hints_used,lesson.max_hints)}</p>}
 {complete&&<><p>You’ve worked through the ideas. What could you explain without help?</p>{lesson.direct_used&&<p>You used worked support. Try a fresh problem independently next.</p>}<details><summary>Compare your answers</summary><h3>Application</h3><Message content={lesson.application??''}/><Message content={lesson.application_explanation??''}/><h3>Independent practice</h3><Message content={lesson.independent??''}/><Message content={lesson.independent_explanation??''}/></details><p className="chat-small">Finishing the steps is not a mastery score. Ask a teacher to review uncertain ideas.</p></>}
 {source==='ai_general_support'&&<p className="chat-small">AI support—check its reasoning and syllabus fit.</p>}
 </div>}
 {answer&&!independentCheck&&<div className="chat-bubble tutor-bubble"><Message content={answer}/><p>How would you explain this in your own words?</p>{!lesson&&<button className="secondary" disabled={blocked} onClick={()=>{setMode('guided');begin(topic,'guided');}}>Try it together</button>}</div>}
 {example&&!independentCheck&&<div className="chat-bubble tutor-bubble"><Message content={example}/><p>Use the method to explain your own steps. This is supported practice.</p></div>}
 {suggestion&&<button ref={visualTrigger} className="secondary" disabled={blocked} aria-expanded={visualOpen} onClick={e=>openSuggestedVisual(e.currentTarget)}>{suggestion.label}</button>}
 </div>
 <div className={`chat-composer${attachOpen||visualOpen?' with-panel':''}`}>
 {lesson&&depth<3&&<><button type="button" disabled={blocked||independentCheck} onClick={()=>{setQuestionVisited(true);setQuestionOpen(true);requestAnimationFrame(()=>questionPanel.current?.querySelector('textarea')?.focus());}}>{questionVisited?'Open separate question':'Ask a new question'}</button><p className="chat-small">Send your thinking below to continue this exercise. Ask a new question to open separate guided practice; your lesson and writing stay here. During the independent check, finish your attempt first.</p></>}
 <div className="reasoning-options" role="group" aria-label="Reasoning support">

 <button type="button" disabled={blocked||independentCheck||complete||Boolean(lesson&&(!['attempt','explain'].includes(lesson.stage)||lesson.hints_used>=lesson.max_hints))} onClick={hint}>Give me a hint</button>
 <button type="button" aria-pressed={mode==='direct'} className={mode==='direct'?'selected':''} disabled={blocked||independentCheck||complete||Boolean(answer&&!lesson)} onClick={()=>{if(lesson)act('direct');else{setMode('direct');setNotice('Send your question for a short explanation.');focusReply();}}}>Explain simply</button>


 </div>
 {!classroom.id&&<label>Who is helping with this practice?<select value={support} disabled={started||blocked} onChange={e=>setSupport(e.target.value)}><option value="unknown">Prefer not to say or unsure</option><option value="together">Practising together with an adult</option><option value="independent">Trying independently</option></select><span className="chat-small">Self-reported support, not a mastery score. Choose before starting. A guardian can ask why you chose a step; AI can be wrong.</span></label>}
 <details ref={more} className="chat-more"><summary>More options</summary>
 <div className="more-content">
 <button type="button" ref={attachButton} disabled={blocked||independentCheck} aria-expanded={attachOpen&&!independentCheck} onClick={()=>showPanel('attach')}><span aria-hidden="true">＋ </span>Attach work</button>
 <details className="support-choice"><summary>How would you like me to explain?</summary><div role="group" aria-label="Explanation preference">{[['primary','Short steps'],['secondary','Standard'],['senior','More detail']].map(([value,label])=><button key={value} aria-pressed={band===value} disabled={blocked} onClick={()=>setBand(value)}>{label}</button>)}</div><p>Used when you start a new question. Existing activities keep their original setting. This does not change your grade.</p></details>
 <button disabled={blocked||independentCheck||complete} onClick={()=>{setMode('guided');if(more.current)more.current.open=false;if(answer&&!lesson)begin(topic,'guided');else{setNotice(lesson?nextPrompt(lesson.stage):'Send your question. We’ll start with your idea.');focusReply();}}}>Help me think</button>
 <button disabled={blocked||independentCheck} onClick={()=>openQuiz()}>Quiz me</button>
 <button disabled={blocked||independentCheck} onClick={()=>showPanel('visual')}>Explore visually</button>
 {lesson&&['explain','feedback','apply'].includes(lesson.stage)&&<button disabled={blocked} onClick={()=>{if(more.current)more.current.open=false;act('example');}}>Show a similar example</button>}
 {lesson&&!independentCheck&&!complete&&<button disabled={blocked} onClick={()=>{if(more.current)more.current.open=false;setNotice('What rule supports your step? Do the units and assumptions fit? Try checking a different case. This is a self-check, not an AI assessment.');focusReply();}}>Check my reasoning</button>}
 <details><summary>Topic and privacy</summary><p>Curriculum: {classroom.course.qualification} · {classroom.course.syllabus_subject} · {classroom.course.version}{classroom.course.pack_version?` · Content release ${classroom.course.pack_version}`:""}</p><DraftPrivacy owner={user.id}/><label htmlFor={`${id}-topic`}>Practice topic</label><select id={`${id}-topic`} value={topicId} disabled={started||blocked} onChange={e=>setTopicId(e.target.value)}>{classroom.course.topics.map(t=><option key={t.id} value={t.id}>{t.label}</option>)}</select>
 {classroom.evaluation_enabled&&user.role==='learner'&&<label className="check"><input type="checkbox" checked={consent} disabled={started||blocked} onChange={e=>setConsent(e.target.checked)}/>Optionally share activity counts with my teacher. No written answers.</label>}
 <p>Questions and your clarification go to AI. The provider has its own data retention rules. Unsent chat text can be recovered after refresh only if tab recovery is enabled. Review saved drafts after signing in again. Other practice notes remain temporary. Quiz answers and attached work ask permission separately. Copy important work before leaving; practice sessions expire after one hour. {independent?'No teacher reports; microphone dictation is off.':'Microphone dictation may use your browser’s speech service.'}</p><p><a href="https://console.groq.com/docs/your-data" target="_blank" rel="noreferrer">How the AI provider handles data (new tab)</a></p><p>{classroom.course.safety_notice}</p><p>{classroom.course.coverage_notice}</p></details>
 {!independentCheck&&<details><summary>Past papers</summary><p>{classroom.course.pathway} {classroom.course.qualification} · syllabus {classroom.course.code}. Check year, tier and question number.</p><a href={classroom.course.pathway==='Namibia'?'https://nied.edu.na/documents/questionpapers/':'https://www.cambridgeinternational.org/resource-centre/'} target="_blank" rel="noreferrer">Open official paper resources (new tab)</a><p>Choose Attach work to practise a question or PDF page. We don’t search a paper library. Supplied criteria are not authenticated; AI feedback is not official grading.</p></details>}
 </div></details>
 {notice&&<p role="status" className="chat-coach">{notice}</p>}
 {lesson&&!work.trim()&&['attempt','explain','apply'].includes(lesson.stage)&&<button className="text-button unsure-action" disabled={blocked} onClick={()=>{setWork('I’m not sure where to start.');setNotice('You can add an idea or send this as it is.');focusReply();}}>I’m not sure</button>}
 {!complete&&!(answer&&!lesson)&&<form onSubmit={e=>{e.preventDefault();submit();}}>
 <label className="composer-label" htmlFor={`${id}-message`}>{replyLabel(lesson?.stage,clarifying)}</label>
 <div className="message-entry"><textarea ref={input} id={`${id}-message`} value={lesson?work:topic} maxLength={lesson?4000:clarifying?1000:2000} disabled={blocked} required={Boolean((lesson&&lesson.stage!=='feedback')||clarifying)} onChange={e=>lesson?setWork(e.target.value):setTopic(e.target.value)} placeholder={lesson?'Your attempt, explanation, or “I’m stuck”…':clarifying?'For example: I’m not sure which operation to use.':'Type your question or tell me what feels confusing…'}/><button disabled={blocked||Boolean(lesson&&lesson.stage!=='feedback'&&!work.trim())||(clarifying&&!topic.trim())}>{busy?'One moment…':independentCheck?'Compare my attempt':lesson?.stage==='apply'?'Try the next one on my own':lesson?.stage==='feedback'?'Continue':lesson?'Send my thinking':'Send'}</button></div>
 <VoiceTools key={String(active&&!quizOpen&&!questionOpen)+String(busy)+(lesson?.stage??mode)} allowDictation={classroom.voice_input_enabled} disabled={blocked} readText={lesson?`${prompt??''} ${nextPrompt(lesson.stage)}`:clarifying?'Which part feels tricky?':'What are you working on?'} onTranscript={text=>lesson?setWork(v=>`${v}${v?' ':''}${text}`.slice(0,4000)):setTopic(v=>`${v}${v?' ':''}${text}`.slice(0,clarifying?1000:2000))}/>
 </form>}

 {draftNotice&&<p role="status" className="chat-small">{draftNotice}</p>}
 {busy&&<p role="status" className="chat-small">One moment…</p>}
 {error&&<p role="alert" tabIndex={-1} ref={errorRef} className="error">{error}</p>}
 <p className="chat-small">AI can make mistakes. Keep personal details out of questions and uploads.</p>
 </div></section></div>{questionVisited&&<div ref={questionPanel} hidden={!questionOpen}><button className="secondary" disabled={busy||questionIndependent} onClick={()=>{setQuestionOpen(false);focusReply();}}>Back to saved lesson</button><Chat classroom={classroom} user={user} independent={independent} active={active&&questionOpen} parentToken={token} depth={depth+1} onIndependentChange={setQuestionIndependent}/></div>}</>;
}
