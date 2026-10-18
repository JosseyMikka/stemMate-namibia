import {useRef, useState} from 'react';
import {request, setAuthToken, type User} from '../api/stemmateApi';
export default function AccountGate({onSignedIn}: {onSignedIn: (user: User) => void}) {
  const [register, setRegister] = useState(false);
  const [role, setRole] = useState('learner');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [invitation, setInvitation] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const errorRef = useRef<HTMLParagraphElement>(null);
  const pending = useRef(false);
  async function submit() {
    if (pending.current) return;
    pending.current = true; setBusy(true); setError('');
    try {
      const result = await request<{token: string; user: User}>(register ? '/auth/register' : '/auth/login','POST',register ? {username,password,role,invitation} : {username,password});
      setAuthToken(result.token); setPassword(''); setInvitation(''); onSignedIn(result.user);
    } catch(e) {setError(e instanceof Error ? e.message : 'Please try again.'); requestAnimationFrame(() => errorRef.current?.focus());}
    finally {pending.current = false; setBusy(false);}
  }
  return <main className="account-page" id="main"><p className="eyebrow">STEMMATE STEM • GRADES 10–12</p><h1>A little support.<br />Your own thinking.</h1>
    <p>Mathematics, Physics, Chemistry, Biology and Computing. Namibia NSSCO/NSSCAS and Cambridge IGCSE/AS &amp; A Level pathways.</p>
    <section className="card"><h2>{register ? 'Create your account' : 'Sign in'}</h2>
      <p>Practise independently or join your teacher’s class. Use an alias instead of your full name. No personal email address is required. On a shared device, sign out when finished.</p>
      <form onSubmit={e => {e.preventDefault(); void submit();}}>
        <label htmlFor="username">Username (required)</label><input id="username" autoComplete="username" autoCapitalize="none" spellCheck={false} minLength={3} maxLength={40} pattern="[a-zA-Z0-9_-]{3,40}" required value={username} disabled={busy} onChange={e=>setUsername(e.target.value)} aria-describedby="alias-help" />
        <p id="alias-help">3–40 letters, numbers, hyphens or underscores. Avoid personal details.</p>
        <label htmlFor="password">Password (required)</label><input id="password" type="password" autoComplete={register ? 'new-password' : 'current-password'} minLength={12} maxLength={128} required value={password} disabled={busy} onChange={e=>setPassword(e.target.value)} aria-describedby="password-help" />
        <p id="password-help">Use 12–128 characters. Password managers and paste are supported.</p>
        {register && <><label htmlFor="account-role">Account type</label><select id="account-role" value={role} disabled={busy} onChange={e=>setRole(e.target.value)}><option value="learner">Learner</option><option value="teacher">Invited teacher</option></select>
          {role === 'teacher' && <><label htmlFor="teacher-invitation">Teacher invitation (required)</label><input id="teacher-invitation" type="password" autoComplete="off" required value={invitation} maxLength={200} disabled={busy} onChange={e=>setInvitation(e.target.value)} /><p>Ask your school administrator. Learners cannot grant themselves teacher access.</p></>}
        </>}
        <button disabled={busy}>{busy ? 'Please wait…' : register ? 'Create account' : 'Sign in'}</button>
        <button type="button" className="text-button" disabled={busy} onClick={()=>{setRegister(!register);setError('');setPassword('');setInvitation('');}}>{register ? 'I already have an account' : 'Create an account'}</button>
      </form>
      {error && <p ref={errorRef} tabIndex={-1} role="alert" className="error">{error}</p>}
    </section><footer>Sign-in lasts up to eight hours. This browser keeps your sign-in in memory only; refresh requires signing in again. Optional saved chat drafts can be reviewed after the same account signs back in; sign-out clears them. Ask your administrator for help if you forget your password. Starter practice does not need an AI provider, but this website needs a connection to the school server.</footer>
  </main>;
}
