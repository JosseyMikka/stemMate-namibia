export type VisualActivity='molecules'|'cell'|'membrane'|'experiment'|'balance'|'diffusion'|'enzyme';
export type VisualSelection={activity:VisualActivity;request?:number;molecule?:'water'|'carbon'|'methane';part?:'membrane'|'nucleus'|'mitochondrion'|'cytoplasm'};
export type VisualSuggestion={selection:VisualSelection;label:string};
// Local, bounded matching to authored illustrations. Never accept model URLs/HTML.
export function visualSuggestion(question:string,explanation:string,subject:string):VisualSuggestion|null{
 if(/\bplant cells?\b|\bcell wall\b/i.test(question)&&!/membrane|osmosis/i.test(question))return null;
 return matchVisual(question,subject)??matchVisual(explanation,subject);
}
function matchVisual(input:string,subject:string):VisualSuggestion|null{
 const text=input.slice(0,16000).toLowerCase().replace(/₂/g,'2').replace(/₄/g,'4');
 if(/\b(enzyme|enzymes)\b/.test(text)&&/\b(experiment|assay|temperature|trial|controlled|activity)\b/.test(text))return {selection:{activity:'experiment'},label:'Explore this visually · enzyme experiment'};
 if(/\b(cell|plasma) membrane\b|phospholipid|selectively permeable|partially permeable|\bosmosis\b/.test(text))return {selection:{activity:'membrane'},label:'Explore this visually · cell membrane'};
 if(/\b(mitochondri\w*|nucleus|cytoplasm|animal cell)\b/.test(text)||(subject==='biology'&&/\bcells?\b/.test(text)))return {selection:{activity:'cell',part:/mitochondri/.test(text)?'mitochondrion':/nucleus/.test(text)?'nucleus':/cytoplasm/.test(text)?'cytoplasm':'membrane'},label:'Explore this visually · cell structures'};
 if(/\b(balance|balancing|conservation of atoms)\b/.test(text)&&/\b(atoms?|equations?|reaction)\b/.test(text))return {selection:{activity:'balance'},label:'Explore this visually · atom balance example'};
 const molecule=/\bmethane\b|\bch4\b/.test(text)?'methane':/carbon dioxide|\bco2\b/.test(text)?'carbon':/\bwater molecule|\bh2o\b/.test(text)?'water':undefined;
 if(molecule)return {selection:{activity:'molecules',molecule},label:'Explore this visually · molecule structure'};
 if(subject==='chemistry'&&/\bmolecules?|covalent bonds?\b/.test(text))return {selection:{activity:'molecules'},label:'Explore this visually · simple molecule examples'};
 return null;
}
