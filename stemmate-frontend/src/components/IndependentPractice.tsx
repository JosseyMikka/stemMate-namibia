import {useRef,useState} from 'react';
import type {Classroom,Course,User} from '../api/stemmateApi';
import Chat from './Chat';
import SubjectBadge from './SubjectBadge';
export default function IndependentPractice({courses,user,active}:{courses:Course[];user:User;active:boolean}){
 const [subject,setSubject]=useState('mathematics'),[grade,setGrade]=useState(10),[year,setYear]=useState(2027),[courseId,setCourseId]=useState('na-nssco');
 const settings=useRef<HTMLDetailsElement>(null);
 const [choice,setChoice]=useState<Classroom|null>(null);
 const available=courses.filter(c=>c.subject===subject&&c.grades.includes(grade)&&c.exam_years.includes(year));
 const course=available.find(c=>c.id===courseId)??available[0],defaultCourse=courses.find(c=>c.id==='na-nssco');
 function context(c:Course,g:number,y:number):Classroom{return {id:0,name:'Independent practice',grade:g,exam_year:y,course_id:c.id,course:c,max_hints:3,paused:false,evaluation_enabled:false,voice_input_enabled:false};}
 const current=choice??(defaultCourse?context(defaultCourse,10,2027):null);
 return <section aria-label="Independent practice">
 {current&&<p className="chat-context"><SubjectBadge subject={current.course.subject}/> <span>Grade {current.grade} · {current.course.pathway} {current.course.qualification} · {current.exam_year}</span></p>}
 <details ref={settings} className="practice-settings"><summary>Change subject or curriculum</summary><p>No teacher or class code needed. Save your writing before changing these choices.</p><form onSubmit={e=>{e.preventDefault();if(course){setChoice(context(course,grade,year));if(settings.current)settings.current.open=false;}}}>
 <label htmlFor="solo-subject">Subject</label><select id="solo-subject" value={subject} onChange={e=>setSubject(e.target.value)}>{[['mathematics','Mathematics'],['physics','Physics'],['chemistry','Chemistry'],['biology','Biology'],['computing','Computing']].map(([id,label])=><option key={id} value={id}>{label}</option>)}</select>
 <label htmlFor="solo-grade">School grade</label><select id="solo-grade" value={grade} onChange={e=>setGrade(Number(e.target.value))}>{[10,11,12].map(g=><option key={g}>{g}</option>)}</select>
 <label htmlFor="solo-year">Examination year</label><select id="solo-year" value={year} onChange={e=>setYear(Number(e.target.value))}><option>2026</option><option>2027</option></select>
 <label htmlFor="solo-course">Curriculum and qualification</label><select id="solo-course" value={course?.id??''} onChange={e=>setCourseId(e.target.value)}>{available.map(c=><option key={c.id} value={c.id}>{c.pathway} · {c.qualification} · {c.code}</option>)}</select>
 <p>School grade and qualification are separate choices. Starter coverage is partial. Changing choices starts a fresh chat.</p><button disabled={!course}>Use these choices and start a fresh chat</button></form></details>
 {current?<Chat key={`${current.course_id}-${current.grade}-${current.exam_year}`} classroom={current} user={user} independent active={active}/>:<p role="status">Loading practice choices…</p>}
 </section>;
}
