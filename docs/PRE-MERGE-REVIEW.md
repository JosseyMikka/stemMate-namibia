# Pre-merge review — 18 October 2026

## Verdict

Keep this as a review/test build. Code checks pass, but real learner rollout remains gated by unresolved historical data exposure and school/provider/hosting review. Do not treat passing checks or this PR as proof of learning gains or verified curriculum alignment.

## Issues fixed during this review

- Generated learning plans now strip surrounding whitespace, reject blank required text and unexpected fields, and reject challenge/application/independent questions that match after case and whitespace normalization. Four regression tests cover valid plans, empty fields, malformed hints, duplicate checks and unexpected model fields. This is structural validation: paraphrased duplicates, factual errors, answer leakage and genuine transfer still require content review.
- Shared tutor instructions explicitly require clarification of ambiguous/missing information rather than invented values; created practice problems must identify themselves as new examples. This is guidance to the model, not a guarantee or a comprehensive adversarial prompt evaluation.
- A removed/stale dynamically loaded display file reproduced a blank chat in an existing preview tab. Added display boundaries around chat formatting, quiz, attachments, visual activities and the PDF reader. A failed math display now shows escaped plain text and retains the main chat composer. Optional panel failures give guidance; quiz loading failure offers Back to chat. These boundaries do not promise recovery of a crashed child panel's internal notes.

## Checks run now

- 63 backend tests pass (previous 59 plus four tutor validation tests).
- Ten frontend suites pass; TypeScript/build and lint pass; desktop and Wi-Fi builds refreshed.
- Tracked-private-file guard and diff whitespace check pass.
- Browser: vague help question requests clarification; complete authored Mathematics learner path through editable uncertainty, progressive hint, explanation, model comparison, application, independent attempt and final comparison. Earlier help and notes hidden during independent check; no mastery/automatic marking claim.
- Controlled missing-file browser check: temporarily moved the generated math module, verified plain-text question plus editable draft and enabled Send, then restored the file. All temporary network/cache overrides reset. Normal rendering and full journey verified after refresh. This was a preview-only failure experiment, not a production deployment.
- Restarted loopback API to load backend fixes. Same LAN preview remains on port 5174 with API/key on Mac.

## Important distinctions and remaining gates

1. Historical SQLite/Chroma data remains in old Git commits/upstream/fork network/caches/downloads. Current tree guard does not erase it. The prepared rewrite is stale and has NOT been published; it needs refreshed preparation and separate approval for guarded force-push plus administrator/upstream/GitHub coordination.
2. Confirm school permission, AI provider processing/retention controls, consent and research protocol before real learner data. Optional draft copies are unencrypted, tab/origin scoped and default off; sign-out is not secure erasure of other tabs, backups or provider records.
3. Production HTTPS, private disk, encrypted backups/restore, logs, account administration and capacity/budget checks remain operator tasks. In-memory sessions/AI limits require one worker. No production hosting was configured or certified in this review.
4. Teachers must review content across subjects/qualifications. Starter coverage and visuals are bounded; AI general support is not verified syllabus alignment. Past papers are official-resource links and learner attachments, not a searchable/automatically authenticated exam library.
5. Guided chat compares against a model explanation; it does not read or mark the learner's prose. Quiz and confirmed attached work use separate AI formative feedback. Independent practice hides support within the current activity, not across other tabs/devices; it is not secure exam proctoring.
6. Physical iPhone Safari keyboard/rotation, VoiceOver and representative learner/teacher trials still needed. This review used desktop browser controls; prior responsive checks are viewport approximations. No comprehensive accessibility certification, live-class load test, fresh all-subject AI matrix or formal prompt-injection benchmark is claimed.

Nothing merged, publicly deployed or history-rewritten.
