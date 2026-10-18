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

// Only explicit quiz requests are commands; ordinary questions containing “quiz” remain questions.
export function quizRequest(text:string):string|null{
 const match=text.trim().match(/^(?:(?:can|could|would) you\s+)?(?:please\s+)?(?:quiz me|give me a quiz|start (?:a )?quiz|(?:i want|i would like|i’d like|i'd like) a quiz)(?:\s+(?:on|about|in)\s+(.+?))?[.!?]*$/i);
 return match?(match[1]??'').replace(/[.!?]+$/,'').trim():null;
}

export function hintGuidance(used:number,maximum:number){
 return used>=maximum?'You’ve used the available hints. Share what you understand, or choose Explain simply.':'If you’re unsure, ask for a hint.';
}
export function showChallenge(stage:Lesson['stage']){
 return ['attempt','explain','apply','independent'].includes(stage);
}
