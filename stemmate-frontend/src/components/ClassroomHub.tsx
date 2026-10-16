import {useCallback, useEffect, useRef, useState} from 'react';
import {request, type User, type Course, type Classroom} from '../api/stemmateApi';
import TeacherControls from './TeacherControls';
import Chat from './Chat';
export default function ClassroomHub({user,onSignOut}: {user:User;onSignOut:()=>void}) {
  const [classes,setClasses]=useState<Classroom[]>([]);
  const [courses,setCourses]=useState<Course[]>([]);
  const [active,setActive]=useState<number|null>(null);
  const [name,setName]=useState('');
  const [grade,setGrade]=useState(10);
  const [subject,setSubject]=useState('mathematics');
  const [courseId,setCourseId]=useState('na-nssco');
  const [year,setYear]=useState(2027);
  const [joinCode,setJoinCode]=useState('');
  const [message,setMessage]=useState('');
  const [error,setError]=useState('');
  const [loading,setLoading]=useState(true);
  const [busy,setBusy]=useState(false);
  const pending=useRef(false);
  const activityRef=useRef<HTMLElement>(null);
  const errorRef=useRef<HTMLParagraphElement>(null);
  const refresh=useCallback(async()=>{
    const [items,available]=await Promise.all([request<Classroom[]>('/classes'),request<Course[]>('/curricula')]);
    setClasses(items);setCourses(available);return items;
  },[]);
  useEffect(()=>{
    let cancelled=false;
    async function load(){
      try{const [items,available]=await Promise.all([request<Classroom[]>('/classes'),request<Course[]>('/curricula')]);if(!cancelled){setClasses(items);setCourses(available);}}
      catch(e){if(!cancelled)setError(e instanceof Error?e.message:'Class settings could not be refreshed. Your current writing remains on this device.');}
      finally{if(!cancelled)setLoading(false);}
    }
    void load();const timer=window.setInterval(()=>void load(),30000);
    return()=>{cancelled=true;window.clearInterval(timer);};
  },[]);
  async function perform(task:()=>Promise<void>){
    if(pending.current)return;pending.current=true;setBusy(true);setError('');setMessage('');
    try{await task();}catch(e){setError(e instanceof Error?e.message:'Please try again.');requestAnimationFrame(()=>errorRef.current?.focus());}
    finally{pending.current=false;setBusy(false);}
  }
  const availableCourses=courses.filter(c=>c.subject===subject&&c.grades.includes(grade)&&c.exam_years.includes(year));
  const selectedCourse=availableCourses.find(c=>c.id===courseId)??availableCourses.find(c=>c.id.replace(/-202[67]$/,'')===courseId.replace(/-202[67]$/,''))??availableCourses[0];
  const classroom=classes.find(c=>c.id===active);
  return <div className="shell"><a className="skip-link" href="#main">Skip to classes</a>
    <header><div className="brand"><span className="brand-icon">SM</span><span>STEMMate<small>STEM • Namibia and Cambridge</small></span></div><div><span>{user.username} · {user.role}</span> <button className="secondary" disabled={busy} onClick={()=>void perform(async()=>{await request('/auth/logout','POST');onSignOut();})}>Sign out</button><button className="text-button" onClick={onSignOut}>Clear this device</button></div></header>
    <main id="main" tabIndex={-1}><h1>{user.role==='teacher'?'Your teaching classes':'Your learning classes'}</h1>
      <p>{user.role==='teacher'?'Use one account for all your subjects and grades. Each class has its own syllabus, learners and settings.':'Join with a code from your teacher, then choose your class. Your classmates cannot see your work.'}</p>
      {loading?<p role="status">Loading your classes…</p>:<>
        <button className="secondary" disabled={busy} onClick={()=>void perform(async()=>{await refresh();setMessage('Class list refreshed.');})}>Refresh classes</button>
        <div className="class-grid">{classes.map(c=><button key={c.id} className={active===c.id?'class-card selected':'class-card'} aria-pressed={active===c.id} onClick={()=>{setActive(c.id);setMessage('');requestAnimationFrame(()=>activityRef.current?.focus());}}><strong>{c.name}</strong><span>Grade {c.grade} · {c.course.pathway}</span><span>{c.course.qualification} · {c.course.syllabus_subject} {c.course.code}</span><span>Examination: {c.exam_year}</span></button>)}</div>
        {classes.length===0 && <p>No classes yet. {user.role==='teacher'?'Create your first class below.':'Ask your teacher for a class code.'}</p>}
      </>}
      <details className="card"><summary>{user.role==='teacher'?'Create a subject class':'Join a class'}</summary>
        {user.role==='teacher'?<form onSubmit={e=>{e.preventDefault();void perform(async()=>{const result=await request<{classroom:Classroom;join_code:string}>('/classes','POST',{name,grade,course_id:selectedCourse?.id,exam_year:year});await refresh();setActive(result.classroom.id);setName('');setMessage(`Class created. Join code: ${result.join_code}. Valid for seven days; share only with your class.`);});}}>
          <label htmlFor="class-name">Class name (required)</label><input id="class-name" value={name} required maxLength={80} disabled={busy} onChange={e=>setName(e.target.value)} placeholder="For example: Grade 10 Mathematics A" />
          <label htmlFor="class-subject">Subject</label><select id="class-subject" value={subject} disabled={busy} onChange={e=>setSubject(e.target.value)}>{[['mathematics','Mathematics'],['physics','Physics'],['chemistry','Chemistry'],['biology','Biology'],['computing','Computing']].map(([id,label])=><option key={id} value={id}>{label}</option>)}</select>
          <label htmlFor="class-grade">School grade</label><select id="class-grade" value={grade} disabled={busy} onChange={e=>setGrade(Number(e.target.value))}>{[10,11,12].map(g=><option key={g}>{g}</option>)}</select>
          <label htmlFor="course-id">Curriculum and qualification</label><select id="course-id" value={selectedCourse?.id??''} disabled={busy} onChange={e=>setCourseId(e.target.value)}>{availableCourses.map(c=><option key={c.id} value={c.id}>{c.pathway} · {c.qualification} · {c.syllabus_subject} {c.code} · {c.version}</option>)}</select>
          <p>{selectedCourse?.coverage_notice}</p>
          <label htmlFor="exam-year">Examination year</label><select id="exam-year" value={year} disabled={busy} onChange={e=>setYear(Number(e.target.value))}><option>2026</option><option>2027</option></select>
          <p>School grade and Cambridge qualification are separate choices. Only listed exam years are supported. Starter topics cover part of the syllabus.</p>
          <button disabled={busy||loading||!selectedCourse}>Create class</button>
        </form>:<form onSubmit={e=>{e.preventDefault();void perform(async()=>{const result=await request<Classroom>('/classes/join','POST',{code:joinCode});await refresh();setActive(result.id);setJoinCode('');setMessage('You joined the class.');});}}>
          <label htmlFor="join-code">Class code (required)</label><input id="join-code" value={joinCode} required minLength={8} maxLength={32} autoComplete="off" autoCapitalize="characters" disabled={busy} onChange={e=>setJoinCode(e.target.value)} /><button disabled={busy}>Join class</button>
        </form>}
      </details>
      <p role="status">{message}</p>{error&&<p role="alert" ref={errorRef} tabIndex={-1} className="error">{error}</p>}
      {classroom&&<section key={classroom.id} ref={activityRef} tabIndex={-1} className="classroom" aria-label={classroom.name}>
        <h2>{classroom.name}</h2><p>{classroom.course.pathway} · {classroom.course.qualification} · {classroom.course.syllabus_subject} {classroom.course.code} · Grade {classroom.grade} · Exam {classroom.exam_year}</p>
        <p className="privacy">{classroom.course.safety_notice}</p>
        <p className="privacy">{classroom.course.coverage_notice} The catalogue identifies a syllabus; it does not certify full coverage.</p>
        <p><a href={classroom.course.source} target="_blank" rel="noreferrer">Open the official syllabus source (new tab)</a></p>
        {user.role==='teacher'&&<><TeacherControls key={classroom.id} classroom={classroom} onUpdate={updated=>setClasses(items=>items.map(c=>c.id===updated.id?updated:c))} /><p>Teacher preview: your practice does not contribute to learner activity counts.</p></>}
        {user.role==='learner'&&<button className="text-button" disabled={busy} onClick={()=>void perform(async()=>{await request(`/classes/${classroom.id}/members/${user.id}`,'DELETE');setActive(null);await refresh();setMessage('You left the class. Your teacher can invite you again.');})}>Leave this class</button>}
        <Chat key={classroom.id} classroom={classroom} user={user} />
      </section>}
    </main></div>;
}
