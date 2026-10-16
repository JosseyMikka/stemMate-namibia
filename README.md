# STEMMate — reasoning before answers

A React / TypeScript / Vite interface backed by FastAPI and a local Chroma curriculum
store. Groq generates a structured lesson once; the server releases only the
material appropriate to the learner's current stage. The older Streamlit client
still uses `/ask/` for direct explanations and does not provide the guided flow.

## Run locally

Use Python 3.11 and Node 22.12+ with pnpm 11.

```sh
python -m venv .venv
source .venv/bin/activate
pip install -r server/requirements.txt
export GROQ_API_KEY=your-provider-key
export STEMMATE_TEACHER_KEY=your-random-secret-at-least-24-characters
cd server
uvicorn main:app --host 127.0.0.1 --port 8000 --workers 1
```

In another terminal:

```sh
cd stemmate-frontend
pnpm install --frozen-lockfile
pnpm dev
```

`VITE_API_URL` defaults to `http://localhost:8000`. `STEMMATE_ORIGINS` is a
comma-separated allowlist (default `http://localhost:5173`). `GROQ_MODEL` defaults
to `llama-3.3-70b-versatile`. Keep provider and teacher keys on the server. Use TLS
for a hosted service. This PR does not deploy anything.

## Learning flow

1. Predict / attempt before hints. “I am stuck” is a valid, accessible attempt.
2. Up to three progressive hints, subject to the teacher's lower limit.
3. Explain the reasoning, then compare it with a worked model explanation.
4. Reflect and apply the idea to a different problem.
5. Attempt another problem independently, without hints or earlier notes.
6. Compare reasoning after submission; discuss uncertainty with a teacher.

Direct explanation is always an accessible starting option and is available during
supported stages. It is recorded as support used and does not advance the stage.
It is withheld inside the independent check until submission. A separate tab or
outside tool can still supply help: this is formative practice, not secure exam
software. A short submission establishes an attempt, not its quality or mastery.
No automated correctness or critical-thinking score is assigned.

## Teacher controls and privacy

Open **Teacher controls** with the deployment's secret key. Teachers can set the
hint limit (0–3), pause AI generation / learning steps, enable optional anonymous
activity counts, inspect counts and delete them. Clearing a learner session stays
available during a pause. Controls and counts are in memory and reset on restart.
Use exactly **one server worker** for this version. There is no classroom/teacher
account system, roster, learner monitoring, or durable policy store yet.

Learner attempts, explanations and reflections remain in React memory in the
browser. The API receives only a boolean attempt acknowledgement. It stores no
learner prose or chat transcript. Refreshing the page loses the local work.
The topic and retrieved curriculum excerpts are sent to Groq to prepare a lesson;
standalone direct explanations also send the topic. Provider retention policies
must be reviewed by the school before use. Do not submit personal information.
Generated plans may repeat parts of the topic. The server keeps these plans with
random bearer tokens for up to one
hour; expired plans become inaccessible immediately and are purged within the
next minute (or on the next session operation). Clear-session deletes
the plan immediately. Tokens travel in headers, never URLs or local storage.
API responses use `Cache-Control: no-store`; no learner questions are logged by
the application. Infrastructure must also avoid logging request bodies/headers.

Evaluation is **off by default** and needs both a teacher setting and learner
opt-in. Primary reading-level sessions never contribute counts. Counts include
starts, hints, direct support and completed stages only, with no IDs, text,
individual timestamps or grade bands. Disabling evaluation deletes counts. These
are voluntary process totals, not research consent records or measures of learning.
Use a separate approved research protocol for research with minors. Group totals
can still be revealing in a very small classroom; avoid sharing them publicly.

## Age-appropriate support and content

Default to primary reading level without collecting birth dates. Prompts constrain
language, examples, personal-data requests and unsafe experiments; reminders ask
learners to seek adult help. Structured output is validated before a session is
created. Model-generated tasks and hints still need teacher evaluation: prompt
rules do not guarantee age suitability, mathematical accuracy, or that every hint
withholds the final answer. Shared PDF uploads are disabled because the old route
let anyone change everyone's retrieval corpus. Curriculum ingestion currently
requires a trusted administrator working offline.

Math uses Markdown + remark-math + KaTeX, with local fonts, HTML and MathML output,
untrusted commands disabled and expansion bounded. Raw HTML, remote images and
clickable links are not rendered. Malformed equations remain visible as errors
instead of crashing the chat. Prompts specify `$...$` and `$$...$$` delimiters.

## Verification

```sh
pip install -r server/requirements-test.txt
python -m unittest discover -s tests -v
cd stemmate-frontend
pnpm build
pnpm lint
pnpm test
```

Backend tests replace the AI provider with a fixed lesson to verify server gates,
privacy, teacher authorization, limits, isolation, expiry, direct support and errors.
Renderer tests verify inline/display math, MathML, malformed math and unsafe content.
Live provider / curriculum quality evaluation requires a configured Groq key.

## Architecture notes and remaining work

The original active application was `App → Home → Chat → /ask/`, which answered
immediately and logged full questions. Existing account/history modules were
unwired; their frontend imports referenced nonexistent APIs. This change removes
the unreachable account UI, retains the dormant backend modules, and replaces the
active chat with guided sessions. Existing databases/vector data are not migrated.
The repository already tracks a SQLite database and a curriculum vector store;
an administrator should audit those artifacts and their history for personal data
before making the repository or dataset public. This change does not inspect or
rewrite those data files.

Before wider school rollout: add durable, authenticated class-scoped teacher
policies; per-user abuse controls; a reviewed curriculum
and safety benchmark across reading levels; assistive-technology user testing;
and a properly consented study of delayed, unaided transfer. The current global
limit of 60 AI generations per hour bounds provider calls for a small pilot but
is neither a per-user quota nor protection against a determined attacker.

## Your own GitHub repository and hosting

The source repository is `xeilaaa/stemMate-namibia`; the connected GitHub account
for this work is `JosseyMikka`. Fork the source into your own account to preserve
its history. Apply the redesign branch there and open a pull request against your
fork's `main`. The upstream repository does not need to be changed. Grant the
GitHub integration access only to your intended repository, including permission
to write repository contents, workflows and pull requests.

GitHub stores the code and runs the checks. GitHub Pages cannot run the Python
backend. The included `render.yaml` prepares both the React static site and the
Python API in one Render account. It does not deploy anything by being committed.
Creating a Render Blueprint does trigger initial hosting setup; do that only after
reviewing the PR and approving deployment. Subsequent automatic deploys are off.

When you are ready to create the Blueprint in your Render account:

1. Connect your own GitHub fork and select the reviewed branch. Review the service
   names first; rename them in the Blueprint if they conflict with existing services.
2. Supply `GROQ_API_KEY` privately in Render. Never put it in GitHub or in any
   frontend `VITE_` setting. Render generates the teacher key on the API service;
   keep it private and use it only in the teacher panel.
3. Set the API's `STEMMATE_ORIGINS` to the exact HTTPS address of your frontend,
   without a trailing slash. Set the frontend's `VITE_API_URL` to the API's exact
   HTTPS address. If the assigned addresses differ from your initial values,
   correct these settings and manually redeploy the affected service.
4. Keep the API at one instance and one worker because learning state is in memory.
   The included free pilot configuration can sleep, restart and lose temporary
   sessions. Check memory and model-download behavior before choosing a paid plan.
5. Verify `/test`, start a guided lesson, test a direct explanation, and test teacher
   hint limits/pause from the hosted frontend. Check CORS, equations and both phone
   and desktop layouts with real Groq responses. Review the curriculum and provider
   data handling before learners use it. Keep Blueprint Auto Sync off if configuration
   changes should also require a manual action.

This deployment configuration has been checked against Render's Blueprint fields;
no hosted deployment or live provider validation has been performed. Existing
curriculum vectors are included in the original repository checkout; anonymous
uploads remain disabled. Audit existing tracked data before making another copy
public. The original source has no root license file, so resolve permission and
attribution before redistribution beyond the requested fork.

References: [GitHub Pages limitations](https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site),
[Render Blueprint fields](https://render.com/docs/blueprint-spec),
[Render deployment controls](https://render.com/docs/deploys).

## Optional voice support

Learners can dictate topics and attempts or listen to the current prompt. Voice
starts only after the learner enables it and clicks the microphone button; browser
microphone permission is also required. The browser may send audio to its speech
provider, disclosed before enabling input. STEMMate does not upload or save audio.
Transcripts are editable and never auto-submit. Learner attempt transcripts retain
the same browser-only handling as typed attempts. Topic transcripts are sent to the
tutor only when the learner starts a lesson, like typed topics. Spoken prompts use
local English synthesis voices only. Unsupported browsers, denied permissions and
missing voices retain the full text workflow. Equations should be checked visually.
Voice input is English for this pilot; accent/language accuracy needs learner testing.
Switching learning stages stops voice input/output. Independent checks can read
only the current question and dictate the learner’s own answer, without extra help.
