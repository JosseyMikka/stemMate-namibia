import assert from 'node:assert/strict';
import {renderToStaticMarkup} from 'react-dom/server';
import SubjectBadge from './SubjectBadge';
import {subjectThemes,subjectTheme} from './subjectTheme';
function luminance(hex:string){
 const rgb=hex.slice(1).match(/../g)!.map(v=>parseInt(v,16)/255).map(v=>v<=0.04045?v/12.92:((v+0.055)/1.055)**2.4);
 return rgb[0]*0.2126+rgb[1]*0.7152+rgb[2]*0.0722;
}
function contrast(a:string,b:string){const x=luminance(a),y=luminance(b);return (Math.max(x,y)+0.05)/(Math.min(x,y)+0.05);}
assert.equal(Object.keys(subjectThemes).length,5);
for(const [subject,theme] of Object.entries(subjectThemes)){
 assert.ok(contrast(theme.ink,theme.wash)>=4.5,`${subject}: badge text`);
 assert.ok(contrast(theme.ink,'#ffffff')>=4.5,`${subject}: white emblem text`);
 assert.ok(contrast(theme.ink,'#f7f9fc')>=3,`${subject}: accent boundary`);
 const html=renderToStaticMarkup(<SubjectBadge subject={subject}/>);
 assert.ok(html.includes(theme.label));
 assert.ok(html.includes('aria-hidden="true"'));
 assert.ok(html.includes(theme.ink)&&html.includes(theme.wash));
}
assert.equal(subjectTheme('unknown').label,'STEM');
assert.equal(subjectTheme('constructor').label,'STEM');
console.log('Five subject accents: text/boundary contrast, visible labels, decorative symbols and neutral fallback passed.');
