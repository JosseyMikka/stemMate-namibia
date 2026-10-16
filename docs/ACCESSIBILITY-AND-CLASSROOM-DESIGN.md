# Accessible classroom design

## Scope and population

Recommendation for the first pilot: Grades 10–12 in Namibia, teacher-led, beginning
with one subject and a reviewed set of topics. Do not claim that primary-level
language makes this version suitable for younger children. The current reading
support selector is an explanation preference, not verified curriculum coverage or
an age check. Keep simple explanations available at every grade.

Plan for learners using a phone or shared device, intermittent or costly data,
English as an additional language, screen readers, keyboard navigation, motor
access needs and varied prior STEM knowledge. These are design considerations to
validate with participating learners, not assumptions that every learner shares
the same needs. Consult teachers and learners with disabilities during the pilot.

## Accessibility target

Use WCAG 2.2 AA as a design and evaluation target, not a certification claim.

- Semantic headings, a skip link and labelled controls; visible required markers.
- Complete keyboard operation, visible focus and focus moved to new stages or errors.
- Teacher controls expand in the page flow so they do not obscure focused content.
- Touch controls designed for at least 44px height, exceeding the AA minimum target.
- Text contrast, stronger field boundaries, non-colour progress cues, reflow at
  320 CSS pixels, 200% text zoom, reduced motion and forced-colour support.
- Mathematical HTML plus MathML; local horizontal scrolling for long equations.
- Optional dictation and local spoken prompts, with text always available. No
  auto-listening, auto-submission, mandatory speech or microphone-only tasks.
- Simple, consistent language and one learning stage at a time. No countdowns,
  speed scores or penalties for taking more time or saying “I am stuck.”
- Permit password managers and paste in future sign-in. Avoid memory puzzles or
  transcription tests as the only way to authenticate. Keep help consistently placed.

Automated and visual checks do not establish full conformance. Manual testing
still needs keyboard-only use, screen reader announcements/reading order, zoom,
mobile reflow, voice permission denial and mathematical content with actual users.

Sources: [WCAG 2.2](https://www.w3.org/TR/WCAG22/),
[WAI form labels](https://www.w3.org/WAI/tutorials/forms/labels/),
[WCAG 2.2 new criteria](https://www.w3.org/WAI/standards-guidelines/wcag/new-in-22/).

## Accounts and classes: proposed production model

Separate teacher and learner roles with separate dashboards. A teacher uses ONE
account for all assigned classes. Teaching several grades never requires several
accounts. A grade is a property of a class enrolment, not a permanent property of
the person. Curriculum level and reading support are separate attributes.

Example teacher dashboard:

| Class | Curriculum | Teacher settings |
| --- | --- | --- |
| Grade 10 Mathematics A, 2026 | NSSCO, reviewed topic set | Hints, assignments, practice windows |
| Grade 11 Mathematics B, 2026 | NSSCO, reviewed topic set | Separate settings and learners |
| Grade 12 Mathematics, 2026 | NSSCAS, reviewed topic set | Separate settings and learners |

Store subject, grade, curriculum/syllabus version, academic year and class section.
Do not route Grade 12 work to the Grade 10–11 syllabus just because both are senior
secondary. Sources: [NIED NSSCAS](https://www.nied.edu.na/documents/syllabuses/seniorsecondary/NSSCAS/)
and [NIED senior secondary documents](https://www.nied.edu.na/documents/syllabuses/seniorsecondary/Others/).

Proposed entities:

- User: identity, display alias and account status. Collect minimal identifiers;
  consider school-issued learner IDs instead of requiring personal email addresses.
- School membership: user, school and verified role. A public sign-up must never
  let someone grant themselves teacher or administrator permissions.
- Class: school, subject, grade, curriculum, section and academic year.
- Teaching assignment: teacher-to-class relationship. Supports many classes per
  teacher and several authorised teachers per class.
- Enrolment: learner-to-class relationship with active/archived status.
- Class policy: hint limit, AI pause, voice-service policy and evaluation setting.
  New classes may copy defaults, but later changes must not silently change others.
- Learning session: owner and optional class membership, with expiring plan data.
  Personal practice should be clearly separated from assigned class activities.

| Role | Access |
| --- | --- |
| Learner | Own class activities and own saved progress, if that feature is enabled |
| Teacher | Assigned classes, their settings and authorised aggregate indicators |
| School administrator | Verify staff roles and manage school/class memberships |

Every API must check school membership, role and class assignment on the server.
Changing a class ID or dashboard selector must never reveal another class. Joining
must use expiring/revocable invitations; staff approval is needed for elevated roles.
Switching roles or classes must stop voice, clear temporary learner work from the
previous view and display the new class context before any action is taken.

## Privacy and assessment boundaries

Teachers should not automatically receive raw chats, audio, disability information,
or labels such as “weak critical thinker.” The current browser-only handling of
attempts must remain the default unless a reviewed, explicit sharing workflow is
introduced. Keep accommodation preferences separate from public class rosters.

If progress is later saved, explain exactly what is shared, who sees it and how
long it is retained. Distinguish support use, attempted work and independent
transfer. Hint counts, completion and time on task are not mastery scores. Avoid
public rankings. Suppress or restrict small-group aggregates where identification
is possible. Research consent must be separate from ordinary classroom access.

Shared-device use needs explicit sign-out, temporary in-memory credentials where
possible and a clear-session action. Personal work must not survive account switches.
Preserve learner access to typing even if a school disallows external voice services.

## Implementation status and acceptance gates

Implemented now: guided sessions, optional voice, deployment-wide pilot teacher
key, anonymous process counts and the accessibility interface improvements above.

NOT implemented: production teacher/learner accounts, school membership, class
creation, per-class policies, enrolment, persistent progress or curriculum routing
by grade. The existing shared-key control must not be presented as those features.
These require an explicit implementation phase before multi-class school rollout.

Acceptance tests for that phase must include:

1. A verified teacher manages Grade 10, 11 and 12 classes through one account.
2. A Grade 10 policy change cannot alter Grade 11 or Grade 12 settings.
3. Learners cannot grant staff roles, inspect rosters or access peers' work.
4. Teachers cannot read or change another teacher's unassigned classes.
5. Enrolment changes revoke access, and account/class switching clears temporary work.
6. Reading support does not change grade or syllabus; syllabus routing is explicit.
7. Sign-in, class switching and learning work by keyboard, screen reader and touch.
8. Refresh, network failure and expired credentials have understandable recovery paths.
