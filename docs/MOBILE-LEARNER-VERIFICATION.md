# Mobile learner journey verification

## Verified remotely

Chrome used the same-origin Wi-Fi phone preview and real API, at 390×360 for reduced visible space. This is not an iPhone/Safari keyboard test. A live AI question (“How do I solve 2x + 3 = 11?”) completed attempt → editable uncertainty → three hints → multiline learner reasoning → model comparison → skipped optional reflection → application → independent check → final comparison.

Typing used keyboard input, including Enter as a newline rather than an accidental submit. The textarea computed font was 16px and the mobile composer remained in document flow, not sticky. Hints and keyboard activation of More options preserved the multiline draft. Submission remained reachable through scrolling/clicks with reduced height. This does not establish actual virtual-keyboard visibility on Safari.

During the independent check, hints, direct explanations, attachment, quiz and visual controls were disabled; earlier notes and the uncertainty shortcut were absent. The learner’s answer was submitted and the final comparison was accessible. Mathematical solutions x=4, y=5 and z=4 were checked against the generated questions; this is comparison to worked reasoning, not personalised grading.

## Issue fixed

A generated bare display equation used a LaTeX row break with optional spacing, showing a stray spacing marker. Bare multiline display maths is now wrapped in an alignment environment; existing explicit environments are preserved. Alternate display delimiter recognition also avoids mistaking the second slash of a row break for an opening delimiter. Regression tests cover dollar and bracket delimiters, no visible spacing marker, accessible math and existing aligned equations. Code snippets and existing content-safety constraints remain protected.

After rebuilding desktop and Wi-Fi previews, a complete authored-starter journey was repeated at 320×360, through independent submission and final comparison. Changing to 667×300 retained the independent draft and allowed submission. No horizontal document overflow was measured (305/305px portrait, 652/652px landscape client/scroll widths). Nine frontend suites, build/typecheck and lint passed.

## Still requires the actual iPhone

Use the demo account and fictional work on the temporary trusted-Wi-Fi HTTP link. Copy anything you want to keep before refreshing into the updated build.

- In Safari, open the software keyboard; check that the caret, answer box and Send/Compare button can be reached by scrolling and that the browser toolbar/home indicator does not cover them.
- Test predictive text/autocorrect, selection, multiline entry, rotation while typing and keyboard dismissal without losing the draft.
- Check dynamic browser text size/zoom and VoiceOver focus/announcements. Chrome viewport results do not certify these.
- Voice-input availability over HTTP is limited; a separately approved HTTPS environment is needed for broader device testing. Do not bypass certificate warnings or install a trust profile for this test.

No actual iPhone was remotely controlled. No public deployment, merge or history rewrite occurred. The previously prepared history rewrite is stale after these commits and must be regenerated before any authorised publication.
