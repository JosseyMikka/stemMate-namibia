# Classroom and accessibility design

The pilot serves STEM learners in Grades 10–12, including shared-device,
small-screen and limited-bandwidth contexts. School grade and examination pathway
are separate choices. Reading support changes wording, not qualification content.

A teacher signs in once and manages several classes. Each class has a name, subject, grade,
course, examination year, membership and policy. A learner sees only joined classes.
Switching classes discards the previous on-screen lesson and drafts. Teachers can
preview lessons without contributing evaluation counts. Invitations expire after
seven days and can be rotated. Removing membership blocks further session actions.

Guided practice asks for an attempt before hints, a learner explanation before the
worked model, application to a different problem, and an independent check. “I am
stuck” is a valid attempt. Direct explanation supports learners who need immediate
instruction; independent checks withhold help until submission. Acknowledging an
attempt cannot demonstrate its quality. Teachers should use learner discussion and
delayed, unaided work to assess understanding.

## Accessibility target

WCAG 2.2 AA is the design target, not a certification. Text input remains available
without voice. Labels, keyboard operation, visible focus, a skip link, announced
errors, focus recovery, 44-pixel controls and narrow-screen reflow support access.
No microphone or speech begins automatically. Equations include MathML and local
KaTeX fonts. Read-aloud mathematics still needs visual checking and specialist
screen-reader testing. Independent checks read only the current question.

Browser testing has covered teacher and learner journeys and 320-pixel reflow.
Learner testing should include screen readers, keyboard-only use, zoom, reading
support, local accents, denied microphone permission and low-connectivity recovery.
In-progress drafts are deliberately memory-only and will be lost on refresh; the
interface warns learners about this. Offline lessons and interrupted-session
recovery are future work.

## Boundaries before school rollout

The current 14 starter topics across five subjects do not cover either complete curriculum. Science uses supplied data only and Computing traces pseudocode without execution. Advanced
Cambridge Mathematics routes contain selected pure-mathematics revision only. Advanced science and Computing courses offer selected introductory/prerequisite revision. Teachers must
review task accuracy and alignment. Optional generated material needs separate
provider and safety evaluation. Full syllabus mapping is not claimed.

Teacher registration requires a school-held invitation; it does not independently
verify teacher identity. School SSO, multi-school administration, co-teaching,
account deletion, consent/retention workflows and public recovery are future work.
Private account storage needs backups, access controls and approved retention.
Suppressed aggregate counts are voluntary process data, not anonymous research or
proof of learning. No deployment or paid service has been provisioned.

References: [WCAG 2.2](https://www.w3.org/TR/WCAG22/),
[WAI form labels](https://www.w3.org/WAI/tutorials/forms/labels/).
