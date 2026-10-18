import type {Lesson} from '../api/stemmateApi';
export function needsClarification(question:string){
 const text=question.trim();
 return text.length>0&&text.length<220&&!/[0-9=]/.test(text)&&/\b(help|stuck|confus\w*|don[’']?t understand|do not understand|not sure)\b/i.test(text);
}
export function withClarification(question:string,detail:string){return `${question.trim()}\nWhat I need help with: ${detail.trim()}`.slice(0,2000);}
export function nextPrompt(stage:Lesson['stage']){
 return {
  attempt:'What would you try first? “I’m stuck” is enough to start.',
  explain:'What made you choose that step?',
  feedback:'What matches your thinking, and what would you change?',
  apply:'Can you use the idea here? Show your first step.',
  independent:'Try this one on your own. Help and earlier notes are hidden until you finish.',
  complete:'What can you now explain without help?'
 }[stage];
}
export function replyLabel(stage?:Lesson['stage'],clarifying=false){
 if(clarifying)return 'What feels tricky?';
 if(!stage)return 'What are you working on?';
 return stage==='feedback'?'Your reflection (optional)':'Your thinking';
}
