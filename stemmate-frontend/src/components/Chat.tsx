import { lazy, Suspense, useRef, useState } from 'react';
import { request, type Lesson, type Classroom, type User } from '../api/stemmateApi';
const MathContent = lazy(() => import('./MessageContent'));
function MessageContent({ content }: {content: string}) {
  return <Suspense fallback={<p role="status">Loading learning material…</p>}><MathContent content={content} /></Suspense>;
}
import VoiceTools from './VoiceTools';

const stages = ['attempt', 'explain', 'feedback', 'apply', 'independent', 'complete'];
const labels: Record<string, string> = {
  attempt: 'Predict or try', explain: 'Explain your thinking', feedback: 'Compare and reflect',
  apply: 'Apply your learning', independent: 'Try independently', complete: 'Review your learning',
};
export default function Chat({classroom, user}: {classroom: Classroom; user: User}) {
  const [topic, setTopic] = useState('');
  const [band, setBand] = useState('secondary');
  const [topicId, setTopicId] = useState(classroom.course.topics[0].id);
  const [consent, setConsent] = useState(false);
  const [mode, setMode] = useState('guided');
  const [token, setToken] = useState('');
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [answer, setAnswer] = useState('');
  const [work, setWork] = useState('');
  const [notes, setNotes] = useState<{label: string; text: string}[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const inFlight = useRef(false);
  const focusTarget = useRef<HTMLHeadingElement>(null);
  const errorTarget = useRef<HTMLParagraphElement>(null);

  async function run(task: () => Promise<void>) {
    if (inFlight.current) return;
    inFlight.current = true; setBusy(true); setError('');
    try { await task(); requestAnimationFrame(() => focusTarget.current?.focus()); }
    catch (e) { setError(e instanceof Error ? e.message : 'Please try again.'); requestAnimationFrame(() => errorTarget.current?.focus()); }
    finally { inFlight.current = false; setBusy(false); }
  }
  function start() {
    void run(async () => {
      if (mode === 'direct') {
        const result = await request<{answer: string}>('/explain', 'POST', {class_id: classroom.id, topic_id: topicId, topic, band});
        setAnswer(result.answer);
      } else {
        const result = await request<Lesson & {token: string}>('/learning', 'POST', {class_id: classroom.id, topic_id: topicId, topic, band, consent: user.role === 'learner' && consent});
        setLesson(result); setToken(result.token);
      }
    });
  }
  function act(action: string) {
    void run(async () => {
      const result = await request<Lesson>('/learning/session', 'POST', {action, attempted: Boolean(work.trim())}, undefined, token);
      if (action === 'continue') {
        if (work.trim()) setNotes(n => [...n, {label: labels[lesson!.stage], text: work}]);
        setWork(''); setAnswer('');
      }
      if (result.direct_explanation) setAnswer(result.direct_explanation);
      setLesson(result);
    });
  }
  function reset() {
    void run(async () => {
      if (token) await request('/learning/session', 'DELETE', undefined, undefined, token);
      setToken(''); setLesson(null); setAnswer(''); setNotes([]); setWork('');
    });
  }
  const prompt = lesson?.stage === 'apply' ? lesson.application : lesson?.stage === 'independent' ? lesson.independent : lesson?.challenge;
  return <section className="learning-area" aria-label="Learning activity">
      <p className="eyebrow">YOUR NAMIBIAN STEM LEARNING PARTNER</p>
      <h2>Build understanding, one thought at a time.</h2>
      <p className="intro">Try an idea, get a little support, and see what you can do on your own.</p>
      <aside className="privacy">Keep your name, school and contact details out of your work. AI can make mistakes; check important ideas with your teacher. Use supplied data for science activities; practical work requires your teacher’s approval and supervision.</aside>
      {!lesson && !answer && <section className="card">
        <h2 ref={focusTarget} tabIndex={-1}>What are you exploring?</h2>
        <form onSubmit={e => {e.preventDefault(); start();}}>
          <fieldset disabled={busy}><legend>Choose how to learn</legend><div className="mode-options">
            <label><input type="radio" name="mode" value="guided" checked={mode === 'guided'} onChange={() => setMode('guided')} /> Guide my thinking <small>Try → hints → explain → apply → independent check</small></label>
            <label><input type="radio" name="mode" value="direct" checked={mode === 'direct'} onChange={() => setMode('direct')} /> Explain it directly <small>Accessible, step-by-step support when you need it</small></label>
          </div></fieldset>
          <label htmlFor="band">Reading support for optional AI questions</label><select id="band" value={band} disabled={busy} onChange={e => setBand(e.target.value)}><option value="primary">Simpler English — short, concrete steps</option><option value="secondary">Standard explanation — build connections</option><option value="senior">Detailed explanation — deeper reasoning</option></select>
          <label htmlFor="practice-topic">Practice topic</label><select id="practice-topic" disabled={busy} value={topicId} onChange={e=>setTopicId(e.target.value)}>{classroom.course.topics.map(t=><option key={t.id} value={t.id}>{t.label}</option>)}</select>
          <p>Leave the optional question blank for an original starter lesson without an AI call. AI responses require teacher review for syllabus accuracy.</p>
          <label htmlFor="topic">Optional question for the AI tutor</label><textarea id="topic" value={topic} maxLength={2000} disabled={busy} onChange={e => setTopic(e.target.value)} placeholder="Leave blank for starter practice. For AI help, ask a question about the selected topic." />
          <VoiceTools allowDictation={classroom.voice_input_enabled} key={mode + band + String(busy) + String(classroom.voice_input_enabled)} disabled={busy} onTranscript={text => setTopic(previous => `${previous}${previous ? ' ' : ''}${text}`.slice(0, 2000))} />
          {mode === 'guided' && user.role === 'learner' && <label className="check"><input type="checkbox" checked={consent} disabled={busy} onChange={e => setConsent(e.target.checked)} /> Share aggregate activity counts if my teacher enables evaluation. Optional; no answers or personal details are included. Ask your teacher or guardian before opting in.</label>}
          <button disabled={busy || classroom.paused}>{busy ? 'Preparing…' : mode === 'guided' ? 'Start thinking →' : 'Show an explanation'}</button>
        </form>
      </section>}
      {lesson && <>
        <p className="privacy">{lesson.content_source === 'ai_general_support' ? 'AI-generated support: curriculum accuracy requires teacher review.' : classroom.course.coverage_notice}</p>
        <ol className="progress" aria-label="Learning progress">{stages.map((s, i) => <li key={s} aria-current={s === lesson.stage ? 'step' : undefined} className={s === lesson.stage ? 'current' : ''}><span>{i + 1}</span>{labels[s]}</li>)}</ol>
        <section className="card" aria-busy={busy}>
          <p className="eyebrow">STEP {stages.indexOf(lesson.stage) + 1} OF 6</p>
          <h2 ref={focusTarget} tabIndex={-1}>{labels[lesson.stage]}</h2>
          {lesson.stage !== 'complete' && <MessageContent content={prompt ?? ''} />}
          {lesson.stage === 'attempt' && <p>What do you predict? Try a first step and say why. Being unsure is welcome.</p>}
          {lesson.stage === 'explain' && <><p>Explain why your approach might work. What rule or evidence supports it? You can also explain where you are stuck.</p>{lesson.hints.map((h, i) => <aside className="hint" key={i}><strong>Hint {i + 1}</strong><MessageContent content={h} /></aside>)}<button className="secondary" disabled={busy || lesson.hints_used >= lesson.max_hints} onClick={() => act('hint')}>One more hint ({lesson.hints_used}/{lesson.max_hints})</button></>}
          {lesson.stage === 'feedback' && <><MessageContent content={lesson.explanation ?? ''} /><p>Compare this with your attempt. Where do the reasons agree? What would you change? This is a model explanation, not a mark for your work.</p></>}
          {lesson.stage === 'apply' && <p>Use the idea in this new situation. Show your steps and explain your choice.</p>}
          {lesson.stage === 'independent' && <aside className="hint">Try this new problem without AI hints, notes or outside help. Your answer stays in this browser and is not sent to the AI. This is practice, not a supervised assessment.</aside>}
          {lesson.stage === 'complete' ? <>
            <p>You have completed the learning steps. Completion alone does not show mastery.</p>
            {lesson.direct_used && <p>You used a direct explanation. Keep that support in mind when reviewing what you can do alone.</p>}
            <h3>Application: compare your reasoning</h3><MessageContent content={lesson.application ?? ''} /><MessageContent content={lesson.application_explanation ?? ''} />
            <h3>Independent check: compare after your attempt</h3><MessageContent content={lesson.independent ?? ''} /><MessageContent content={lesson.independent_explanation ?? ''} />
            <p>Can you explain every step without looking? Ask your teacher to review uncertain answers and try another problem later without help.</p>
          </> : <form onSubmit={e => {e.preventDefault(); act('continue');}}>
            <VoiceTools allowDictation={classroom.voice_input_enabled} key={lesson.stage + String(busy) + String(classroom.voice_input_enabled)} disabled={busy} readText={prompt} onTranscript={text => setWork(previous => `${previous}${previous ? ' ' : ''}${text}`.slice(0, 4000))} />
            <label htmlFor="work">{lesson.stage === 'feedback' ? 'Your reflection (optional)' : 'Your thinking (required)'}</label>
            <textarea id="work" value={work} maxLength={4000} disabled={busy} required={lesson.stage !== 'feedback'} onChange={e => setWork(e.target.value)} placeholder="Write a short attempt, explain your idea, or say where you are stuck." />
            <button disabled={busy || (lesson.stage !== 'feedback' && !work.trim())}>{busy ? 'Saving step…' : lesson.stage === 'independent' ? 'Submit attempt and compare' : 'Continue →'}</button>
          </form>}
          {!['independent', 'complete'].includes(lesson.stage) && <button className="text-button" disabled={busy} onClick={() => act('direct')}>I need a direct explanation</button>}
        </section>
      </>}
      {answer && <section className="card"><h2 ref={!lesson ? focusTarget : undefined} tabIndex={-1}>Direct explanation</h2><p>Use this support, then try explaining the idea yourself. Reading an answer is different from doing it independently.</p><MessageContent content={answer} /></section>}
      {notes.length > 0 && lesson?.stage !== 'independent' && <details className="card"><summary>Your thinking in this browser</summary>{notes.map((n, i) => <div key={i}><h3>{n.label}</h3><p className="learner-text">{n.text}</p></div>)}</details>}
      {(lesson || answer) && <button className="secondary" disabled={busy} onClick={reset}>Clear this session and start again</button>}
      {busy && <p role="status" aria-live="polite">Working on your request…</p>}{error && <p ref={errorTarget} tabIndex={-1} role="alert" className="error">{error}</p>}
      <footer>Optional AI questions are sent to our AI provider with material tagged for this syllabus, when available. Starter lessons use original practice content. Your written attempts stay in this browser. Optional voice input may use your browser’s external transcription service. Temporary lesson plans expire after one hour; clearing a session deletes its plan. No chat history is saved.</footer>
  </section>;
}
