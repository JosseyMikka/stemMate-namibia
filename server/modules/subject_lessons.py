"""Original paper/data-only STEM activities. No experiments or code are executed."""
SUBJECT_TOPICS = {
 'physics': [('motion','Motion and evidence'),('forces','Resultant forces and acceleration')],
 'chemistry': [('atoms','Atoms and conservation'),('moles','Amount of substance and ratios')],
 'biology': [('osmosis','Osmosis and evidence'),('enzymes','Enzymes and controlled comparisons')],
 'computing': [('trace','Tracing and debugging'),('search','Binary search and invariants')],
}
SAFETY_NOTICES = {
 'mathematics':'Explain assumptions and check units and results. Ask your teacher when uncertain.',
 'physics':'Use the supplied paper data only. Do not build electrical, heating, pressure or radiation experiments. Practical work needs a teacher-approved laboratory and supervision.',
 'chemistry':'Paper calculations only: do not mix, heat, taste or smell substances. Practical work needs a teacher-approved laboratory, risk assessment and supervision.',
 'biology':'Use fictional data only. Do not collect personal health information, culture microorganisms or handle biological samples. This tutor does not provide medical advice.',
 'computing':'Trace pseudocode on paper. STEMMate does not run code. Use fictional data; never share passwords, access other people’s systems or run unfamiliar commands.',
}
LESSONS = {
 'motion': dict(
 challenge='A fictional trolley travels 12 m in 3 s, then 12 m in 6 s. Predict which interval has greater average speed. Explain what evidence supports your prediction.',
 hints=['Compare distance travelled per unit time.', 'Use average speed = distance divided by elapsed time for each interval.', 'The distances match, so consider how the different times affect the ratios.'],
 explanation='The average speeds are $12/3=4$ m/s and $12/6=2$ m/s. The first interval has greater average speed. These averages do not show whether speed was constant within an interval.',
 application='Fictional journey data: 30 m in 5 s followed by 10 m in 5 s. Find the average speed over the whole journey. Explain why adding the two speeds is wrong.',
 application_explanation='Total distance is 40 m and total time 10 s, so the whole-journey average is 4 m/s. Speeds are ratios, not distances to add. Here equal times also permit averaging the two interval speeds.',
 independent='A fictional cart travels 18 m in 3 s and then 12 m in 6 s. Without hints, find the average speed over the whole journey and state what cannot be inferred.',
 independent_explanation='Average speed is $(18+12)/(3+6)=30/9$, approximately 3.33 m/s. The data do not establish instantaneous speeds or constant speed.'),
 'forces': dict(
 challenge='A model cart of mass 2 kg experiences horizontal forces of 10 N right and 4 N left. Ignore friction. Predict the direction of acceleration, then calculate it with a reason.',
 hints=['Forces have directions, so find the resultant first.', 'Apply Newton’s second law to the resultant force, not one force alone.', 'Use $a=F_{net}/m$ after subtracting opposing forces.'],
 explanation='Taking right as positive, resultant force is $10-4=6$ N. From $F_{net}=ma$, acceleration is $6/2=3$ m/s² right. This specifies acceleration, not the existing direction of motion.',
 application='A 3 kg model cart moves left but has a 6 N resultant force right. Explain its acceleration and whether its speed initially rises or falls.',
 application_explanation='Acceleration is $6/3=2$ m/s² right. While velocity remains left, acceleration opposes velocity, so speed initially falls. Motion and acceleration need not point the same way.',
 independent='A 4 kg model cart moving right has forces 3 N right and 11 N left. Ignore other horizontal forces. Calculate acceleration and explain the initial speed change.',
 independent_explanation='Resultant force is 8 N left, so acceleration is 2 m/s² left. It initially slows while moving right; continued acceleration could later reverse its motion.'),
 'atoms': dict(
 challenge='For the paper equation $H_2+O_2\\rightarrow H_2O$, predict why it is unbalanced. Count each type of atom before changing anything.',
 hints=['Atoms of each element must be conserved.', 'Change coefficients in front of formulae; changing subscripts would change substances.', 'Compare the oxygen counts first, then recount hydrogen.'],
 explanation='The balanced equation is $2H_2+O_2\\rightarrow2H_2O$. Both sides contain four hydrogen atoms and two oxygen atoms. Coefficients change amounts; subscripts define composition. This is a paper exercise, not instructions to carry out a reaction.',
 application='Balance the paper equation $N_2+H_2\\rightarrow NH_3$ and explain why changing the formula of ammonia would be invalid.',
 application_explanation='$N_2+3H_2\\rightarrow2NH_3$ conserves two nitrogen and six hydrogen atoms. Altering $NH_3$ would describe a different substance.',
 independent='Without help, balance the paper equation $Mg+O_2\\rightarrow MgO$. Verify each atom count; do not attempt this reaction.',
 independent_explanation='$2Mg+O_2\\rightarrow2MgO$ gives two magnesium and two oxygen atoms on each side.'),
 'moles': dict(
 challenge='For a paper calculation, 4.0 g of helium has molar mass 4.0 g/mol. Predict its amount in moles and explain why mass and amount are different quantities.',
 hints=['Use the relationship between mass, molar mass and amount.', 'Divide mass by molar mass and check how the units cancel.', 'Use $n=m/M$; one mole of different substances need not have the same mass.'],
 explanation='$n=m/M=4.0/4.0=1.0$ mol. Mass measures grams here; amount counts entities in units of moles. Equal amounts of different substances may have different masses.',
 application='The paper equation is $N_2+3H_2\\rightarrow2NH_3$. If 0.50 mol nitrogen reacts completely with excess hydrogen, find the amount of ammonia and justify the ratio.',
 application_explanation='The equation relates amounts, not masses: 1 mol nitrogen produces 2 mol ammonia. Thus 0.50 mol nitrogen yields 1.0 mol ammonia, assuming complete reaction with excess hydrogen.',
 independent='For $2H_2+O_2\\rightarrow2H_2O$, 0.30 mol oxygen reacts completely with excess hydrogen. Find the amount of water and explain the assumption. Paper calculation only.',
 independent_explanation='The oxygen:water amount ratio is 1:2, so 0.60 mol water is produced. Oxygen is limiting and conversion is assumed complete; this is not a practical procedure.'),
 'osmosis': dict(
 challenge='Fictional plant tissue data show mass rising from 5.0 g to 5.5 g in dilute solution. Predict the net direction of water movement and explain why mass change alone is incomplete evidence.',
 hints=['Osmosis concerns net water movement across partially permeable membranes.', 'Consider movement from higher to lower water potential.', 'A mass gain can support net water entry, but ask which other factors could change measured mass.'],
 explanation='The result is consistent with water entering cells by osmosis from higher to lower water potential. It is not proof alone: surface liquid, timing and tissue variation can affect mass measurements. Use supplied data only.',
 application='Fictional samples change from 4.0 g to 4.4 g and from 8.0 g to 8.4 g. Compare percentage mass changes and explain why raw gain is misleading.',
 application_explanation='The gains are 10% and 5% respectively. Equal 0.4 g gains differ relative to starting mass. Compare matched tissue, conditions and repeats before drawing a strong conclusion.',
 independent='A fictional sample changes from 6.0 g to 5.4 g in concentrated solution. Calculate percentage change, infer net water direction and identify one limitation.',
 independent_explanation='Percentage change is $(5.4-6.0)/6.0\\times100=-10\\%$. This is consistent with net water loss to lower water potential outside. Surface liquid or unmatched samples are possible limitations; the result alone is not proof.'),
 'enzymes': dict(
 challenge='Fictional enzyme rates at 20, 30, 40 and 60 °C are 2, 4, 7 and 1 arbitrary units. Predict an explanation for the rise and fall. Can these four observations establish the exact optimum?',
 hints=['Consider collisions at moderate temperatures and enzyme structure at high temperatures.', 'An enzyme’s active-site shape affects substrate binding.', 'Separate the highest measured rate from an exact optimum between the sampled temperatures.'],
 explanation='Warming can increase successful collisions; high temperatures can denature enzyme structure and alter active sites. 40 °C has the highest measured rate, but sparse observations cannot establish the exact optimum or prove the mechanism.',
 application='Two fictional enzyme datasets use different substrate concentrations as well as different temperatures. Explain why attributing their rate difference only to temperature is weak and suggest a fairer comparison on paper.',
 application_explanation='Temperature and substrate concentration both affect rate, so the cause is confounded. Compare temperatures at the same enzyme/substrate concentrations, pH and measurement duration, with repeats. This is a study-design exercise, not a laboratory protocol.',
 independent='Fictional rates at 35, 40 and 45 °C are 6, 8 and 7 units. State a supported conclusion, an unsupported claim and one way further supplied data could improve confidence.',
 independent_explanation='40 °C has the highest measured rate among these temperatures. Claiming the exact optimum is 40 °C is unsupported. More closely spaced temperatures and repeated measurements under matched conditions would improve confidence.'),
 'trace': dict(
 challenge='Trace this pseudocode without running it:\n```text\ntotal <- 0\nFOR i <- 1 TO 3 INCLUSIVE\n  total <- total + i\nOUTPUT total\n```\nPredict the output and write the value of total after each iteration.',
 hints=['Make a trace table with columns i and total.', 'Each iteration uses the previous total.', 'Include both endpoints of this explicitly inclusive loop.'],
 explanation='The values of total are 1, 3 and 6, so output is 6. If a translation uses an exclusive upper bound, it needs a different endpoint. Trace behaviour before changing code.',
 application='A learner translates the loop as Python `for i in range(1, 3):`. Predict the output with the same starting total and explain a minimal correction, without executing code.',
 application_explanation='Python range excludes its upper endpoint, so the loop adds 1 and 2 and outputs 3. `range(1, 4)` includes the intended values 1, 2, 3. Re-trace all iterations to check the correction.',
 independent='Trace total starting at 0 with i taking 2, 3 and 4 inclusively, adding i each time. Give intermediate totals, final output and a boundary test. Do not run code.',
 independent_explanation='Intermediate totals are 2, 5 and 9, with output 9. A one-iteration case, with start equal to end, checks that an inclusive boundary executes exactly once.'),
 'search': dict(
 challenge='Binary search examines sorted list [2, 5, 8, 12, 17, 21, 30] for 17. Use zero-based inclusive bounds, floor midpoint. Predict the inspected values and justify every discarded interval.',
 hints=['The midpoint splits a sorted search interval.', 'Compare the target with the midpoint value before updating a bound.', 'The invariant is that any matching element remains within the current inclusive bounds.'],
 explanation='Bounds 0..6 give midpoint 3, value 12: keep 4..6. Midpoint 5 is 21: keep 4..4. Midpoint 4 is 17: found. Sorting justifies each discard; bounds must exclude an already rejected midpoint.',
 application='For sorted [3, 7, 9, 15, 22], trace a search for absent value 8 using the same convention. Explain the termination condition.',
 application_explanation='Midpoint 2 is 9: high becomes 1. Midpoint 0 is 3: low becomes 1. Midpoint 1 is 7: low becomes 2. Now low > high, so the interval is empty and 8 is absent.',
 independent='Trace a search for 4 in sorted [1, 4, 6, 10, 13] with the same bounds convention. Explain why setting low = midpoint after rejection can fail for some lists.',
 independent_explanation='Inspect 6 at index 2, then 1 at index 0, then 4 at index 1. After rejecting a midpoint below the target, low must become midpoint + 1. Keeping the rejected midpoint can leave the interval unchanged and prevent termination.')
}
