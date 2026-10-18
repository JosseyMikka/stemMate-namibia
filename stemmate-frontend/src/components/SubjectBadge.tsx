import {subjectTheme,subjectStyle} from './subjectTheme';
export default function SubjectBadge({subject}:{subject:string}){
 const theme=subjectTheme(subject);
 return <span className="subject-badge" style={subjectStyle(subject)}><span className="subject-symbol" aria-hidden="true">{theme.symbol}</span>{theme.label}</span>;
}
