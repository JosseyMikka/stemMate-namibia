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
class membership. Teachers see aliases, aggregate activity and project snapshots explicitly shared with them; unshared drafts stay local.
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

Guided-practice attempts, explanations and dictated answers stay in browser memory. Project notebooks also stay local unless a learner explicitly submits a snapshot for assessment. The guided-practice API receives an acknowledgement, not learner prose; separate assessment routes store only explicitly shared project snapshots. Optional custom questions and
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
notebook, with optional text-artifact submission and teacher assessment described below. It is not a maker environment or real-time collaboration service.
The teacher supplies a fresh independent question and later unaided transfer check.
Bloom labels describe intended thinking, not measured attainment or a fixed ladder.
Teachers must supply authentic context, sustained inquiry time and suitable materials;
merely completing the notebook does not constitute project-based learning.

Notebooks stay in browser memory; switching pathways/projects/classes or refreshing
loses unfinished writing. Save a resumable notebook file to continue next lesson, or export text/use the copyable fallback before leaving. Resume files are validated and processed locally for the same project version, never uploaded.
Exports include the brief and learner evidence and need private handling. Earlier
entries, copy and export are withheld during the independent check. These are local
formative gates, not secure exam controls. No project work goes to AI. Only explicitly shared snapshots go to the server; the dashboard shows learner-reported progress and teacher assessment separately, with no automatic Bloom/mastery score.

## Project assessment and privacy

The teacher dashboard shows latest shared progress snapshots per currently enrolled
learner, up to 100 recent updates per project. Learners choose whether to share
seven notebook entries and a text artifact/pseudocode or description of a physical
artifact. No file, image or audio uploads are supported. Unshared local edits are not
visible to teachers. Actual physical artifacts and independent understanding need
separate teacher verification; the review form records those checks explicitly.
Teachers give actionable feedback, criterion judgements and revision requests.
Learners view all their retained versions/feedback and can restore a snapshot locally
before submitting a revision. Brief and submission versions are kept with each
assessment; stale writes are rejected. These are human judgements, not automated grades.

Sharing is disabled per class by default, requires the teacher to enable it and an
explicit learner acknowledgement for every submission. Teachers choose 7/30/90-day
retention. Shorter periods cap existing records; extending a period never extends
existing records silently. Disabling acceptance stops new submissions but does not
delete existing work. A separate confirmed control deletes class submissions/feedback.
Learners can withdraw their own stored versions and feedback, including after leaving
a class, from My stored project work and privacy. Former members lose app access,
and their records are hidden from the teacher pending withdrawal or expiry.
Expired records are inaccessible and purged on relevant requests or within the
next minute while the server runs. Server downtime delays physical cleanup.
Deletion removes active database records, not previously exported copies or backups;
SQLite pages may retain deleted bytes until maintenance. Schools must establish backup,
secure-erasure, consent, access and retention procedures before deployment. App opt-in
is not a replacement for institutional/guardian consent or a research protocol.
The hosting operator can access server storage; restrict it accordingly.

### A smaller thinking companion

Learners sign in with an alias and choose **Practise on my own** or **With my teacher**. Independent practice needs no class code: select subject, grade, exam year and qualification, then use the original starter reasoning activities or an accessible direct explanation. Learners can optionally ask a STEM question about the selected subject/topic. Questions and curriculum context go to the configured AI provider; optional first thoughts and later attempts stay on the device. Blank questions use starter activities without an AI call. No class activity is reported and no submissions are accepted; local spoken prompts are available, external microphone transcription is off. A learner account and server connection are still required.

Teacher-led classes use a compact class selector, **Think it through**, and **Projects and feedback**. Project editing, curriculum details, account/class administration and notebook file tools are disclosed when needed. **Review shared work** retains voluntary sharing, teacher judgement and versioned feedback. Switching learning spaces or activity views preserves local drafts; changing class, refreshing or signing out still requires saving/copying work.

The teacher chooses the context, organises making and discussion, and assesses actual artifacts and independent understanding. STEMMate prompts reasoning and provides support; it does not assign automatic grades or manage a school gradebook, attendance, teams or project schedules.

### Chat-first interface

Chat opens immediately with a visible default context (Grade 10 Mathematics, Namibia NSSCO, exam 2027). Use Change subject or curriculum to choose another context; Topic and support selects starter/topic scope and reading support. No class is needed for independent use.

The main chat offers **Help me think**, **Give me a hint**, **Explain simply**, and **Attach work**. Learners can ask in everyday language, use optional editable question starters, or start with an example. A short, vague request receives one local clarification prompt with a skip option; concrete questions proceed directly. Short steps / Standard / More detail is an optional preference before starting. AI plans use the selected style, stated difficulty and class curriculum without inferring ability. Attempts remain local. Earlier thinking is collapsed, and each stage asks one short next question. More options holds visuals, similar examples, self-check prompts, topic/privacy settings and official paper links. Hints remain gated after an attempt and earlier help is hidden during independent practice. Switching from direct to guided practice records prior worked support. This is a controlled reasoning conversation, not open-ended chat memory or automatic assessment of learner prose.

Teacher tools, and learners’ Classes, projects & feedback, are secondary sidebar views. Existing class permissions, private notebooks, feedback and privacy controls are retained. Switching views preserves local drafts, but changing class/curriculum, refreshing or signing out requires save/copy. Chats are temporary and no persistent chat-history list is claimed.

### Local AI configuration and exam resources

Create a Groq key in the provider console and save it as GROQ_API_KEY in the ignored server/.env file. The server loads that file at startup without overriding deployment environment variables. Never place the key in the browser, Git or chat messages. Restart the API after saving. GROQ_MODEL defaults to openai/gpt-oss-120b; verify model access in your Groq account. Local provider testing needs langchain-groq and python-dotenv; full indexed retrieval additionally needs the retrieval dependencies. If no chroma.sqlite3 index exists, no embedding model is loaded and the tutor provides clearly labelled general subject support. If an existing index fails, the request fails safely rather than silently dropping retrieval. STEMMATE_VECTORSTORE_DIR can select a reviewed local index; course/year/topic filters remain mandatory.

Exam practice and past papers in Chat links to official NIED or Cambridge resource pages for the selected pathway. STEMMate does not host or automatically ingest past papers. Learners must check qualification, syllabus, year/tier and available permissions, attempt the paper themselves and use official mark schemes after attempting. They may bring a question to the supported reasoning chat. AI output is not official marking guidance.

### Visual reasoning

Use **More options → Explore visually** in chat for original molecule/cell diagrams and atom-balance, membrane-diffusion and enzyme-temperature models. Simulations require a prediction, observation and learner explanation before offering a model explanation. Outputs include text/tables; notes stay local and no AI call is made. Visual help is unavailable during the independent check. These are illustrative concept models, not laboratory instructions or validated measurements. See [model assumptions, scientific references and verification](docs/VISUAL-MODELS.md).

### Attach work

The chat toolbar now offers **Attach work** for a PNG/JPEG photograph, selected PDF page or typed answer. Explicit AI-processing permission precedes image submission; learners edit and confirm the transcription before feedback. Help me improve gives a guiding question, supplied-criteria mode offers provisional practice feedback, and Explain directly remains available. No attachment data is saved in the database or teacher reports. Set private `GROQ_VISION_MODEL` to an available vision model; the preview uses `qwen/qwen3.8-27b`. See [privacy, limits and testing](docs/ATTACH-WORK.md). PDFs stay local: choose a page, preview it, then explicitly send that page image for transcription into the question, answer or marking-criteria field. A fictional sample supports testing. Maximum 10 MB/100 pages; password-protected PDFs are rejected. Automatic paper search and authenticated official marking are not included.

### Quiz me

Choose **More options → Quiz me**, or type **Quiz me on …** (also “Can you quiz me on …?”). A three-question quiz uses the selected subject, grade, qualification and explanation style. One question is visible at a time. After separate permission, the learner submits an answer and reasoning for AI feedback; a local reflection and Next question follow. Hints respect teacher limits and mark that question as supported practice. The recap counts attempts with/without STEMMate hints, without a score or mastery claim. Quiz answers/feedback are not stored in teacher reports or the database. Questions are general AI support, not verified official papers. See [quiz privacy, limits and testing](docs/QUIZ-PRACTICE.md).

Upper-grade Quiz me verification: [Grades 11–12, NSSCAS and Cambridge AS/A Level](docs/QUIZ-UPPER-GRADES-VERIFICATION.md). Computer Science is available under Computing; the route matrix distinguishes Namibia Computer Studies/Computer Science and Cambridge Computer Science.
