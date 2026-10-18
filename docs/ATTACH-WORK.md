# Attach work: private formative practice

Chat → Attach work accepts one PNG/JPEG page (2 MB, 12 million pixels), or typed text. PDFs, a searchable paper corpus and official automatic grading are not included. Learners supply the question, exact paper reference and matching criteria. The model cannot authenticate papers or criteria; marks, when criteria permit them, are provisional practice estimates. Teachers retain final decisions. Independent checks hide and disable this support; authenticated endpoints also reject a supplied independent-session token and paused/inaccessible class context. Like other browser-based practice, this is not a supervised examination or tamper-proof assessment.

## Reasoning flow

1. Crop out identifiers. Explicitly agree to AI processing before selecting an image.
2. Read and edit the transcription. Correct every `[unclear]` and check signs, powers, labels and subscripts. Copy the question into Question if it appears in the transcription.
3. Confirm that the text represents your work. Editing the question or work resets confirmation and clears outdated feedback.
4. Choose Help me improve (one issue, guiding question and hint), supplied-criteria feedback, or an accessible direct explanation.
5. Revise the work and explain the change. Try a different question without support. AI feedback may be wrong; no grades or mastery claims are stored.

## Privacy and limits

Uploads/transcripts/feedback are transient request data, not database records, evaluation events, teacher reports, a shared index or localStorage. Files are decoded with Pillow, limited by bytes/pixels/type, and re-encoded to JPEG without metadata before transmission. Request bodies have a 2.85 MB cap even without Content-Length; AI endpoints require sign-in, permission and the existing hourly call cap. No access-log output in the preview. Do not enable production request-body logging. These controls do not change the external provider's retention policies.

Close keeps the in-page draft; Clear attached work and feedback removes it. New chat, refresh, sign-out or changing practice context removes it. Nothing is automatically shared with a teacher. No restore from backups or export is promised. No server-side upload retention means there is no attachment deletion endpoint.

Set private `GROQ_VISION_MODEL` to an image-capable model available to the account (preview verified qwen/qwen3.8-27b); use `GROQ_MODEL` for text feedback. Missing/unavailable vision fails clearly with a typed-text alternative. Never commit keys. Runtime dependencies include Pillow and groq (provided through langchain-groq).

## Validation

37 backend tests cover permission, confirmation, missing/unclear text, missing criteria, anonymous access, paused classes, independent-stage rejection, byte limits and PNG sanitisation. Existing frontend suites, type check, lint and build run separately. Real provider checks used a generated, non-personal algebra image and typed answer. Browser typed feedback and privacy controls were exercised. Automated browser file selection was blocked by the Chrome extension's file-URL setting; full manual photo selection remains to verify, including real handwriting, diagrams, chemical structures, low light and rotated pages. No OCR accuracy benchmark or marking agreement study has been completed.
