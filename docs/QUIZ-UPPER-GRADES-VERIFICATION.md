# Grades 11–12 Quiz me verification

## Computer Science

Computer Science is included under the Computing subject selector. Configured routes are Namibia NSSCO Computer Studies (6134), NSSCAS Computer Science (8231), Cambridge IGCSE Computer Science (0478), and AS/A Level Computer Science (9618). The preview was checked at Grade 12 / Cambridge A Level, with NSSCAS and AS available as separate qualification choices. Pseudocode is traced, not executed.

## Test scope

For examination year 2027, 54 supported course/grade combinations (27 per grade) were exercised end to end with deterministic provider fixtures. Each verified authoritative routing, hidden future questions/reference answers, three progressive hints and the hint limit, answer/reasoning gates, all three answer/Next transitions, a completed recap (3 attempts, 1 supported / 2 without hints), ownership cleanup and absence of learner prose in the temporary store. These are API/state tests, not evidence that all generated questions are correct.

| Subject | Grade 11 route checks | Grade 12 route checks |
| --- | ---: | ---: |
| Mathematics | 8 | 8 |
| Physics | 5 | 5 |
| Chemistry | 5 | 5 |
| Biology | 5 | 5 |
| Computing / Computer Science | 4 | 4 |

A separate real-provider sample generates three questions for each of 30 representative cases: five subjects × two grades × three routes. Grade 11 uses NSSCO, IGCSE Extended (standard for Computing), and AS. Grade 12 uses NSSCAS, IGCSE Extended (standard for Computing), and A Level. Mathematics uses the AS Pure route and A Level Pure/Statistics route. Other Mathematics variants, IGCSE Core, Grade 11 A Level and Grade 12 AS have workflow coverage, not separate live content evaluations. This is representative topic coverage, not every syllabus topic or a complete qualification audit.

One independently written answer/reasoning probe per live case checks feedback. This is separate from the all-route full-workflow tests; all 90 generated questions do not receive real-AI marking. Topics cover quadratics/calculus, forces, atom conservation/stoichiometry, enzymes/experimental evidence, and tracing/binary-search invariants. Deliberate errors and justified conditional answers are included. No learner records, credentials or personal data were used in the sample.

## Findings and changes

- Provider rate limits caused real generation failures; the harness paced retries and respected retry delays. The app now distinguishes a provider limit with a friendly 429 response and Retry-After, retaining the draft and current question. The normal application rate limit is unchanged.
- Some generated responses had invalid shape (including more than three hints). Validation rejected them; retry produced valid responses. Shape constraints were retained.
- Ordinary-level Biology included advanced Michaelis–Menten/Vmax claims not justified by the data. The introductory scope guard now covers NSSCO/IGCSE at Grades 11–12 as well as Grade 10 and rejects these observed patterns. This is a targeted guard, not a comprehensive factual verifier.
- Later Chemistry and Computing questions depended on previous questions, which are hidden. Questions must now repeat all required information; explicit previous-question and numbered-question references are rejected.
- Computing instructions now require indexing/midpoint conventions and accept a consistently stated convention when the question omits it.
- Biology instructions distinguish the highest measured activity from an exact optimum and plausible mechanisms from proven causes. Feedback must acknowledge when data cannot determine an inhibition mechanism or Vmax.

## Verification and limits

51 backend tests, seven frontend suites, build/type checking and lint passed locally. Tests include all 54 route/grade workflows and recovery from provider limits without advancing or losing the stage. Live content/feedback results are recorded separately in the accompanying evidence.

The safeguards improve handling of observed failures; they do not establish complete curricular alignment, learning gains, scientific correctness of every future question or reliability under simultaneous classroom load. Teacher review remains necessary for assessed use. No merge or deployment has been performed.

## Completed live sample results

All 30 representative plans generated successfully after paced retries, giving 90 current questions. Five plans were rejected during content review and replaced: AS Chemistry, NSSCO Biology, AS Computing, Grade 12 IGCSE Biology and A Level Chemistry. All 30 final plans pass the updated content guards. All 30 independently written feedback probes returned successfully and were reviewed, including correct algebra/calculus/stoichiometry, a deliberately incorrect perpendicular-force calculation, a deliberately incorrect loop sum, conditional friction assumptions, experimental uncertainty, binary-search traces/invariants and insufficient data to infer an inhibition mechanism. The AS Biology probe deliberately used question 3; other initial probes used question 1. The A Level Chemistry first probe was on its earlier standalone first question; a further probe verified the replacement plan’s limiting-reactant calculation and correct result of 11 g CO₂.

The examples support formative pilot testing, not an assertion that the AI always gives correct feedback. Some later generated questions still need careful assumptions (for example external forces, optimum conditions or algorithm conventions); prompt changes and targeted pattern guards do not replace subject-teacher review. Provider quota and malformed-generation failures were encountered and recovered; simultaneous classroom-load reliability was not established.
