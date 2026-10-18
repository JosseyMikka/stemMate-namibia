import {useEffect,useId,useRef,useState} from 'react';
import {request,type Classroom} from '../api/stemmateApi';
import MessageContent from './MessageContent';
import VoiceTools from './VoiceTools';
interface Quiz {token?:string;complete:boolean;number:number;total:number;question:string;hints:string[];answered:boolean;hints_used:number;max_hints:number;reviewed:number;supported:number;feedback?:string}
export default function QuizPractice({classroom,topicId,band,initialTopic,learningToken,active,onClose}:{classroom:Classroom;topicId:string;band:string;initialTopic:string;learningToken:string;active:boolean;onClose:()=>void}){
 const id=useId(),pending=useRef(false),title=useRef<HTMLHeadingElement>(null),errorRef=useRef<HTMLParagraphElement>(null);
 const [topic,setTopic]=useState(initialTopic),[consent,setConsent]=useState(false),[quiz,setQuiz]=useState<Quiz|null>(null),[token,setToken]=useState('');
 const [answer,setAnswer]=useState(''),[reason,setReason]=useState(''),[reflection,setReflection]=useState(''),[notes,setNotes]=useState<string[]>([]),[busy,setBusy]=useState(false),[error,setError]=useState('');
 useEffect(()=>{title.current?.focus();},[]);
 const blocked=busy||!active||classroom.paused;
 async function run(task:()=>Promise<void>){if(pending.current)return;pending.current=true;setBusy(true);setError('');try{await task();requestAnimationFrame(()=>title.current?.focus());}catch(e){setError(e instanceof Error?e.message:'Please try again.');requestAnimationFrame(()=>errorRef.current?.focus());}finally{pending.current=false;setBusy(false);}}
 function start(){if(blocked||!consent)return;void run(async()=>{const r=await request<Quiz>('/quiz','POST',{class_id:classroom.id,course_id:classroom.course_id,grade:classroom.grade,exam_year:classroom.exam_year,topic_id:topicId,topic,band,consent},undefined,learningToken);setToken(r.token!);setQuiz(r);});}
 function act(action:'hint'|'answer'|'next'){if(blocked)return;void run(async()=>{const r=await request<Quiz>('/quiz/session','POST',{action,...(action==='answer'?{answer,reasoning:reason}:{})},undefined,token);if(action==='next'){setNotes(n=>[...n,reflection]);setAnswer('');setReason('');setReflection('');}setQuiz(r);});}
 function leave(restart=false){void run(async()=>{if(token)await request('/quiz/session','DELETE',undefined,undefined,token).catch(()=>undefined);setToken('');setQuiz(null);setAnswer('');setReason('');setReflection('');setNotes([]);setConsent(false);if(!restart)onClose();});}
 return <section className="chat-workspace" aria-label="Quiz practice">
 <div className="chat-topbar"><div><span className="eyebrow">{classroom.course.subject_label} · Grade {classroom.grade} · {classroom.course.pathway} {classroom.course.qualification}</span><h2 ref={title} tabIndex={-1}>{quiz?.complete?'What will you revisit?':'Quiz me'}</h2></div><button className="secondary" disabled={busy} onClick={()=>leave()}>Back to chat</button></div>
 {!quiz&&<div className="chat-bubble tutor-bubble"><p>Three questions, one at a time. Explain your answer, then we’ll look at the reasoning.</p>
 <label htmlFor={`${id}-topic`}>What would you like to practise? (optional)</label><input id={`${id}-topic`} maxLength={2000} value={topic} disabled={blocked} onChange={e=>setTopic(e.target.value)} placeholder={classroom.course.topics.find(t=>t.id===topicId)?.label}/>
 <label className="check"><input type="checkbox" checked={consent} disabled={blocked} onChange={e=>setConsent(e.target.checked)}/>Send my quiz answers and reasoning to AI for feedback. I’ll leave out personal details.</label>
 <details><summary>Quiz privacy</summary><p>Your answers go to the AI provider only when you submit them. STEMMate does not save quiz answers, feedback or reflection notes in its database or teacher reports. Temporary question plans expire after one hour. Back to chat clears this quiz; refresh or sign-out clears the browser draft. The provider has its own retention policies.</p></details>
 <button disabled={blocked||!consent} onClick={start}>Start three questions</button></div>}
 {quiz&&!quiz.complete&&<div className="chat-conversation"><div className="chat-bubble tutor-bubble"><p className="eyebrow">Question {quiz.number} of {quiz.total}{topic.trim()?` · ${topic}`:''}</p><MessageContent content={quiz.question}/>
 {quiz.hints.map((h,i)=><aside className="hint" key={i}><strong>Hint {i+1}</strong><MessageContent content={h}/></aside>)}
 {quiz.hints_used>0&&<p className="chat-small">You used a hint. This question is supported practice.</p>}
 {!quiz.answered?<form onSubmit={e=>{e.preventDefault();act('answer');}}>
 <label htmlFor={`${id}-answer`}>Your answer</label><textarea id={`${id}-answer`} required maxLength={4000} value={answer} disabled={blocked} onChange={e=>setAnswer(e.target.value)}/>
 <label htmlFor={`${id}-reason`}>Why do you think that?</label><textarea id={`${id}-reason`} required maxLength={2000} value={reason} disabled={blocked} onChange={e=>setReason(e.target.value)} placeholder="Explain a step, a rule, or why you’re unsure."/>
 <button disabled={blocked||!answer.trim()||!reason.trim()}>Get reasoning feedback</button>
 {quiz.max_hints>0&&<button className="secondary" type="button" disabled={blocked||quiz.hints_used>=quiz.max_hints} onClick={()=>act('hint')}>Need a hint? ({quiz.hints_used}/{quiz.max_hints})</button>}
 <p className="chat-small">Your answer and reasoning will go to AI. Hints make this supported practice.</p>
 <VoiceTools key={String(active)+String(busy)} allowDictation={classroom.voice_input_enabled} disabled={blocked} readText={quiz.question} onTranscript={text=>setReason(v=>`${v}${v?' ':''}${text}`.slice(0,2000))}/>
 </form>:<><details><summary>Your response</summary><p className="learner-text">{answer}</p><p className="learner-text">{reason}</p></details><h3>Let’s look at your reasoning</h3><MessageContent content={quiz.feedback??''}/><label htmlFor={`${id}-reflect`}>What would you change or remember? (optional)</label><textarea id={`${id}-reflect`} maxLength={1000} value={reflection} disabled={blocked} onChange={e=>setReflection(e.target.value)}/><p className="chat-small">This note stays on this page; it is not sent to AI.</p><button disabled={blocked} onClick={()=>act('next')}>{quiz.number===quiz.total?'See my recap':'Next question'}</button></>}
 </div></div>}
 {quiz?.complete&&<div className="chat-bubble tutor-bubble"><p>You attempted {quiz.reviewed} questions: {quiz.reviewed-quiz.supported} without STEMMate hints and {quiz.supported} with hints. This is a practice recap, not a grade or proof of mastery.</p>{notes.some(Boolean)&&<details><summary>My reflection notes</summary>{notes.map((n,i)=>n&&<p key={i}>Question {i+1}: {n}</p>)}</details>}<p>Which idea would you like to practise again? Try a different question later without help.</p><button disabled={busy} onClick={()=>leave(true)}>Start another quiz</button></div>}
 {busy&&<p role="status">One moment…</p>}{error&&<p role="alert" className="error" tabIndex={-1} ref={errorRef}>{error}</p>}
 <p className="chat-small">AI questions and feedback can be wrong. Check uncertain points with a teacher; syllabus alignment is not verified.</p>
 </section>;
}
