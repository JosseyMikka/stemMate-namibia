# Teacher-led project pathway

The project pathway supplements guided practice across all five subjects and both
curricula. One teacher owns each class and its briefs. Drafts are private; only
published briefs are returned to enrolled learners. Edits use optimistic revision
checks to avoid silently overwriting another saved version. Class membership is
checked on every project request. No learner project answers are accepted by the API.

## Design rationale

Bloom's revised categories guide the teacher's intended objectives: remembering,
understanding, applying, analysing, evaluating and creating. The app does not infer
attainment from selected labels or completion. Categories overlap across phases.

Project-based learning is supported through a driving question, multi-lesson
checkpoints, learner design choices, inquiry, evidence, critique, revision and an
artifact shared with a teacher-approved audience. A template alone cannot establish
authentic inquiry or delivery quality; teachers adapt it to their setting and syllabus.

Constructionism is supported by requiring learners to make an external, shareable
artifact, explain its operation, test it and compare revisions. Actual artifacts are
made outside this notebook (paper models, exhibits, prototype designs or pseudocode).
The pilot does not execute code, upload artifacts, provide a shared maker workspace
or deliver automated peer collaboration. Teachers organise these classroom activities.

## Evidence and assessment

Seven notebook phases: investigate; design; make; test; feedback/revise; share/defend;
individual independent check. Learners record predictions, sources, assumptions,
versions, expected/observed results, limitations, feedback and personal contribution.
Entries are self-reports. The teacher reviews actual artifacts and evidence and asks
individual questions. A new teacher-supplied problem and delayed unaided task check
transfer. No automatic grade, Bloom level or research outcome is assigned.

## Privacy and limitations

Briefs persist in SQLite. Notebooks are memory-only: users must save a resumable JSON file, export or copy before
switching or refreshing. Exports include learner prose and must be handled privately.
Resumable files are parsed locally with size, format, brief-version and entry validation; they are never uploaded. They permit continuing over several lessons. Independent mode hides earlier entries and disables exports/copy until the attempt
is recorded. It is formative, not secure assessment. Refresh is manual; withdrawn
briefs already viewed or exported cannot be remotely erased. Class pause blocks local
advancement but still allows writing/export. There is no submission dashboard, durable
learner history, teacher feedback inbox or in-app team workspace. These boundaries
are displayed to users. Safety notices, voice opt-in and subject/course boundaries
remain in effect; project notebooks do not call AI.

## Preview test

Refresh the preview and sign in using the existing demo accounts. In Namibia ·
Grade 11 Chemistry, select Teacher-led project. A published paper atom-conservation
project includes supplied equations and a three-lesson schedule. Teacher: edit or
withdraw it, or create another brief. Learner: select the brief, record test notes,
advance through all phases, check independent help restrictions, then export/copy.
Switch back to guided practice to check that both pathways remain available.

## Framework references

- [PBLWorks project design elements](https://www.pblworks.org/gold-standard/pbl-project-design)
- [MIT: Constructionism in practice](https://www.media.mit.edu/publications/constructionism-in-practice-designing-thinking-and-learning-in-a-digital-world-2/)
- [University of Vermont: Bloom's taxonomy](https://www.uvm.edu/ctl/blooms-taxonomy)

These references inform design choices; they do not certify this software or prove
educational effectiveness. Classroom and research validation remain necessary.
