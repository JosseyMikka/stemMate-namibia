# Teacher preparation

Teacher tools → select an owned teaching class → Prepare teaching materials.

Three modes share a short form: Plan a lesson; Adapt an activity; Create practice questions. Enter topic and a teacher-supplied curriculum objective. Adaptation additionally requires an existing activity; question generation requires lesson content. Optional time/materials fields support local constraints and accessibility needs without identifying learners. No assumption is made that all classrooms in a country have the same resources.

The AI receives only planning inputs and selected course/grade/year context after explicit permission, not class names, account aliases, join codes, learner records or project submissions. General AI provider retention rules still apply. No preparation inputs or outputs are stored in the STEMMate database or reports. The endpoint requires the current teacher owner before and after generation, uses existing per-account/shared AI budgets and no-store headers, and does not load the old curriculum index. Class pause affects learner practice, not teacher preparation.

Generated output has three bounded, nonempty fields: learner-facing draft; separate teacher guide/answers; assumptions/review notes. Each is editable. Formatted previews render maths through the existing safe Markdown/KaTeX renderer, with no model images/links/HTML and a display fallback. Teacher guides are never assigned or exposed through a learner route. These are structural/authorization safeguards: a model can still leak an answer into the learner-facing field or produce incorrect content, so teachers must inspect both sections.

Plans request prediction, explanation, application and an independent check. Bloom cognitive processes describe proposed actions, not a measured learning gain. Optional making/testing/revision supports constructionist activities without claiming every lesson is a complete project-based-learning cycle. Adaptations retain a common objective with additional support, standard and extension versions, avoiding learner ability labels. Practice generation requests five self-contained recall/explanation/application questions with a teacher answer guide and ambiguity notes. Low-cost/no-print alternatives and subject safeguards are included in all modes. Dangerous practical instructions and executable code are outside scope.

Teachers select/copy reviewed text for use outside this workflow. Nothing is automatically assigned, published or sent to learners. Editing output or changing planning inputs invalidates the local review checkbox. Input changes flag the current output as stale; successful replacement generation overwrites edits only after a visible warning. Failed requests retain the prior draft and inputs. The checkbox records the teacher's own acknowledgement, not automatic verification. Curriculum fit is based on supplied objectives; verified official alignment is not claimed.

Drafts remain in memory while navigating between Chat and Teacher tools in the same class. Changing class, refreshing or signing out clears them; tab recovery covers main chat only. Copy important work first. No scheduling, gradebook, parent messaging or persistent preparation library was added.

## Verification

Backend tests cover teacher ownership/learner rejection, all three modes, required fields, consent, non-echoing errors, failure/budget behavior, post-generation access checks, transient output, bounded model schema and minimal provider payload. Live preview checks and remaining limits are recorded in the pull request. Full curriculum/content review and physical-device/accessibility trials remain required before real classroom use.

### Live-preview findings

Live generation exercised Namibia Mathematics lesson/adaptation and Cambridge Biology questions. Early generated output leaked worked steps into learner materials and used inconsistent timing; a Biology answer guide also called outside-to-inside movement “outward”. Instructions were tightened and Biology regenerated with the inward direction corrected. Later output can still introduce unsuitable extensions, assumptions or imperfect scaffolds: prompt instructions are not a factual or semantic validator. No claim of complete content validation or verified answer separation is made.

Browser checks covered editable drafts, review reset on edit, stale-input notices, preservation across Chat/Teacher-tools navigation, clearing on class change, and failed requests retaining text. A controlled API stop reliably exercised connection failure; an attempted browser network override did not reliably simulate offline behavior and is not counted as evidence. Normal networking/API was restored. No real learner work was used.

Final UI checks confirmed 16px preparation textareas and no horizontal document overflow at the 390px viewport override (375px document width). This is Chrome responsive verification, not physical iPhone/VoiceOver certification. Learner sign-in exposed neither Teacher tools nor Prepare teaching materials. Teacher sign-out cleared the synthetic preparation; no projects, learner records or class policies were changed.

A final lesson sample still included a worked prediction hint and an already-modelled substitution activity labelled independent. The editor was used to replace the learner-facing sample with unanswered prompts and a fresh independent question; formatted mathematics rendered correctly and review remained unset after editing. This demonstrates the review workflow, not reliable automatic pedagogical validation. Teachers must check that independent tasks are genuinely new and unsupported, and review any Bloom labels rather than accepting them as measured thinking levels.
