import {useState} from 'react';
import type {Classroom,Course,User} from '../api/stemmateApi';
import Chat from './Chat';
export default function IndependentPractice({courses,user,active}:{courses:Course[];user:User;active:boolean}){
 const [subject,setSubject]=useState('mathematics'),[grade,setGrade]=useState(10),[year,setYear]=useState(2027),[courseId,setCourseId]=useState('na-nssco');
 const [choice,setChoice]=useState<Classroom|null>(null);
 const available=courses.filter(c=>c.subject===subject&&c.grades.includes(grade)&&c.exam_years.includes(year));
 const course=available.find(c=>c.id===courseId)??available[0];
 return <section aria-label="Independent practice"><h2>Practise on your own</h2><p>No teacher or class code needed. Try an idea, use a hint and check what you can do independently.</p>
 {!choice?<form className="card" onSubmit={e=>{e.preventDefault();if(course)setChoice({id:0,name:'Independent practice',grade,exam_year:year,course_id:course.id,course,max_hints:3,paused:false,evaluation_enabled:false,voice_input_enabled:false});}}>
 <label htmlFor="solo-subject">Subject</label><select id="solo-subject" value={subject} onChange={e=>setSubject(e.target.value)}>{[['mathematics','Mathematics'],['physics','Physics'],['chemistry','Chemistry'],['biology','Biology'],['computing','Computing']].map(([id,label])=><option key={id} value={id}>{label}</option>)}</select>
 <label htmlFor="solo-grade">School grade</label><select id="solo-grade" value={grade} onChange={e=>setGrade(Number(e.target.value))}>{[10,11,12].map(g=><option key={g}>{g}</option>)}</select>
 <label htmlFor="solo-year">Examination year</label><select id="solo-year" value={year} onChange={e=>setYear(Number(e.target.value))}><option>2026</option><option>2027</option></select>
 <label htmlFor="solo-course">Curriculum and qualification</label><select id="solo-course" value={course?.id??''} onChange={e=>setCourseId(e.target.value)}>{available.map(c=><option key={c.id} value={c.id}>{c.pathway} · {c.qualification} · {c.code}</option>)}</select>
 <p>Choose your qualification separately from school grade. Starter activities cover part of the syllabus; you can also ask a STEM question about your selected topic.</p><button disabled={!course}>Choose a practice topic →</button></form>:<><details><summary>Practice choices and privacy</summary><p>{choice.course.pathway} · {choice.course.qualification} · {choice.course.subject_label} · Grade {choice.grade} · {choice.exam_year}</p><p>Your writing stays in this browser. No teacher reports, project submissions or activity counts. Optional questions and curriculum context are sent to the AI provider. Starter activities need no AI call. Your first thoughts and later attempts stay on this device. External microphone transcription is off. Spoken prompts remain available. Temporary plans expire after one hour. Copy any writing you need before leaving.</p><button className="secondary" onClick={()=>setChoice(null)}>Change practice choices (clears this activity)</button></details><Chat classroom={choice} user={user} independent active={active}/></>}
 </section>;
}
