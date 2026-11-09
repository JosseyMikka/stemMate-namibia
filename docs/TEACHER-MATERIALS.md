# Teacher materials and visual companions

Teacher tools → Prepare teaching materials now offers Attach materials. No class or learner roster is required. PNG/JPEG images and individual PDF pages are supported; Word documents, slides, bulk ingestion, a materials library and AI image generation are outside this release.

## Read and confirm

1. Open Attach materials and agree to provider transcription processing. Remove personal information and use content you have permission to process.
2. Choose an image (at most 2 MB and 12 million pixels), or choose a PDF (at most 10 MB and 100 pages), preview the chosen page and explicitly select Read this page. PDF parsing/page preview stays in the browser; only the selected rendered page goes to AI. Password-protected PDFs are unsupported.
3. Check the editable transcription against the original, including equations, visible diagram labels and uncertain symbols. The model is instructed to omit identifiers and not obey instructions embedded in materials, but that does not guarantee perfect transcription or de-identification. Correct/remove details yourself. It does not reconstruct a diagram from the image.
4. Confirm the text and choose Use confirmed text in lesson notes. It appends to existing notes, never silently replaces them. Unconfirmed text, [unclear] markers and a combined total over 6,000 characters are rejected. Notes remain editable.
5. Review the lesson inputs, select the separate preparation-processing permission and generate a draft. Reading an image does not automatically generate teaching materials. This is not automatic syllabus ingestion or verification.

The teacher-only transcription endpoint enforces authentication, teacher role, explicit permission, existing AI budgets, bounded input/output and no-store response headers. Shared image decoding rejects malformed/oversized images, re-encodes to remove metadata and uses the existing configured vision provider. Transcription has a 55-second browser deadline and no automatic retry. Existing notes survive failures. Provider allowance errors have a fixed message without provider payloads.

Files, transcripts and teaching drafts are not written to the app database, reports or a research log. Provider retention rules still apply. Attachment drafts are transient; closing clears the attachment view. Text already confirmed into notes remains in the current preparation view until edited, refreshed or signed out; main-chat draft recovery does not cover it. No billing, recording or data-export permission is implied by attaching materials.

## Existing visual companions

Open Visual companion (optional). Biology offers animal-cell and membrane diagrams, an enzyme experiment diagram, a solute-diffusion model and an enzyme-temperature model. Chemistry offers water/carbon dioxide/methane connectivity schematics and the hydrogen/oxygen/water atom-balance model. No authored teacher companion is currently offered for Mathematics, Physics or Computing.

Preview selected visual works without a provider request or generated draft. Generation sends only the allowlisted companion metadata with the teaching inputs. The backend validates the visual against the authoritative subject before reserving AI allowance; arbitrary URLs and cross-subject companion IDs are rejected. Course catalogue topic lists are excluded from preparation provider context; they are not supplied objectives.

Successful generation appends an authored prediction/observation/explanation activity reference and limitations to learner materials and teacher guidance. Open draft visual companion opens the corresponding original in-app activity. This is a text reference plus an interactive preview, not an embedded image in copied text or an export/assignment. Teachers can copy/select existing draft text as before. Do not promise image downloads or automatic handouts.

Closing and reopening visual previews retains local simulation notes. Context changes clear the preview; refresh/sign-out clear preparation. Keyboard focus returns to the opening control. The existing model's prediction → observation → explanation gates remain active; responses are not automatically assessed. Existing visual tools allow exploration of other models, but switching the preview does not change the draft's attached companion.

## Verification and limits

- 81 backend tests passed, including teacher material authentication/role/consent, transient transcription response, blank/long outputs, private error handling and cross-subject visual rejection; existing image safety tests remain in the suite.
- Twelve frontend suites passed, including append-with-confirmation, unclear-text rejection, combined-length bounds, subject choices, initial processing defaults, transcription request shape/deadline, PDF processing and visual model gates. TypeScript/build, lint, tracked-private-file and whitespace checks pass.
- Browser: built-in fictional PDF page preview → real provider transcription → confirm → append preserved original notes. The material action was disabled before confirmation. A subsequent Biology lesson generated successfully with the diffusion companion; its original model was opened and prediction → observation → explanation completed. Final-build preview-before-generation and visual close/reopen note retention/focus return were checked. No classes, projects or real learner data were changed.
- A separate local-image browser upload could not be automated because Chrome's extension lacks Allow access to file URLs. This is an automation limitation, not proof of a failure in the learner/teacher file picker. That exact browser step remains unverified; PDF page-image transcription and shared backend image processing were tested. No extension permissions were changed.
- At a 390-pixel viewport override, document/client widths were both 375 pixels, with no horizontal overflow. This is Chrome responsive testing, not physical iPhone or screen-reader certification. Temporary overrides were reset.

A live AI teaching draft still required correction: it invented an unbounded random-walk paper table, used a misleading concentration-gradient definition and asserted syllabus alignment. It was not marked reviewed. Companion metadata was strengthened with the actual deterministic model rules and a fixed review warning; these measures do not guarantee future scientific or pedagogical correctness. Teachers must review accuracy, answer separation, accessibility, practical safety, resource availability, objective fit and independent tasks. No official curriculum alignment or learning gains are claimed. Prior release, provider-capacity, privacy and historical-copy gates remain.
