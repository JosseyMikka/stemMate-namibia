import assert from 'node:assert/strict';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {CellDiagram,MoleculeDiagram} from './ScienceDiagrams';
import {emptyTrial,initialConditions,runModel,recordPrediction,observeTrial,recordObservation,recordExplanation} from './visualModels';
// Exact atom accounting for every permitted coefficient combination.
for(let h=1;h<=4;h++)for(let o=1;o<=4;o++)for(let w=1;w<=4;w++){
 const r=runModel('balance',{...initialConditions,hydrogen:h,oxygen:o,water:w});
 assert.deepEqual(r.values,[2*h,2*o,2*w,w]);
 assert.equal(r.summary==='Both element counts match.',h===w&&2*o===w);
}
assert.throws(()=>runModel('balance',{...initialConditions,hydrogen:0}));
// Conservation, reflection symmetry, blocked membrane and equilibrium.
for(const left of [0,6,12,18,24]){
 const r=runModel('diffusion',{...initialConditions,left});
 assert.equal(r.values[2]+r.values[3],24);
 assert.ok(r.values.every(n=>Number.isInteger(n)&&n>=0&&n<=24));
 const mirrored=runModel('diffusion',{...initialConditions,left:24-left});
 assert.equal(r.values[2],mirrored.values[3]);
 const closed=runModel('diffusion',{...initialConditions,left,permeable:false});
 assert.deepEqual(closed.values,[left,24-left,left,24-left]);
}
assert.deepEqual(runModel('diffusion',{...initialConditions,left:12}).values,[12,12,12,12]);
assert.throws(()=>runModel('diffusion',{...initialConditions,left:25}));
const rates=[5,20,35,50,65].map(temperature=>runModel('enzyme',{...initialConditions,temperature}).values[0]);
assert.ok(rates[0]<rates[1]&&rates[1]<rates[2]&&rates[2]>rates[3]&&rates[3]>rates[4]);
assert.ok(rates.every(n=>n>=0&&n<=100));
assert.throws(()=>runModel('enzyme',{...initialConditions,temperature:999}));
// A new result cannot appear until a nonempty prediction is recorded.
const initial=emptyTrial();
assert.throws(()=>observeTrial(initial,'diffusion'));
assert.throws(()=>recordPrediction(initial,'   ',initialConditions));
assert.throws(()=>recordObservation(initial,'I saw movement'));
assert.throws(()=>recordExplanation(initial,'It diffuses'));
const settings={...initialConditions};
const predicted=recordPrediction(initial,'More particles should move right because the left starts denser.',settings);
settings.left=0;
assert.equal(predicted.conditions?.left,18); // Conditions are a frozen snapshot, not a live input reference.
assert.equal(predicted.result,null);
assert.throws(()=>recordObservation(predicted,'I think it moved'));
const observed=observeTrial(predicted,'diffusion');
assert.deepEqual(observed.result?.values,[18,6,12,12]);
assert.throws(()=>observeTrial(observed,'diffusion'));
assert.throws(()=>recordObservation(observed,' '));
const explaining=recordObservation(observed,'The two sides each have 12 particles.');
assert.equal(explaining.phase,'explain');
assert.throws(()=>recordExplanation(explaining,' '));
const complete=recordExplanation(explaining,'Net movement follows the concentration gradient in equal volumes; the model is not a random trajectory.');
assert.equal(complete.phase,'complete');
assert.throws(()=>recordExplanation(complete,'Overwrite'));
assert.equal(initial.phase,'predict');
// Every visual has an accessible alternative and uses no external image resource.
for(const render of [()=>createElement(CellDiagram),()=>createElement(MoleculeDiagram)]){
 const html=renderToStaticMarkup(render());
 assert.match(html,/role="img"/);assert.match(html,/<title/);assert.match(html,/<desc/);assert.match(html,/<figcaption/);
 assert.doesNotMatch(html,/<img|<iframe|<script/);
}
console.log('Visual model conservation, symmetry, workflow gating, snapshot isolation and diagram alternatives passed.');
