# Quiz subject and curriculum verification — 18 October 2026

Live testing used the authenticated local preview API and real configured AI provider, with synthetic learner answers. Each subject/pathway completed three questions, three progressive hints on the first question, answer-plus-reasoning feedback and a recap of 3 attempted / 2 without hints / 1 with hints. The Cambridge Computing interface was also checked in Chrome: pseudocode displayed as a code block and an intentional answer of 14 received the correct sum of 15 with reasoning feedback.

| Subject | Namibia | Cambridge |
| --- | --- | --- |
| Physics | NSSCO 6118 completed | IGCSE Extended 0625 completed |
| Chemistry | NSSCO 6117 completed | IGCSE Extended 0620 completed |
| Biology | NSSCO 6116 completed; content issue found and safeguarded | IGCSE Extended 0610 completed |
| Computing | NSSCO Computer Studies 6134 completed | IGCSE Computer Science 0478 completed |

Scope: Grade 10, examination year 2027. These are representative topic checks (motion, conservation/balancing, osmosis, loop tracing), not all topics, grade levels or complete syllabus audits. A new automated regression checks subject, qualification, code, grade and year routing for every supported non-Mathematics course and grade, including NSSCAS and Cambridge AS/A Level. Those advanced courses were not exhaustively live-tested.

Changes resulting from testing:
- Require relative cell-sap/external water potentials in osmosis questions and distinguish protoplast shrinkage from a rigid cell wall.
- Reject the observed advanced osmotic-pressure/gas-formula mismatch for Grade 10 Biology. This targeted guard is not a general content verifier.
- Remove generated reference answers from feedback input so an erroneous generated reference cannot anchor marking; independently check learner reasoning and accept justified conditional answers.
- Clarify that smallest whole-number coefficients are a convention; fractions can conserve atoms and represent mole ratios.
- Require consistent motion segments and relevant stopping/braking assumptions; request readable, initialised pseudocode and properly delimited mathematics.
- Add error-category-only diagnostics; no learner text, prompts, tokens or provider error payloads are logged.

Findings and limits:
Earlier runs had intermittent generation/feedback failures. Sequential repeats completed, but the cause was not established and reliability under concurrent classroom load remains unverified. One Physics journey silently changed from moving to rest; the prompt now requires a consistent transition. Earlier Biology feedback wrongly assumed a 0.5 M sucrose solution must be hypertonic. The final independent-feedback retest accepted the explicitly conditional missing-data answer. Another Biology item introduced an advanced formula with an incorrect gas constant; feedback wrongly defended that supplied constant. The Grade 10 formula is now rejected and a fresh Biology quiz completed with three qualitative questions, appropriate water-potential comparisons and the expected 2-without/1-with-hints recap. A remaining unnecessary suggestion for describing the other cell was removed from feedback instructions. Final real-provider regression checks accepted conditional osmosis reasoning, a complete cell-comparison answer and fractional coefficient reasoning without inventing corrections. These examples demonstrate why AI feedback must remain formative and teacher-reviewable, with no official marks or mastery claim.

Validation: 48 backend tests and seven frontend suites passed locally. No frontend application code or dependencies changed. No real learner records were used and no credentials are included in this evidence. Nothing merged or deployed.
