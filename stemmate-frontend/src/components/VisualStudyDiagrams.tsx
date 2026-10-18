import {useId} from 'react';
export function MembraneDiagram(){
 const id=useId();
 return <figure className="science-figure"><svg viewBox="0 0 600 330" role="img" aria-labelledby={`${id}-title ${id}-desc`}><title id={`${id}-title`}>Cell membrane: phospholipid bilayer and a channel protein</title><desc id={`${id}-desc`}>Two rows of water-attracting phospholipid heads face the fluid outside the cell and the cytoplasm. Water-avoiding tails face inward. A channel protein spans both layers. This simplified cross-section omits other membrane components.</desc>
 <text x="300" y="25" textAnchor="middle">Fluid outside the cell</text><text x="300" y="290" textAnchor="middle">Cytoplasm · fluid inside the cell</text>
 {Array.from({length:12},(_,i)=>185+i*32).filter(x=>x<345||x>409).map(x=><g key={x}>{[105,225].map((y,j)=><g key={y}><line x1={x-5} y1={y} x2={x-8} y2={y+(j?-48:48)} stroke="#705338" strokeWidth="4"/><line x1={x+5} y1={y} x2={x+9} y2={y+(j?-48:48)} stroke="#705338" strokeWidth="4"/><circle cx={x} cy={y} r="13" fill="#d8eaf7" stroke="#245477" strokeWidth="2"/></g>)}</g>)}
 <rect x="345" y="85" width="65" height="160" rx="19" fill="#ece0f4" stroke="#66467c" strokeWidth="3"/><rect x="369" y="85" width="16" height="160" fill="#f7fafc"/>
 <path d="M120 76 H170 L185 92 M132 180 H172 L202 154 M405 58 H380 L399 86" fill="none" stroke="#243e58" strokeWidth="2"/>
 <text x="40" y="48" fontSize="14">Hydrophilic heads</text><text x="40" y="68" fontSize="13">face the watery fluid</text><text x="22" y="177" fontSize="14">Hydrophobic tails</text><text x="22" y="197" fontSize="13">face inward</text><text x="385" y="48" fontSize="14">Channel protein</text><text x="385" y="68" fontSize="13">spans the membrane</text>
 </svg><figcaption>Labelled cross-section: a phospholipid bilayer with one channel protein. Heads face water; tails face inward. Channels allow particular substances to cross. This schematic omits cholesterol, carbohydrates and other proteins; it does not imply every substance can pass.</figcaption><p>Before exploring movement, explain how the membrane’s structure could affect what crosses it.</p></figure>;
}
export function ExperimentDiagram(){
 const id=useId();
 return <figure className="science-figure"><svg viewBox="0 0 600 310" role="img" aria-labelledby={`${id}-title ${id}-desc`}><title id={`${id}-title`}>Enzyme experiment: variables and measurement plan</title><desc id={`${id}-desc`}>A sample tube sits in a temperature-controlled water bath with a temperature probe. Temperature is varied between model trials. Enzyme amount, pH and excess substrate are held constant. Product formed per unit time is measured to compare enzyme activity. This is a conceptual plan, not a practical procedure.</desc>
 <path d="M80 100 V245 H340 V100" fill="#e3f2fa" stroke="#315978" strokeWidth="3"/><path d="M90 165 H330" stroke="#4785a5" strokeWidth="2"/>
 <path d="M174 90 V209 Q200 239 226 209 V90" fill="#fff" stroke="#384f66" strokeWidth="3"/><path d="M180 181 V207 Q200 229 220 207 V181" fill="#cde6da" stroke="#39735b"/>
 <line x1="296" y1="95" x2="296" y2="210" stroke="#5b436d" strokeWidth="8"/><circle cx="296" cy="215" r="9" fill="#5b436d"/>
 <path d="M95 54 H150 L180 90 M420 85 H352 L298 125 M409 181 H346 L223 195" fill="none" stroke="#243e58" strokeWidth="2"/>
 <text x="40" y="44" fontSize="15">Sample tube</text><text x="350" y="75" fontSize="15">Temperature probe</text><text x="365" y="171" fontSize="15">Enzyme + substrate</text><text x="88" y="275" fontSize="15">Temperature-controlled bath</text>
 </svg><figcaption>Conceptual enzyme-study diagram. Change temperature between trials; keep enzyme amount, pH and excess substrate constant. Compare product formed per unit time. The model uses chosen illustrative values, not laboratory measurements.</figcaption><p>What is changed, what is measured, and what should stay the same? Real practical work needs a teacher-approved plan and qualified supervision. This diagram gives no practical instructions.</p></figure>;
}
