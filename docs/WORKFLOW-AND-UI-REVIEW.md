> UPDATE: the no-class preparation recommendation below is now implemented. Teachers choose context directly; an optional class prefills it only. Classes/projects are grouped in a separate optional disclosure. Historical findings below describe the review before that follow-up; current verification is in TEACHER-PREPARATION.md.

# STEMMate workflow and UI review — 18 October 2026

## Product decision

STEMMate is a chat-first STEM thinking companion with a secondary teacher preparation and connected-class workspace. Classes should be optional for using AI assistance, and necessary only for membership-scoped projects, sharing, feedback and class controls. This is a product recommendation, not a claim that every current tool already follows it.

## Current behavior verified in code and preview

| Workflow | Current behavior | Finding |
| --- | --- | --- |
| Learner independent Chat | Alias/password, selected course/grade/year, no class/code | Appropriate low-detail route; no guest/offline mode |
| Teacher independent Chat | Same independent Chat, no selected class required | Verified in the browser by clearing class selection and opening Chat |
| Teacher preparation | Teacher account plus selected owned class; no enrolments needed | Unnecessary setup for a teacher seeking only a draft |
| Connected classroom | Teacher creates class; learners self-join through code | Do not ask teachers to upload personal student lists |
| Projects/feedback | Scoped to membership and explicitly shared snapshots | Appropriate reason for classes; unshared work remains private |
| Sign-in | Teacher role needs an operator invitation | Access safeguard, not professional verification; onboarding needs a clear operator process |
| Monetization | No checkout, billing or subscription enforcement found | Business model is a proposal only |

Review was against the current PR 2 code, existing test evidence and a focused live navigation check; it was not a fresh exhaustive all-device/content audit.

## Strengths to retain

- Chat as the first/main view, with secondary teacher tools/classes.
- Everyday-language questions, optional help asking, editable uncertainty and one next reasoning step.
- Progressive hints and accessible direct explanations, with support hidden during independent practice within an activity.
- Subject labels and symbols alongside colour; responsive controls and 16px preparation textareas; safe maths renderer and diagram text alternatives.
- Explicit processing/sharing choices, minimal account identity, optional tab recovery and transparent limitations.
- Human teacher feedback and editable preparation rather than automatic grade/Bloom/mastery claims.

## Priorities

1. **Remove class setup from teacher preparation in a future implementation.** Let an invited teacher select subject, grade and qualification directly; optionally use an existing class to prefill those choices. Retain server role checks, validated curriculum context, processing permission, budgets, temporary storage and output review. Do not create hidden/dummy classes or fake learner records. This is NOT implemented by this documentation change.
2. **Separate planning from class administration visually.** Suggested teacher navigation: Chat; Prepare; My classes. Keep the three preparation actions together, with advanced controls disclosed. This navigation is proposed, not shipped.
3. **Keep content review explicit.** Live generated drafts have contained answer leakage, incorrect labels/timing and weak independent checks. A review checkbox is not a semantic validator. Teacher-guided classroom use needs content review, not merely passing CI. Teacher preparation is not a completely general teacher assistant or automatic assessment service.
4. **Reduce long privacy copy without hiding essential choices.** Keep concise notices next to the action and details for full explanations. Current consent text remains explicit; a future simplification must preserve provider/shared-device information and not preselect processing permission.
5. **Close real-device/accessibility evidence gaps.** Physical iPhone keyboard/reflow/orientation, VoiceOver/other screen-reader use, focus and authentication testing with intended learners/teachers remain. No WCAG conformance certification follows from automated checks or screenshots.
6. **Protect against expansion into an LMS.** Do not add attendance, timetables, gradebooks, parent messaging or compulsory class enrolment to justify subscription pricing. Improve usefulness and reliability first.

## What “good” means for release

Technical evidence on the current feature branch: 70 backend tests, ten frontend suites, build/typecheck/lint and GitHub checks pass. Prior browser tests covered full reasoning stages, drafts, teacher preparation and responsive behavior. This supports controlled testing, not an unconditional claim that everything is ready for school-wide use.

Before real learner rollout: school/provider/privacy approval, outstanding historical-copy remediation assessment, content/curriculum review, production HTTPS/private storage/backup/restore, account administration and representative capacity/device tests. Review docs/RELEASE-AND-PRIVACY.md and docs/TEACHER-PREPARATION.md (relative to repository root).

## Reference principles

- [WCAG 2.2 Quick Reference](https://www.w3.org/WAI/WCAG22/quickref/): keyboard access, reflow, text alternatives, labels, visible/unobscured focus, accessible authentication and status messages. This informs review; it is not certification.
- [UNESCO: Guidance for generative AI in education and research](https://www.unesco.org/en/articles/guidance-generative-ai-education-and-research): human-centred educational use. STEMMate's workflow should preserve learner and teacher agency; this source is not evidence of STEMMate's efficacy.
- [Mindjoy platform overview](https://www.mindjoy.com/platform): an example of educator-focused AI workflows. STEMMate is not claiming parity, affiliation, pricing equivalence or copied product behavior.
