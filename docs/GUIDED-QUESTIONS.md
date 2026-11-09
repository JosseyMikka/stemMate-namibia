# Guided lesson questions correction

Base: main commit `9c67a3d77107fdc99ee718344297cc9c627032cf`, examined 28 October 2026.
PR #2 remains a separate, open change. This patch is based on main and does not establish the production revision.

## Learner interaction

- **Send my thinking** continues the displayed exercise. Written attempts remain local; `/learning/session` receives the existing action and attempted flag. This remains a model comparison, not AI assessment of the attempt.
- **Ask a new question** opens a separate guided workspace. Type the question there and send it. The actual question is transmitted to `/learning`, which creates its normal curriculum-scoped plan, starting at attempt with no released hints. There is no punctuation-based or AI-based guess about intent.
- **Back to saved lesson** restores the original mounted workspace. Its token, stage, hints, earlier thinking, unfinished writing, attachment workspace and visual workspace are retained. **Open separate question** returns to the other workspace, including unfinished writing there.
- Failed generation leaves both the new question and the saved lesson intact. No automatic retry or deletion is introduced.

Keeping the existing Chat component mounted avoids copying a subset of its state and losing attachment or visual work. The hidden workspace has blocked actions and dictation stops on switching. Each level uses a separate opt-in draft key without storing tokens. Nesting is capped at four mounted workspaces, matching the existing four-draft recovery cap; at the deepest level return to a saved workspace to ask another question.

## Server and privacy

New-question `/learning` and `/explain` requests include the saved lesson token in the existing `X-Learning-Token` header. The server checks ownership, expiry, classroom/curriculum consistency and the independent-check restriction, before AI generation and again before releasing results. Existing pause, membership, budget, subject-safety and validation rules still apply. The parent session is not changed or extended. Existing clients without a parent token retain their existing start behavior.

New questions use the existing AI disclosure and provider flow. Exercise answers are not newly sent to AI, stored in the database or added to teacher reports. Activity-count consent is separately selected in the new workspace; it is not silently inherited. The one-hour server session expiry and optional tab-recovery limits remain. Switching preserves work in the current page; it does not promise complete session restoration after refresh.

A new question cannot open during the current independent check. Returning to earlier support is also blocked while the separate workspace is in its independent check. Existing explicit New chat reset behavior remains. This is formative practice, not a supervised assessment or a new cross-tab enforcement mechanism.

## Validation

- 66 backend unittest tests passed, including three new endpoint regressions for exact question forwarding, separate session creation, original state preservation, ownership, pause, context mismatch, independent checks, expiry, AI failure and policy changes during generation.
- All 11 frontend suites passed. New JSDOM interaction coverage exercises real Chat form/button handlers: local attempt privacy, actual new-question request body and parent header, failed-send retry, both unsent buffers, earlier notes/hints, saved token restoration, independent restrictions (including the return button) and teacher pause.
- TypeScript/production build, ESLint, private-file guard and whitespace checks passed.
- The sandbox blocks the tsx CLI's IPC socket, so frontend suites were executed using `TSX_TSCONFIG_PATH=tsconfig.app.json node --import tsx <test-file>` for every file in the package test script. CI can use the normal `pnpm test` command.

Reproduce after applying the patch:

```sh
python -m pip install -r server/requirements-test.txt
python -m unittest discover -s tests -v
cd stemmate-frontend
pnpm install --frozen-lockfile
pnpm test
pnpm build
pnpm lint
```

Real-provider answer quality, physical-device layout and screen-reader behavior still need manual verification. In a preview, begin an exercise, enter unfinished thinking, ask a separate curriculum question, return and verify the writing and hint count; repeat with a simulated outage and a teacher pause. No changes were pushed, merged or deployed.
