# Release and privacy gate

## Fixed in this branch

- Historical SQLite account/chat data and Chroma binaries are removed from the current tracked tree. Local originals are preserved and ignored. CI rejects tracked runtime databases, indexes and `.env` files without opening their contents.
- Tutor retrieval is off unless an administrator explicitly sets `STEMMATE_VECTORSTORE_DIR` to an independently reviewed, tagged index. There is no fallback to the legacy index. Do not set this variable to the preserved legacy folder.
- Production startup rejects non-HTTPS/wildcard/path origins, relative private DB paths, short teacher invitations, unacknowledged single-worker operation and unreviewed AI-provider use. Keep exactly one instance/worker with the private persistent disk. The acknowledgement cannot detect a hosting misconfiguration by itself.
- Production frontend build requires an exact HTTPS API origin. Render static headers and API headers reduce framing/content-sniffing/referrer leakage; API responses are not cached. Render API access logging is disabled. Hosting/proxy/provider logging remains the operator’s responsibility.
- Validation errors do not echo passwords, images or learner work. All request bodies are bounded (work 2.85 MB, quiz 30 KB, others 256 KB).
- AI reservations are atomic, capped globally and by account, with Retry-After. Defaults: 60/hour shared, 12/hour/account. Failed attempts count. A generated lesson uses one reservation; a three-question quiz usually uses four. Internal provider retry may make more than one external request, so these are application budgets, not exact provider billing/token limits. Restarts reset in-memory budgets and temporary sessions. Do not scale horizontally without shared session/limit storage.
- Expired project submissions and sign-ins are purged at startup and every minute while running. Existing explicit project opt-in/withdrawal, expiry checks, class authorization and revision privacy remain. Deletion is logical SQLite deletion, not guaranteed physical erasure from disk/backups.

## Operator actions before real learner data

1. Resolve historical exposure: old commits, upstream repository, forks, caches and previous downloads may still contain the removed databases/index. Do not represent this PR as erasing Git history. A repository administrator must decide whether to restrict access and coordinate a history rewrite/removal with affected collaborators and GitHub. Assess the records privately; rotate any affected credentials. No secrets or record contents should be pasted into issues. No history rewrite or force-push is performed by this PR.
2. Review school permission, provider terms/data processing and research consent separately. Select data location and provider controls with the school. Groq documents retention exceptions and optional Zero Data Retention: https://console.groq.com/docs/your-data . This app cannot verify your organisation’s setting. Set `STEMMATE_PROVIDER_REVIEWED=1` only after that review, when enabling a production API key. Without a provider key, original starters remain available.
3. Configure HTTPS frontend/API domains and exact `STEMMATE_ORIGINS`, private persistent `STEMMATE_ACCOUNTS_DB`, private API key, teacher invitation, `STEMMATE_ENV=production`, and `STEMMATE_SINGLE_WORKER_ACK=1`. Never set secrets in VITE variables. Leave auto-deploy off until an authorised deployment. See https://render.com/docs/blueprint-spec and https://render.com/docs/static-site-headers . This PR does not provision services or incur hosting costs.
4. Back up the private DB to access-controlled encrypted storage, perform a restore rehearsal on an isolated copy, and set a backup expiry/deletion schedule. A database backup contains password hashes, projects and feedback. Never put it in the public site or repository. Stop the test instance after a restore drill and delete its private copies according to policy. Backup retention is a school/host setting, not automatically controlled by app withdrawal.
5. Verify provider RPM/token/day allowance and paid budget. Increase application limits only after measuring a representative supervised class. The concurrent reservation test uses fake calls; it is not a live class load/performance test. Provider limits: https://console.groq.com/docs/rate-limits . Start with a small supervised group and stagger AI quiz generation; starter practice needs no provider call.
6. Complete teacher content/curriculum review and learner device, screen-reader, voice and handwriting trials. Neither passing tests nor activity completion proves accessibility conformance, learning gains or official assessment accuracy.

## Local administrator account operations

Run these only on the private server as its authorised operator, after verifying the requester’s identity through the school’s approved process. Do not accept a username alone as proof of identity. The tool loads the ignored server environment; deployment environment variables take precedence. Dry run is the default.

```
python server/manage_private_data.py inspect learner_alias
python server/manage_private_data.py reset-password learner_alias
python server/manage_private_data.py reset-password learner_alias --apply
python server/manage_private_data.py delete-learner learner_alias
python server/manage_private_data.py delete-learner learner_alias --apply
python server/manage_private_data.py backup /private-backups/pilot.sqlite3 --apply
```

Account mutations require typing the exact alias. Passwords are entered privately, never printed or passed as command-line arguments. Reset revokes all sign-ins. Learner deletion removes their submissions/feedback, enrolments, sign-ins and account in one transaction. Anonymous class activity counts cannot be linked back and remain. It does not erase backups, browser copies, exports, provider records or historical Git data. Teacher deletion is refused: ownership, class retention and transfer require a separate administrator review. Do not use the tool against the preview demo accounts during testing. Tests exercise disposable databases only.

## Acceptance evidence and limits

Automated coverage includes production configuration rejection, explicit retrieval opt-in, non-echoing validation, body bounds, per-account/global/concurrent reservations, session cleanup, private backup, password reset/session revocation and learner deletion/teacher protection. Existing curriculum, learning, project consent/access/retention and frontend suites also run. Production DNS/TLS, Render headers, encrypted storage, real provider data controls, historical data removal and live classroom capacity cannot be certified from the local preview. These remain explicit rollout gates, not hidden assumptions.
