# Curriculum-first implementation — 29 October 2026

This small implementation supersedes the country-led rollout and separate-index
recommendations in `MULTI-COUNTRY-CURRICULUM-DESIGN.md`. Curriculum is the routing
identity. Country is not required, inferred, collected or used as an access gate.
Cambridge is available independently of the learner's location.

## Implemented

- Existing course IDs remain stable. The catalogue exposes `pack_id`,
  `pack_version` and `coverage_status`. The initial internal release is
  `starter-2026-10-29`; this is not an official syllabus edition or certification.
- Home starts can supply an exact pack version; unknown versions fail. Class
  starts validate an explicit version against the server-selected course.
  Legacy clients that omit the field resolve the current catalogue version.
- A single existing Chroma store remains supported. Retrieval filters by course,
  pack, release, exam year, topic, reviewed status and public curriculum scope.
  Each returned document is checked again, including required source references.
  There is no unfiltered fallback. A request without pack identity cannot retrieve.
- Source identifiers, versions, titles and locators accompany excerpts in model
  context. This is provenance for generation, not a new verified-citation UI or
  a guarantee that generated claims are correct.
- Guided sessions deep-copy their course, grade and exam year before generation.
  Resuming and advancing retain that snapshot. Side questions inherit it.
  Teacher access, pause state and hint limits continue to be read live.
- The frontend sends the curriculum release, displays it in Topic and privacy,
  and separates opt-in draft keys by release. Existing legacy drafts remain in
  the recovery list; they are not assigned a guessed version.
- The tutoring prompt addresses school learners using the selected curriculum,
  instead of assuming all learners are Namibian.

## Source preparation and compatibility

Existing unversioned vector documents intentionally stop being used as reviewed
context. Do not merely mark the old index reviewed. A curriculum reviewer must
check edition, permitted use, objective mapping and source provenance first.
Keep a backup of the index before administrator-led reindexing. The public upload
endpoint stays disabled and cannot assign approval metadata.

Each reviewed chunk requires these exact metadata keys (synthetic example).
Source reference strings must be nonempty and at most 128 characters. Retrieval
uses at most four valid excerpts, each limited to 2,000 characters:

```json
{
  "course_id": "na-nssco",
  "pack_id": "na-nssco",
  "pack_version": "starter-2026-10-29",
  "exam_year": 2027,
  "topic_id": "linear",
  "approval_status": "reviewed",
  "access_scope": "public_curriculum",
  "source_id": "synthetic-example-only",
  "source_version": "fixture-v1",
  "source_title": "Synthetic test document, not a real syllabus",
  "source_locator": "page 1"
}
```

Approval metadata is trusted administrator data, not evidence of an approval by
itself. Private class uploads must not enter this shared retrieval path. With no
eligible material, existing original starter practice still works; AI is asked
to state that support is general and requires review. The API conservatively
continues labelling generated help `ai_general_support`.

## Release discipline and deliberate limits

Do not reuse a pack version after changing its content or source corpus. Update
the release identifier and preserve old indexed chunks for the remaining lifetime
of active sessions. The current registry is code-managed and serves one current
release per course; historical releases are available only through existing
session snapshots, not a version-selection dashboard. Pinning a class across
application releases and publishing arbitrary archived versions are future work.

There is no country selector, additional AI model, separate country deployment,
curriculum-switching workspace feature, research activation or database migration.
Existing sessions still expire after one hour and are lost on server restart.
Curriculum pinning is not durable session storage. Quiz practice remains general
subject practice and is not converted into reviewed curriculum retrieval here.

The existing catalogue retains partial and unverified syllabus coverage notices.
This change does not approve new syllabuses or replace educator content review.
Use Mathematics in the Namibia and Cambridge routes for the first internal pilot.
Do not collect learner data for that pilot without the existing required controls.

## Validation and application

Apply the incremental `stemmate-curriculum-versioning.patch` after the guardian
and consent implementation (`d4cfd53`), not directly to an unrelated main branch.
Review first with `git apply --check stemmate-curriculum-versioning.patch`.
Then apply with `git apply stemmate-curriculum-versioning.patch`.

Run `python -m unittest discover -s tests`, frontend tests, build and lint, and
`python scripts/check_private_files.py`. Regression coverage includes wrong-pack,
wrong-release, private/unreviewed/unlabelled document rejection, invalid client
versions, pinned session stages/hints, side questions, catalogue changes during
generation, and live teacher pauses. Test sources and provider responses are
synthetic; no real provider or production index validation is claimed.

Before deployment, review the real index metadata and manually verify both
curriculum routes, visible coverage notices and old draft recovery. Production
deployment remains a separate approval.
