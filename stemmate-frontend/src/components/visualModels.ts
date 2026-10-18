/** Original, bounded concept models. Values are illustrative, not experimental data. */
export type ModelId='balance'|'diffusion'|'enzyme';
export interface Conditions {hydrogen:number;oxygen:number;water:number;left:number;permeable:boolean;temperature:number}
export const initialConditions:Conditions={hydrogen:1,oxygen:1,water:1,left:18,permeable:true,temperature:20};
export interface Result {summary:string;values:number[];labels:string[];explanation:string}
export function runModel(id:ModelId,c:Conditions):Result{
 if(id==='balance'){
  if(![c.hydrogen,c.oxygen,c.water].every(v=>Number.isInteger(v)&&v>=1&&v<=4))throw new Error('Use coefficients from 1 to 4.');
  const hBefore=2*c.hydrogen,oBefore=2*c.oxygen,hAfter=2*c.water,oAfter=c.water;
  const balanced=hBefore===hAfter&&oBefore===oAfter;
  return {summary:balanced?'Both element counts match.':'The element counts do not both match.',values:[hBefore,oBefore,hAfter,oAfter],labels:['Hydrogen before','Oxygen before','Hydrogen after','Oxygen after'],explanation:'A balanced equation conserves the number of each kind of atom. Change whole-molecule coefficients, not the subscripts inside a molecule. One matching ratio is 2 H₂ + 1 O₂ → 2 H₂O. This is bookkeeping only: it does not model energy, reaction conditions or how atoms rearrange.'};
 }
 if(id==='diffusion'){
  if(![0,6,12,18,24].includes(c.left))throw new Error('Choose an allowed initial particle count.');
  let left=c.left;for(let step=0;step<4;step++)if(c.permeable){const difference=24-2*left;left+=Math.sign(difference)*Math.round(Math.abs(difference)/4);}
  return {summary:`After four model steps: ${left} particles left and ${24-left} right. Total: 24.`,values:[c.left,24-c.left,left,24-left],labels:['Left before','Right before','Left after','Right after'],explanation:'In this equal-volume, closed model, a permeable membrane allows net redistribution down the concentration gradient. A closed membrane prevents crossing. Equal concentrations mean no net change, not that real particles stop moving. Each model step transfers a rounded quarter of the count difference; it is not a measured rate, elapsed time, random particle trajectory or osmosis model.'};
 }
 const activity:Record<number,number>={5:12,20:45,35:100,50:30,65:3};
 if(!(c.temperature in activity))throw new Error('Choose an allowed model temperature.');
 return {summary:`At ${c.temperature} °C, this fictional enzyme has relative activity ${activity[c.temperature]} out of 100.`,values:[activity[c.temperature]],labels:['Illustrative relative activity'],explanation:'This fictional enzyme increases in activity up to an assumed optimum of 35 °C, then loses activity as its structure is disrupted. Real enzymes have different optima and depend on pH, substrate and other conditions. Each trial starts with a fresh sample; time and irreversible damage are not modelled. These chosen values illustrate a pattern, not experimental measurements, a universal enzyme curve or medical advice.'};
}
export type Phase='predict'|'observe'|'explain'|'complete';
export interface Trial {phase:Phase;prediction:string;observation:string;explanation:string;conditions:Conditions|null;result:Result|null}
export const emptyTrial=():Trial=>({phase:'predict',prediction:'',observation:'',explanation:'',conditions:null,result:null});
export function recordPrediction(trial:Trial,prediction:string,conditions:Conditions):Trial{
 if(trial.phase!=='predict'||!prediction.trim())throw new Error('Record your prediction and reason first.');
 return {...trial,prediction,conditions:{...conditions},phase:'observe'};
}
export function observeTrial(trial:Trial,id:ModelId):Trial{
 if(trial.phase!=='observe'||!trial.conditions||trial.result)throw new Error('Record a new prediction before running the model.');
 return {...trial,result:runModel(id,trial.conditions)};
}
export function recordObservation(trial:Trial,observation:string):Trial{
 if(trial.phase!=='observe'||!trial.result||!observation.trim())throw new Error('Run the model and record what you observed first.');
 return {...trial,observation,phase:'explain'};
}
export function recordExplanation(trial:Trial,explanation:string):Trial{
 if(trial.phase!=='explain'||!explanation.trim())throw new Error('Explain the evidence in your own words first.');
 return {...trial,explanation,phase:'complete'};
}
