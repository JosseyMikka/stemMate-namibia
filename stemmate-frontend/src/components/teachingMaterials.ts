import type {VisualActivity} from './visualLinks';
export const teachingVisuals:{id:VisualActivity;subject:string;label:string}[]=[
 {id:'cell',subject:'biology',label:'Animal-cell diagram'},
 {id:'membrane',subject:'biology',label:'Cell-membrane diagram'},
 {id:'diffusion',subject:'biology',label:'Solute-diffusion model'},
 {id:'experiment',subject:'biology',label:'Enzyme experiment diagram'},
 {id:'enzyme',subject:'biology',label:'Enzyme temperature model'},
 {id:'molecules',subject:'chemistry',label:'Water, carbon dioxide and methane diagrams'},
 {id:'balance',subject:'chemistry',label:'Hydrogen and oxygen atom-balance model'},
];
export function appendConfirmedMaterial(existing:string,transcription:string,confirmed:boolean){
 if(!confirmed||!transcription.trim()||/\[unclear\]/i.test(transcription))throw new Error('Check the transcription and replace every [unclear] symbol before using it.');
 const combined=[existing.trim(),transcription.trim()].filter(Boolean).join('\n\n');
 if(combined.length>6000)throw new Error('These notes exceed 6,000 characters together. Shorten the notes or transcription first; your existing notes have not changed.');
 return combined;
}
