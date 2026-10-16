import { useState } from 'react';
import { request, type TeacherPolicy } from '../api/stemmateApi';
export default function TeacherControls() {
  const [key, setKey] = useState('');
  const [policy, setPolicy] = useState<TeacherPolicy | null>(null);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  async function perform(task: () => Promise<void>) {
    setBusy(true); setMessage('');
    try { await task(); } catch (e) { setMessage(e instanceof Error ? e.message : 'Please try again.'); }
    finally { setBusy(false); }
  }
  return <details className="teacher"><summary>Teacher controls</summary><div className="teacher-panel">
    <p>Deployment-wide controls. Get the teacher key from your administrator. Changes reset when the server restarts.</p>
    <label htmlFor="teacher-key">Teacher key</label><input id="teacher-key" type="password" autoComplete="off" value={key} onChange={e => setKey(e.target.value)} />
    <button disabled={busy || !key} onClick={() => void perform(async () => {
      await request('/teacher/evaluation', 'GET', undefined, key);
      setPolicy(await request<TeacherPolicy>('/policy'));
    })}>Open controls</button>
    {policy && <><label htmlFor="hint-limit">Maximum hints</label><select id="hint-limit" value={policy.max_hints} onChange={e => setPolicy({...policy, max_hints: Number(e.target.value)})}>{[0,1,2,3].map(n => <option key={n}>{n}</option>)}</select>
      <label className="check"><input type="checkbox" checked={policy.paused} onChange={e => setPolicy({...policy, paused: e.target.checked})} /> Pause AI learning</label>
      <label className="check"><input type="checkbox" checked={policy.evaluation_enabled} onChange={e => setPolicy({...policy, evaluation_enabled: e.target.checked})} /> Enable voluntary anonymous activity counts</label>
      <button disabled={busy} onClick={() => void perform(async () => {await request('/teacher/policy', 'PUT', policy, key); setMessage('Controls saved.');})}>Save controls</button>
      <button className="secondary" disabled={busy} onClick={() => void perform(async () => {const data = await request<{counts: Record<string, number>}>('/teacher/evaluation', 'GET', undefined, key); setMessage('Voluntary activity counts (not learning scores): ' + JSON.stringify(data.counts));})}>View counts</button>
      <button className="secondary" disabled={busy} onClick={() => void perform(async () => {await request('/teacher/evaluation', 'DELETE', undefined, key); setMessage('Counts deleted.');})}>Delete counts</button>
      <button className="text-button" onClick={() => {setKey(''); setPolicy(null); setMessage('');}}>Lock controls</button>
    </>}
    <p role="status">{message}</p>
  </div></details>;
}
