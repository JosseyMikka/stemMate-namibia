import {useEffect,useId,useState,type ReactNode} from 'react';
/** Supplemental text: mouse hover, keyboard focus/Escape, or tap. Never hides consent. */
export default function InlineHelp({label,children}:{label:string;children:ReactNode}){
 const id=useId(),[hovered,setHovered]=useState(false),[focused,setFocused]=useState(false),[pinned,setPinned]=useState(false),[dismissed,setDismissed]=useState(false);
 const open=!dismissed&&(hovered||focused||pinned);
 useEffect(()=>{if(!open)return;const close=(event:KeyboardEvent)=>{if(event.key==='Escape'){setDismissed(true);setPinned(false);}};document.addEventListener('keydown',close);return()=>document.removeEventListener('keydown',close);},[open]);
 return <span className="inline-help" onPointerEnter={e=>{if(e.pointerType==='mouse'){setHovered(true);setDismissed(false);}}} onPointerLeave={()=>setHovered(false)} onFocus={()=>{setFocused(true);setDismissed(false);}} onBlur={()=>{setFocused(false);setPinned(false);}}>
 <button type="button" className="help-trigger" aria-label={`Help with ${label}`} aria-describedby={id} aria-expanded={open} onClick={()=>{setPinned(!pinned);setDismissed(pinned);}}>?</button>
 <span id={id} role="tooltip" className="help-content" hidden={!open}>{children}</span>
 </span>;
}
