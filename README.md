# STEMMate — reasoning before answers

React/TypeScript and FastAPI support Mathematics, Physics, Chemistry, Biology and Computing practice for Grades 10–12.
Learners attempt, use progressive hints, explain, apply and complete an independent
check. Direct explanations remain available during supported stages. Independent
checks hide help until submission. This is formative practice, not secure examination
software, and completion is not a measure of correctness or critical thinking.

## Accounts and classes

Learners and teachers have separate accounts. A teacher needs the deployment's
private admission code to register, then can create and manage several classes,
including different grades and curriculum pathways. Each class has its own course,
exam year, members, hint limit, pause, dictation and evaluation settings. Learners
join using expiring, rotatable invitations. Every learning operation checks current
class membership. Teachers see aliases and aggregate activity, not learners' drafts.
The admission code does not verify professional identity; distribute it through a
trusted school administrator. One owner per class is supported; co-teaching is not.

Passwords use salted scrypt hashes. Eight-hour login tokens are held in browser
memory and hashed in SQLite. Refreshing signs out and loses unfinished drafts.
Logout revokes the token. Administrators can reset a password with
`python server/manage_accounts.py reset-password USERNAME`; this revokes existing
sessions. There is no email recovery, school SSO, MFA or account deletion interface.

## Curriculum scope

The catalogue separates school grade from qualification and examination year:

- Namibia: NSSCO (Grades 10–11) and NSSCAS (Grade 12), with subject-specific codes.
  Computing uses the official names Computer Studies (NSSCO) and Computer Science (NSSCAS).
- Cambridge: IGCSE Core/Extended sciences, IGCSE Computer Science, and separate
  AS/A Level courses. Mathematics retains its existing route choices.

Only 2026/2027 examination years are enabled. Cambridge advanced Computing has
separate 2026 and 2027–2029 editions; selecting a year filters the valid courses.
The new NIED entries link the official catalogue and ask schools to confirm editions.

There are **14 original starter topics**, not complete syllabuses: six Mathematics
activities plus motion, forces, atom conservation, moles, osmosis, enzymes, tracing/
debugging and binary search. Selected introductory and prerequisite revision is
available in advanced courses; it does not replace advanced content or practical
assessment. Science activities use supplied fictional data and paper reasoning.
Computing activities trace pseudocode without executing it. The interface displays
subject-specific safeguards. Cambridge advanced Mathematics still offers selected
pure-mathematics revision, without mechanics/statistics lessons. Teachers must review
alignment before assessed use. See [curriculum sources](docs/STEM-CURRICULUM-SCOPE.md).

Starter lessons work without an AI provider. Optional custom questions use Groq
and are labelled general AI support requiring teacher review. Retrieval uses exact
course, examination year and topic metadata; it never falls back to the old,
untagged curriculum store. Trusted administrators must curate tagged material.
Shared uploads and the old unauthenticated answer endpoint are disabled.

## Run locally

Use Python 3.11, Node 22.12+ and pnpm 11.

```sh
python -m venv .venv
source .venv/bin/activate
pip install -r server/requirements.txt
export STEMMATE_TEACHER_INVITE='replace-with-a-random-secret-at-least-24-characters'
export STEMMATE_ORIGINS=http://localhost:5173
# Optional for custom questions: export GROQ_API_KEY=your-private-key
cd server
uvicorn main:app --host 127.0.0.1 --port 8000 --workers 1
```

In another terminal run `pnpm install --frozen-lockfile` then `pnpm dev` from
`stemmate-frontend`. `VITE_API_URL` defaults to http://localhost:8000.
`STEMMATE_ACCOUNTS_DB` defaults to `server/private/accounts.sqlite3`.
Back up this private database securely; never commit it. Use HTTPS when hosted.
Use exactly one worker/instance: learning sessions and abuse limits are in memory.

## Privacy and safeguards

Attempts, explanations and dictated answers stay in browser memory. The API
receives an acknowledgement, not learner prose. Optional custom questions and
selected curriculum excerpts go to Groq; provider data handling needs school review.
Do not enter personal information. Generated plans expire after one hour and are
purged within a minute; clearing a session deletes its plan immediately.
Accounts, class membership and policies persist in SQLite. No audio is stored by
STEMMate. Browser dictation may send audio to its speech provider; the interface
explains this before opt-in. Dictation also requires class permission and browser
permission. Transcripts are editable and never auto-submit. Local English voices
read prompts only on request; text remains available throughout. Accent, language
and real microphone compatibility require testing with intended learners.

Evaluation defaults off and requires both class permission and learner opt-in.
Only class event totals persist: no drafts, user IDs or event timestamps. Teacher
previews are excluded; totals are suppressed below five enrolled learners.
Suppression is not a guarantee of anonymity. Disabling evaluation clears totals.
These counts are not research consent or evidence of learning; research with minors
requires a separate approved protocol. School consent and retention policies must
be settled before rollout. Infrastructure must avoid request-body/header logging.

Age-appropriate prompts, bounded inputs and structured output validation support
teacher supervision; they cannot guarantee model accuracy or safety. Reading support
simplifies wording without changing the class course. The global 60 AI calls/hour
and in-process authentication throttling are pilot safeguards, not production abuse
protection. Review trusted proxy configuration and multi-instance limits before scaling.

## Accessibility and equations

The interface targets WCAG 2.2 AA: labelled fields, keyboard navigation, skip link,
visible focus, announced errors, large controls and narrow-screen reflow. Accessibility
conformance has not been certified; assistive-technology testing with learners remains.
Markdown mathematics uses KaTeX with local fonts and MathML, bounded expansion and
untrusted commands disabled. Raw HTML, remote images and clickable response links
are excluded. Malformed mathematics remains readable without crashing the page.

## Checks

```sh
pip install -r server/requirements-test.txt
python -m unittest discover -s tests -v
cd stemmate-frontend
pnpm build
pnpm lint
pnpm test
```

Tests cover role/class isolation, membership revocation, curriculum validation,
server stage gates, scoped evaluation, hashed credentials, tagged retrieval, equation
rendering and voice privacy. Browser checks cover separate teacher/learner sign-ins,
multi-class creation/join, class hint settings, a complete guided lesson and mobile
reflow. Live Groq quality, real microphones and screen-reader usability remain unverified.

## Hosting and remaining work

`render.yaml` prepares a static frontend and a Python service with a persistent
account disk. The API configuration requires a paid Render plan: review pricing
and approve provisioning first. Nothing has been deployed. Linking a Blueprint can
trigger its initial deployment; later automatic deploys are disabled. Set the exact
frontend HTTPS origin in `STEMMATE_ORIGINS` and API HTTPS URL in `VITE_API_URL`.
Keep provider keys and the teacher invitation on the API only. Keep one instance.

The original app answered immediately through `/ask/`; dormant account/history
modules and original tracked databases/vector files are not migrated. Audit those
existing artifacts and their history for personal information before broader use.
Review the original project's licensing before redistribution. Full curriculum
coverage, teacher-reviewed AI benchmarks, school administration, account lifecycle
and consent/retention workflows remain necessary before a wider school rollout.

## Teacher-led projects

Each class now offers guided practice or a teacher-led project pathway. Teachers
adapt a subject starter, set a driving question, artifact, resources/checkpoints,
success criteria and intended Bloom objectives, then save a private draft or share
it with enrolled learners. Briefs persist in the private accounts database. Updates
use revision checks; teachers can withdraw a brief. Refresh the project list to see
changes. Withdrawal cannot erase copies already viewed or exported.

Projects span investigation, design choice, making, testing, critique/revision,
sharing/defence and an individual independent check. Learners make and share the
actual artifact in the teacher-approved setting; the app is a scaffold and local
notebook, not a maker environment, collaboration service or submission/marking system.
The teacher supplies a fresh independent question and later unaided transfer check.
Bloom labels describe intended thinking, not measured attainment or a fixed ladder.
Teachers must supply authentic context, sustained inquiry time and suitable materials;
merely completing the notebook does not constitute project-based learning.

Notebooks stay in browser memory; switching pathways/projects/classes or refreshing
loses unfinished writing. Save a resumable notebook file to continue next lesson, or export text/use the copyable fallback before leaving. Resume files are validated and processed locally for the same project version, never uploaded.
Exports include the brief and learner evidence and need private handling. Earlier
entries, copy and export are withheld during the independent check. These are local
formative gates, not secure exam controls. No notebook text goes to the server or AI,
and no learner progress dashboard or automatic Bloom/mastery score is created.
