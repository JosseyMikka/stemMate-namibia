import type {CSSProperties} from 'react';
export const subjectThemes:Record<string,{label:string;symbol:string;ink:string;wash:string}>={
 mathematics:{label:'Mathematics',symbol:'∑',ink:'#1e4f91',wash:'#eaf2fc'},
 physics:{label:'Physics',symbol:'↗',ink:'#66389b',wash:'#f3edfc'},
 chemistry:{label:'Chemistry',symbol:'⚗',ink:'#006d77',wash:'#e6f5f5'},
 biology:{label:'Biology',symbol:'◉',ink:'#24633a',wash:'#eaf5ed'},
 computing:{label:'Computing / Computer Science',symbol:'</>',ink:'#984515',wash:'#fff0e5'},
};
const fallback={label:'STEM',symbol:'SM',ink:'#315e94',wash:'#edf3fd'};
export function subjectTheme(subject:string){return Object.hasOwn(subjectThemes,subject)?subjectThemes[subject]:fallback;}
export function subjectStyle(subject:string):CSSProperties{
 const theme=subjectTheme(subject);
 return {'--subject-ink':theme.ink,'--subject-wash':theme.wash} as CSSProperties;
}
