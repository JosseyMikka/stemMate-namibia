# STEMMate

**A STEM thinking companion for learners and a preparation assistant for teachers.**

STEMMate supports Mathematics, Physics, Chemistry, Biology and Computing / Computer Science for Grades 10–12, with Namibia NSSCO/NSSCAS and Cambridge IGCSE/AS/A Level pathways. It helps learners attempt, explain, apply and check ideas, while teachers retain responsibility for teaching and assessment.

The main experience is a simple chat. Classes, projects and feedback are optional connected workflows. STEMMate does not manage attendance, a school gradebook or a full learning-management system.

## Choose how to use it

| Use | Account needed? | Class needed? | Student list needed? |
| --- | --- | --- | --- |
| Learner asks a STEM question or uses starter practice | Yes, learner | No | No |
| Teacher uses Chat to explore a concept | Yes, teacher | No | No |
| Teacher prepares a lesson, adapts an activity or creates practice questions | Yes, teacher | Currently yes, on this branch | No enrolled students needed |
| Shared projects, learner submissions and teacher feedback | Yes, appropriate role | Yes | Learners join using a class code |

**No class is required for ordinary Chat. No anonymous/guest mode is currently implemented.** Accounts use an alias and password rather than a personal email. Teacher registration requires the operator's private invitation; that invitation alone does not verify professional identity.

Teachers create classes only when they need a shared space. They choose subject, grade, qualification and examination year, then share a rotatable invitation code. Learners create their own accounts and join with that code; teachers do not need to enter student personal records. One teacher can own multiple classes across subjects and grades. Co-teaching is not implemented.

**Known setup friction:** teacher preparation currently sits inside a selected class, although no learners need to be enrolled. A no-class teacher preparation assistant is the recommended next simplification; it has not yet been implemented. Do not create dummy learner records to use the tools.

## Learner journey

1. Sign in and open **Chat**. The initial context is Grade 10 Mathematics, Namibia NSSCO, exam 2027; change it under **Change subject or curriculum** when needed.
2. Ask a question in everyday words, choose **Help me ask a question**, or **Try a small example**. A vague help request may receive one short clarification question.
3. Offer a prediction or attempt. **I'm not sure** is an accepted starting point.
4. Use progressive hints, explain your reasoning, compare with a model explanation and apply the idea to another problem.
5. Complete a fresh independent check. Help and earlier notes are hidden within that activity until submission.

**Explain simply** remains available during supported practice. This is a bounded learning conversation, not unrestricted chat memory or secure exam proctoring. Completion does not establish correctness, mastery or improved critical thinking.

Under **More options**:

- **Quiz me:** three AI-generated questions, one at a time, with hints and reasoning-focused formative feedback after separate processing permission.
- **Explore visually:** authored labelled diagrams and conceptual models using prediction, observation and explanation. Coverage is bounded; this is not arbitrary AI image generation or a virtual laboratory.
- **Attach work:** type an answer or select an image/PDF page. Confirm and correct transcription before requesting formative feedback. This is not authenticated official marking.
- **Past papers:** links to official resources and practice using supplied questions/pages, not an automatically searched paper library.

Guided-chat attempts stay on the device; that API receives an attempt acknowledgement rather than the learner's prose. Quiz and attached-work feedback use separate AI routes. Never describe model-explanation comparison as automatic assessment of a learner's reasoning.

## Teacher journey

Teachers can use **Chat** immediately without creating a class or enrolling students.

For connected teaching, open **Teacher tools**, add or select a class, and use:

- **Prepare teaching materials:** Plan a lesson, Adapt an activity or Create practice questions. Supply the objective and relevant content; review/edit drafts, assumptions and the separate teacher answer guide. Nothing is automatically assigned. These tools are in the current review branch/PR 2.
- **Projects and feedback:** set a brief, criteria and checkpoints; learners make/test/revise an artifact and optionally submit a snapshot. Teachers assess shared work and provide feedback.
- **Class controls:** configure hints, pause learner practice and manage optional reporting/sharing.

AI drafts can contain incorrect science, worked hints in learner materials, weak independent checks or inaccurate curriculum/Bloom labels. Teacher review is essential. Bloom labels describe intended actions, not measured attainment. Project notebooks support making/testing/revision but do not establish constructionism or project-based learning merely by being completed.

[Teacher preparation](docs/TEACHER-PREPARATION.md) · [Projects](docs/PROJECT-PATHWAY.md) · [Workflow/UI review](docs/WORKFLOW-AND-UI-REVIEW.md)

## Privacy and accessibility

- Keep personal details out of prompts and uploads. Provider processing/retention and school/research permission require review before real learner data.
- Main-chat draft recovery is optional, off by default, tab-scoped and unencrypted, with a 30-minute expiry. Leave it off on shared devices. Sign-out clears copies in this tab; it does not erase other tabs, exports or backups.
- Teacher preparation, quiz drafts, attachments and unshared project notebooks are not covered by chat recovery. Copy/export important work before changing context or leaving.
- Project snapshots are stored only through explicit sharing and governed by class access/retention controls. Optional activity counts are not learning scores or research consent.
- The interface targets WCAG 2.2 AA with labelled inputs, keyboard access, visible focus, non-colour labels, responsive layout, text alternatives and MathML/KaTeX equations. Full conformance is not certified; representative learner and assistive-technology testing remains necessary.

[Draft recovery](docs/DRAFT-RECOVERY.md) · [Accessibility](docs/ACCESSIBILITY-AND-CLASSROOM-DESIGN.md) · [Release/privacy gate](docs/RELEASE-AND-PRIVACY.md)

## Scope and release status

The catalogue covers selected 2026/2027 pathways, not complete verified syllabuses. There are 14 authored starter topics; custom AI questions are general support requiring review. Practical assessments and school teaching remain outside the app's coverage claims.

Current teacher-tools branch verification: 70 backend tests, ten frontend suites, build/typecheck/lint and GitHub checks pass. These checks do not establish learning efficacy, factual accuracy or production readiness. Teacher preparation is under review in [PR 2](https://github.com/JosseyMikka/stemMate-namibia/pull/2); the earlier learner redesign was merged in PR 1. No public deployment has been performed.

Historical database/index paths were removed from this fork's branches with an approved history rewrite. Copies in upstream repositories, caches, clones and backups remain a separate remediation issue. Do not push from old history-bearing clones.

## Run and verify

Architecture: React/TypeScript frontend and FastAPI/Python API. Use the React app in `stemmate-frontend`; `client/` is legacy code.

Requires Python 3.11, Node 22.12+ and pnpm 11. From the repository root:

```sh
python -m venv venv
source venv/bin/activate
pip install -r server/requirements.txt
# Set private STEMMATE_TEACHER_INVITE and STEMMATE_ORIGINS for your environment.
# Optional: set GROQ_API_KEY only on the server for AI questions/feedback.
cd server
uvicorn main:app --host 127.0.0.1 --port 8000 --workers 1
```

In a second terminal:

```sh
cd stemmate-frontend
pnpm install --frozen-lockfile
pnpm dev
```

Use `http://localhost:5173` with `STEMMATE_ORIGINS=http://localhost:5173` for the local example. The browser API default is `http://localhost:8000`. Store secrets in ignored `server/.env` or private runtime variables; never use VITE variables for keys. Starter activities need no AI key. All modes still need the app server connection; full offline/PWA operation is not implemented.

Checks, from the root with the Python environment active:

```sh
pip install -r server/requirements-test.txt
python scripts/check_private_files.py
python -m unittest discover -s tests -v
cd stemmate-frontend
pnpm build
pnpm lint
pnpm test
```

Production requires reviewed HTTPS origins, private persistent storage, backups/restore, provider controls and one API worker/instance until session/limit storage is redesigned. The provided hosting configuration does not authorise deployment or spending.

[Detailed developer guide](docs/DEVELOPER-GUIDE.md)

## Sustainability and revenue — proposed, not implemented

The application currently has no billing, paid plans, subscription enforcement or payment checkout.

The proposed starting model is school/organisation subscriptions with included, bounded AI usage, plus separately priced onboarding and teacher training. Sponsored access can fund learners who cannot pay. Optional individual teacher plans can be tested later. Keep a useful basic reasoning experience accessible; do not fund it through learner data sales or advertising to minors.

Validate willingness to pay and actual API, hosting, support and content-review costs in a small supervised pilot before setting prices. Revenue is not profit. [Business-model proposal](docs/BUSINESS-MODEL.md)

## Provenance and permission

Derived from [xeilaaa/stemMate-namibia](https://github.com/xeilaaa/stemMate-namibia), with recorded contributions including xeilaaa, Chilwalo Owen Luyando and Josephina Alexis. Josephina Alexis confirms this is collaborative work and that the original collaborator granted permission for the rebuilding work. No repository-level public software licence has been supplied; no new licence is granted here. Preserve existing notices and third-party dependency licences, and record any agreed publication/commercial terms separately.
