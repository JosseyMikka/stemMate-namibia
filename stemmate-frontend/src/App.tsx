import {useState} from 'react';
import {setAuthToken, type User} from './api/stemmateApi';
import AccountGate from './components/AccountGate';
import ClassroomHub from './components/ClassroomHub';
export default function App(){
  const [user,setUser]=useState<User|null>(null);
  function clear(){setAuthToken(null);setUser(null);window.speechSynthesis?.cancel();}
  return user?<ClassroomHub key={user.id} user={user} onSignOut={clear}/>:<AccountGate onSignedIn={setUser}/>;
}
