# Guardian learning and optional research

Feature branch based on main 9c67a3d with the separate guided-question correction included as its first commit. No merge or production deployment is authorised. Main was checked against origin before implementation.

## Implemented scope

Guardian registration is a distinct role, never a teacher privilege. Learners issue a random, single-use pairing invitation lasting 15 minutes. The guardian claims it; the learner confirms the guardian alias. An operator must separately verify the relationship using the approved evidence process. Neither knowing a username nor possessing a code proves legal guardianship. Multiple guardians are supported, up to three pending/active links per learner. Both parties can revoke a link.

Home learning needs no school/class account. Verified guardians can suggest one curriculum topic per linked learner. Learners open the suggestion in their own guided workspace. Guardians also have independent practice under their own identity; it is not attributed to the child. The interface offers reasoning-support prompts and marks declared practice as together, independent or unknown. These declarations are self-report, not supervised assessments or mastery scores.

The learner can separately allow future home activity counts for each verified guardian link. Sharing is initially off and never exposes chats, written answers, uploads, research feedback or school activity. Turning sharing off deletes that link's stored counts. Removing a link deletes its suggestions/counts and stops that relationship's research permission, without deleting the learner's work. School access rules and independent-check gates remain unchanged. Home settings cannot alter a class policy.

Shared devices retain separate accounts. Sign out before switching identities; app auth is memory-only and sign-out clears optional drafts. Family panels unmount when the account changes. This is not a managed child-profile switcher; passwords must not be shared.

## Research is disabled by default

Without a complete, active operator-supplied configuration, no research usage events or feedback are stored. Configuration is not an ethics approval; an administrator must verify institutional approval, NCRST/education permissions as applicable, recruitment, provider disclosures and the data-management plan before activation.

Use the versioned consent pack as a design draft, finalised through the responsible institutions. The current implementation supports invited learner accounts and invited adult guardian supporters only. It conservatively requires verified guardian permission and learner assent for all learner accounts. Adult learners and teacher research participants need a separately reviewed route; do not misrepresent them as minors or activate collection for them through a guardian workaround.

Learner assent, guardian permission, guardian participation and optional feedback are separate choices. Guardians can permit child participation without enrolling themselves. A guardian withdrawing their own participation does not withdraw the child's permission; the latter has a separate control that works even when the study is disabled. Removing the family link withdraws that relationship's permission. Multiple-guardian disputes need operator handling; the system accepts one active verified guardian permission, so researchers must settle conflicts before collection.

Research records contain no full text, uploads, audio/video, names, IP addresses, auth/learning tokens or family-linked exports. Two optional 1–5 ratings cover ease of use and helpfulness, replacing earlier ratings when resubmitted. Session codes are random and unrelated to authentication tokens; account IDs remain inside the private database, so internal records are pseudonymous, not anonymous.

Records are version-bound. A changed material version requires renewed choices and guardian permission; old-version data do not appear in current exports. Consent decisions retain the displayed configuration snapshot, choices and timestamp under the configured retention period. Events, surveys, choices, permission records and decision history expire; startup and the existing minute cleanup loop purge expired rows. Relationship verification records remain while the relationship is active and are deleted on unlinking. Study scope is limited to the configured participant-ID roster; public account registration does not enrol someone in the study.

A live-data withdrawal stops new collection and deletes applicable research events and feedback. Consent decisions remain until their documented retention expires. Previously downloaded exports, publications, backups and any external datasets require the researcher's approved manual deletion/exclusion process. SQLite deletion is logical deletion; secure backup rotation, encrypted storage and physical-media disposal are operator responsibilities. Do not promise immediate physical erasure of every copy. Existing server/provider security logs are operational, not exported as research data.

The export endpoint is restricted to operator-configured researcher account IDs. It returns grouped event totals and grouped ratings only, suppressing cells with fewer than five contributing accounts. It does not offer individual, family-paired or chat exports. Repeated aggregate exports still require controlled researcher access; this is threshold suppression, not a formal anonymity guarantee.

## Operator setup

Back up the private accounts DB before preview testing. The automatic account-table migration retains account IDs, password hashes and foreign-key targets while widening the role constraint. Test the migration on a copy of the deployment database before rollout. Single-worker deployment remains required by the existing learning-store design.

After completing the approved relationship-verification process, an authorised server operator runs:

```sh
python server/manage_family.py LINK_ID --reference NON_IDENTIFYING_EVIDENCE_REFERENCE
```

Keep supporting evidence in the institution's approved system, not in the reference string or repository. There is deliberately no browser endpoint for self-verification. Revocation is through the family UI/API. In disputed-access cases remove the link until the claim is resolved.

`STEMMATE_RESEARCH_CONFIG` points to a private JSON file outside the repository. Required keys:

- enabled: true only after the operator review
- study_id, version, title, institution, approval_reference
- information: the complete approved participant information
- contact and independent_contact
- provider_notice and withdrawal_notice: real providers, processing countries, retention, access, backups and withdrawal limits
- starts and ends: Unix seconds defining the authorised collection window
- retention_days: the approved lifetime of records and consent decisions
- researcher_ids: explicitly authorised research-export account IDs
- participant_ids: individually invited, eligibility-reviewed learner and guardian account IDs

An incomplete/invalid file or a date outside the configured window disables research. Keep the same version only for non-material corrections; changes in purpose, data, providers or permission scope need ethics review and version renewal. Keep separate approval/version evidence. Do not commit real configs, participant rosters, private DBs or evidence files.

## API surface

- POST /family/invitation — learner issues code
- POST /family/claim — guardian claims code, no access yet
- GET /family — own relationships only
- PUT /family/{id} — learner confirms and chooses progress visibility
- DELETE /family/{id} — either party revokes
- POST /family/{id}/practice — verified guardian suggests curriculum topic
- GET /family/{id}/practice and /progress — verified linked parties only
- GET /research — current public information and caller's choices
- PUT /research/choice — caller's versioned assent/adult choice and optional survey
- PUT /research/permission/{id} — verified guardian's child permission
- DELETE /research/permission/{id} — guardian withdrawal even if study disabled
- DELETE /research — caller withdraws their own participation
- POST /research/feedback — consent-gated bounded ratings
- GET /research/export — allowlisted researchers, thresholded aggregates

Research is recorded for guided learning starts/stage/support actions only. It does not silently extend to quizzes, attachments, direct-only explanations, home-topic suggestions or all app navigation. Guardian research currently captures their own guided-practice events and optional ratings, not a diary of support given to the child. No historical backfill occurs. Progressive-hint limits and teacher activity-count opt-in are separate features.

## Validation and release limits

Automated checks exercise pending/verified access, ownership, one-use codes, topic suggestions, local-work preservation, role isolation, disabled research, permission and assent gates, independent adult/child choices, version changes, feedback, live withdrawal and account-table migration. Frontend interaction tests check unchecked consent, disabled collection, current-version acknowledgement and withdrawal when the study is disabled. Existing guided learning, project, attachment, privacy and curriculum regressions are included in the full suite.

Required before any rollout: real deployment DB migration rehearsal, stakeholder usability/accessibility checks, shared-device/mobile browser verification, legal/ethics review, review of verification procedures, actual provider contracts and retention, backups/deletion/export handling and incident response. No production collection or rollout was performed during implementation.

## Separate future requirement

A tester proposed past-paper-based practice and predicting next year's paper. Record this as syllabus-grounded past-paper analysis and clearly labelled unofficial mock practice. Do not promise prediction of an actual future exam or advise learners to skip syllabus topics based on past frequency. Source permissions, marking guidance and question/content review must be addressed in that separate feature. It is not implemented in this branch.
