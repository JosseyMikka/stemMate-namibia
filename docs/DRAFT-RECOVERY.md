# Optional chat draft recovery

## Learner experience

Device privacy (or More options → Topic and privacy) offers “Remember unfinished chat text in this tab for 30 minutes”. It is OFF by default. Enabling it saves a recovery copy of the current unsent question or thinking text in this origin’s sessionStorage. Up to four latest contexts are retained, with subject, grade, qualification, exam year, stage and the current question. Editing refreshes that draft’s 30-minute expiry; revealing hints does not extend it.

After refresh, authentication remains memory-only: sign in again to the same account, open Saved chat drafts in this tab, and select/copy the text. It is a read-only recovery copy, not an automatically resumed lesson. Current server session and AI-plan tokens are never persisted. Activity answers cannot be inserted into the wrong stage or silently submitted. Saved notes are hidden during the active independent check. Submitting/clearing the current text removes its saved copy; starting another context can preserve a different context’s unsent draft.

For shared devices, leave recovery off. Sign out clears local authentication and recovery immediately, even when a logout request fails or hangs. Server logout is best effort while offline; the old server sign-in expires normally. Clear this device and turning recovery off also remove this tab’s recovery copies. Signing into a different account removes the former account’s copies before rendering its workspace. There is no automatic sign-in.

## Privacy boundaries

This is unencrypted browser storage, not a secure vault. Someone with access to the unlocked device, browser developer tools, extensions or restored browser data may read it. Same-account checks protect normal app use, not a hostile browser user. The school should keep recovery off on shared devices unless its policy permits local copies. Do not include personal details.

sessionStorage normally ends with its tab, but browsers may restore/duplicate tabs. Sign-out clears this tab/origin, not other tabs, devices, other preview origins or browser backups; close all STEMMate tabs and follow shared-device clearing policy. Expiry is enforced on read and while the app runs (including wake/visibility checks); suspended/closed browsers cannot be guaranteed to physically erase bytes at exactly 30 minutes. No secure-erasure or encryption claim is made.

Only unfinished main-chat text and minimal context are included. Passwords, authentication/learning tokens, model solutions, feedback, written history, uploads, photos, PDF content, quiz answers, project notebooks and visual notes are not persisted by this feature. Quiz/project/attachment recovery remains outside this change; use their existing copy/export controls. Draft recovery makes no new server/AI request and is not teacher reporting or research data.

If storage is unavailable/quota-limited, the app fails without crashing and explains that a separate copy is needed. A best-effort unsaved-text browser warning is also registered; mobile browsers may not show it, so it is not the recovery mechanism. Refreshing fully offline does not make the app/authentication available offline: reconnect and sign in before reviewing the saved copy. Offline typing in an already-loaded page is preserved, and requests are never silently queued or resent.

## Verification

- Ten frontend suites, including opt-in/off defaults, owner isolation, expiry boundary, four-context cap, remove/discard, allowlisted fields, malformed storage and blocked storage tests.
- Browser: opted-in question survives refresh; sign-in page shows no draft text; same account recovers text; another account sees no recovery card; cross-subject drafts retain context; an independent draft survives refresh without restoring any live lesson/token; recovery notes are hidden during an active independent check.
- Network emulation: a failed send preserves the draft and gives reconnect guidance; offline sign-out immediately returns to sign-in and no saved copies remain after reconnect/relogin. Browser network emulation was restored to online.
- 320px viewport: no document overflow in the recovery view. Desktop viewport restored. These are Chrome checks, not iPhone/Safari certification.

Desktop and temporary Wi-Fi previews are rebuilt. No merge, public deployment or history rewrite. Existing historical-data and school/provider rollout gates remain.
