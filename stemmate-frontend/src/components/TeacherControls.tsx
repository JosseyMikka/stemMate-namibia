import {useRef, useState} from 'react';
import {request, type Classroom, type TeacherPolicy} from '../api/stemmateApi';
export default function TeacherControls({classroom, onUpdate}: {classroom: Classroom; onUpdate: (value: Classroom) => void}) {
  const [policy,setPolicy] = useState<TeacherPolicy>({...classroom});
  const [message,setMessage] = useState('');
  const [busy,setBusy] = useState(false);
  const [members,setMembers] = useState<{id:number;username:string}[]>([]);
  const [counts,setCounts] = useState<Record<string,number> | null>(null);
  const inFlight = useRef(false);
  async function perform(task:()=>Promise<void>) {
    if(inFlight.current)return;
    inFlight.current=true;setBusy(true);setMessage('');
    try {await task();} catch(e){setMessage(e instanceof Error ? e.message : 'Please try again.');}
    finally{inFlight.current=false;setBusy(false);}
  }
  return <details className="teacher"><summary>Settings for {classroom.name}</summary><div className="teacher-panel">
    <p>These settings apply only to this class. Your other grades and classes keep their own settings.</p>
    <fieldset disabled={busy}><legend>Learning support</legend>
      <label htmlFor="hint-limit">Maximum hints</label><select id="hint-limit" value={policy.max_hints} onChange={e=>setPolicy({...policy,max_hints:Number(e.target.value)})}>{[0,1,2,3].map(n=><option key={n}>{n}</option>)}</select>
      <label className="check"><input type="checkbox" checked={policy.paused} onChange={e=>setPolicy({...policy,paused:e.target.checked})} /> Pause learning in this class</label>
      <label className="check"><input type="checkbox" checked={policy.voice_input_enabled} onChange={e=>setPolicy({...policy,voice_input_enabled:e.target.checked})} /> Allow optional voice dictation (browser speech service may process audio)</label>
      <label className="check"><input type="checkbox" checked={policy.evaluation_enabled} onChange={e=>setPolicy({...policy,evaluation_enabled:e.target.checked})} /> Enable voluntary aggregate activity counts</label>
      <button onClick={()=>void perform(async()=>{const result=await request<Classroom>(`/classes/${classroom.id}/policy`,'PUT',{max_hints:policy.max_hints,paused:policy.paused,evaluation_enabled:policy.evaluation_enabled,voice_input_enabled:policy.voice_input_enabled});onUpdate(result);setMessage('Class settings saved.');})}>Save class settings</button>
    </fieldset>
    <button className="secondary" disabled={busy} onClick={()=>void perform(async()=>{const result=await request<{join_code:string}>(`/classes/${classroom.id}/invitation`,'POST');setMessage(`New class code: ${result.join_code}. Valid for seven days. The previous code no longer works. Share only with this class.`);})}>Create a new join code</button>
    <button className="secondary" disabled={busy} onClick={()=>void perform(async()=>{setMembers(await request(`/classes/${classroom.id}/members`));})}>View class members</button>
    {members.length>0 && <ul>{members.map(member=><li key={member.id}>{member.username} <button className="text-button" disabled={busy} onClick={()=>void perform(async()=>{await request(`/classes/${classroom.id}/members/${member.id}`,'DELETE');setMembers(m=>m.filter(x=>x.id!==member.id));setMessage('Learner removed from this class. They can rejoin only with a valid class code. Rotate the code if needed.');})}>Remove {member.username}</button></li>)}</ul>}
    <button className="secondary" disabled={busy} onClick={()=>void perform(async()=>{const result=await request<{counts:Record<string,number>;notice:string}>(`/classes/${classroom.id}/evaluation`);setCounts(result.counts);setMessage(result.notice);})}>View activity counts</button>
    {counts && <dl>{Object.entries(counts).map(([name,total])=><div key={name}><dt>{name}</dt><dd>{total}</dd></div>)}</dl>}
    <button className="secondary" disabled={busy} onClick={()=>void perform(async()=>{await request(`/classes/${classroom.id}/evaluation`,'DELETE');setCounts(null);setMessage('Class activity counts deleted.');})}>Delete class counts</button>
    <p role="status">{message}</p>
  </div></details>;
}
